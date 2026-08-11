import path from 'path';
import fs from 'fs-extra';
import { generateText } from '../ai/gemini.service.js';

const FRAMEWORK_SIGNATURES = [
  { name: 'Next.js', deps: ['next'] },
  { name: 'React', deps: ['react', 'react-dom'] },
  { name: 'Vue', deps: ['vue'] },
  { name: 'Angular', deps: ['@angular/core'] },
  { name: 'Svelte', deps: ['svelte'] },
  { name: 'Express', deps: ['express'] },
  { name: 'NestJS', deps: ['@nestjs/core'] },
  { name: 'Fastify', deps: ['fastify'] }
];

const DATABASE_SIGNATURES = [
  { name: 'MongoDB', deps: ['mongoose'], odm: 'Mongoose' },
  { name: 'MongoDB', deps: ['mongodb'], odm: null },
  { name: 'PostgreSQL', deps: ['pg'], odm: null },
  { name: 'MySQL', deps: ['mysql2', 'mysql'], odm: null },
  { name: 'SQL (via Sequelize)', deps: ['sequelize'], odm: 'Sequelize' },
  { name: 'SQL (via Prisma)', deps: ['prisma', '@prisma/client'], odm: 'Prisma' }
];

const AUTH_SIGNATURES = ['jsonwebtoken', 'passport', 'next-auth', 'bcrypt', 'bcryptjs'];

const ROUTE_PATTERN = /\b(?:app|router)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;

function safeParseJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function collectPackageJsons(documents) {
  return documents
    .filter((d) => d.filename === 'package.json')
    .map((d) => ({ filepath: d.filepath, json: safeParseJson(d.content) }))
    .filter((entry) => entry.json !== null);
}

function detectFrameworks(allDepNames) {
  return FRAMEWORK_SIGNATURES.filter((sig) => sig.deps.some((dep) => allDepNames.has(dep))).map(
    (sig) => sig.name
  );
}

function detectDatabase(allDepNames) {
  const match = DATABASE_SIGNATURES.find((sig) => sig.deps.some((dep) => allDepNames.has(dep)));
  if (!match) return { type: null, odm: null };
  return { type: match.name, odm: match.odm };
}

function detectAuthentication(allDepNames, documents) {
  const depHit = AUTH_SIGNATURES.find((dep) => allDepNames.has(dep));
  const authFiles = documents
    .filter((d) => /auth|jwt/i.test(d.filepath))
    .map((d) => d.filepath);

  if (!depHit && authFiles.length === 0) {
    return { strategy: null, files: [] };
  }

  const strategy = allDepNames.has('jsonwebtoken')
    ? 'JWT'
    : allDepNames.has('passport')
      ? 'Passport'
      : allDepNames.has('next-auth')
        ? 'NextAuth'
        : depHit || 'Custom';

  return { strategy, files: authFiles };
}

async function detectPackageManager(workspacePath) {
  if (await fs.pathExists(path.join(workspacePath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fs.pathExists(path.join(workspacePath, 'yarn.lock'))) return 'yarn';
  if (await fs.pathExists(path.join(workspacePath, 'package-lock.json'))) return 'npm';
  return 'unknown';
}

function detectEntryFiles(documents, packageJsons) {
  const filepaths = new Set(documents.map((d) => d.filepath));
  const candidates = new Set();

  for (const { filepath, json } of packageJsons) {
    if (json.main) {
      candidates.add(path.join(path.dirname(filepath), json.main).split(path.sep).join('/'));
    }
  }

  const commonEntryNames = [
    'server.js',
    'index.js',
    'app.js',
    'src/index.js',
    'src/main.jsx',
    'src/main.tsx',
    'src/index.tsx'
  ];
  for (const doc of documents) {
    if (commonEntryNames.includes(doc.filepath)) candidates.add(doc.filepath);
  }

  return [...candidates].filter((c) => filepaths.has(c) || candidates.has(c));
}

function buildFolderStructure(documents) {
  // Condensed two-level tree: { "backend/controllers": 4, "frontend/src/pages": 7, ... }
  const counts = {};
  for (const doc of documents) {
    const segments = doc.filepath.split('/');
    const key = segments.length > 1 ? segments.slice(0, -1).join('/') : '.';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function extractRoutes(documents) {
  const routes = [];
  for (const doc of documents) {
    if (!['JavaScript', 'JavaScript (JSX)', 'TypeScript', 'TypeScript (TSX)'].includes(doc.language)) {
      continue;
    }
    let match;
    ROUTE_PATTERN.lastIndex = 0;
    while ((match = ROUTE_PATTERN.exec(doc.content)) !== null) {
      routes.push({ method: match[1].toUpperCase(), path: match[2], file: doc.filepath });
    }
  }
  return routes;
}

function extractControllers(documents) {
  return documents.filter((d) => /controller/i.test(d.filename)).map((d) => d.filepath);
}

function extractLanguages(documents) {
  return [...new Set(documents.map((d) => d.language).filter((l) => l && l !== 'Unknown'))];
}

async function buildNarrativeSummary(structured) {
  const prompt = `You are summarizing a software repository for a developer who has never seen it.
Given this structured analysis, write exactly 3 concise sentences describing what the
project is, what stack it uses, and how it's organized. No preamble, no markdown, just
the 3 sentences.

Frameworks: ${structured.frameworks.join(', ') || 'none detected'}
Languages: ${structured.languages.join(', ') || 'none detected'}
Database: ${structured.database.type || 'none detected'}
Authentication: ${structured.authentication.strategy || 'none detected'}
Route count: ${structured.routes.length}
Controller files: ${structured.controllers.length}
File count: ${structured.fileCount}`;

  const generated = await generateText(prompt, { temperature: 0.3 });
  if (generated) return generated;

  // Deterministic fallback if Gemini isn't configured or the call fails — the
  // analysis itself never depends on the LLM being available.
  const parts = [
    `This is a ${structured.frameworks.join('/') || 'JavaScript'} project with ${structured.fileCount} indexed files.`,
    structured.database.type
      ? `It uses ${structured.database.type}${structured.database.odm ? ` via ${structured.database.odm}` : ''} for data storage.`
      : 'No database dependency was detected.',
    structured.authentication.strategy
      ? `Authentication is handled with ${structured.authentication.strategy}.`
      : 'No authentication mechanism was detected.'
  ];
  return parts.join(' ');
}

/**
 * Runs once per project, after parsing and before chunking (see ARCHITECTURE.md
 * §3). Signature-based detection first (package.json, lockfiles, filename/route
 * patterns) — deterministic and fast — with Gemini used only for the final prose
 * `summary` field.
 */
export async function analyzeRepository(documents, workspacePath) {
  const packageJsons = collectPackageJsons(documents);

  const allDepNames = new Set();
  const runtimeDeps = new Set();
  const devDeps = new Set();
  for (const { json } of packageJsons) {
    for (const dep of Object.keys(json.dependencies || {})) {
      allDepNames.add(dep);
      runtimeDeps.add(dep);
    }
    for (const dep of Object.keys(json.devDependencies || {})) {
      allDepNames.add(dep);
      devDeps.add(dep);
    }
  }

  const structured = {
    frameworks: detectFrameworks(allDepNames),
    languages: extractLanguages(documents),
    packageManager: await detectPackageManager(workspacePath),
    entryFiles: detectEntryFiles(documents, packageJsons),
    folderStructure: buildFolderStructure(documents),
    dependencies: {
      runtime: [...runtimeDeps],
      dev: [...devDeps]
    },
    routes: extractRoutes(documents),
    controllers: extractControllers(documents),
    authentication: detectAuthentication(allDepNames, documents),
    database: detectDatabase(allDepNames),
    fileCount: documents.length
  };

  structured.summary = await buildNarrativeSummary(structured);

  // fileCount is tracked on Project directly (not part of RepositorySummary
  // schema) — strip it back out before returning.
  const { fileCount, ...repositorySummary } = structured; // eslint-disable-line no-unused-vars
  return repositorySummary;
}

export default analyzeRepository;
