const JS_LIKE_LANGUAGES = new Set([
  'JavaScript',
  'JavaScript (JSX)',
  'TypeScript',
  'TypeScript (TSX)'
]);

// Matches the *start line* of a top-level function or class declaration in
// reasonably-formatted JS/TS/JSX/TSX. Deliberately conservative: it only looks
// for unindented (module-level) declarations, since those are the boundaries
// that actually mean something for retrieval — nested helpers stay with their
// parent chunk rather than being split out on their own.
const SYMBOL_START_PATTERN =
  /^(export\s+(default\s+)?)?(async\s+)?(function\s+([A-Za-z0-9_$]+)|class\s+([A-Za-z0-9_$]+))/;

const IMPORT_PATTERN = /^import\s+.+?['"]([^'"]+)['"]\s*;?\s*$/;
const REQUIRE_PATTERN = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
const EXPORT_NAME_PATTERN =
  /^export\s+(default\s+)?(?:(?:async\s+)?function|class|const|let|var)\s+([A-Za-z0-9_$]+)/;
const MODULE_EXPORTS_PATTERN = /module\.exports(?:\.([A-Za-z0-9_$]+))?\s*=/;

// Safety net, not the primary strategy: a single symbol (or a whole small file)
// can still balloon past anything reasonable — e.g. a giant generated switch
// statement. Past this, we fall back to splitting on blank-line boundaries so we
// never hand the embedding model (or Gemini's context window) one enormous blob.
const MAX_CHUNK_CHARS = 6000;

function extractImports(content) {
  const imports = new Set();
  for (const line of content.split('\n')) {
    const m = line.match(IMPORT_PATTERN);
    if (m) imports.add(m[1]);
  }
  let reqMatch;
  REQUIRE_PATTERN.lastIndex = 0;
  while ((reqMatch = REQUIRE_PATTERN.exec(content)) !== null) {
    imports.add(reqMatch[1]);
  }
  return [...imports];
}

function extractExports(content) {
  const exportsFound = new Set();
  for (const line of content.split('\n')) {
    const named = line.match(EXPORT_NAME_PATTERN);
    if (named?.[2]) exportsFound.add(named[2]);
    const moduleExport = line.match(MODULE_EXPORTS_PATTERN);
    if (moduleExport) exportsFound.add(moduleExport[1] || 'default');
  }
  return [...exportsFound];
}

/**
 * Splits JS/TS source into { symbolName, type, content } blocks along top-level
 * function/class boundaries using brace counting to find each block's end.
 * Anything before the first symbol (imports, top-level consts, config objects)
 * becomes its own "module" block so it isn't lost.
 */
function splitBySymbol(content) {
  const lines = content.split('\n');
  const blocks = [];
  let current = { type: 'module', symbolName: null, lines: [] };
  let braceDepth = 0;
  let inSymbol = false;

  const flush = () => {
    if (current.lines.length > 0 && current.lines.some((l) => l.trim() !== '')) {
      blocks.push(current);
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const symbolMatch = !inSymbol ? trimmed.match(SYMBOL_START_PATTERN) : null;

    if (symbolMatch && braceDepth === 0) {
      flush();
      const name = symbolMatch[5] || symbolMatch[6] || null;
      const type = symbolMatch[0].includes('class') ? 'class' : 'function';
      current = { type, symbolName: name, lines: [line] };
      inSymbol = true;
    } else {
      current.lines.push(line);
    }

    braceDepth += (line.match(/{/g) || []).length;
    braceDepth -= (line.match(/}/g) || []).length;

    if (inSymbol && braceDepth <= 0 && /[{}]/.test(line)) {
      flush();
      current = { type: 'module', symbolName: null, lines: [] };
      inSymbol = false;
      braceDepth = 0;
    }
  }
  flush();

  return blocks.map((b) => ({ ...b, content: b.lines.join('\n').trim() })).filter((b) => b.content.length > 0);
}

/** Fallback splitter for any single block that's still too large — splits on
 * blank lines (paragraph-like boundaries) rather than a raw character count. */
function splitOversizedBlock(content) {
  if (content.length <= MAX_CHUNK_CHARS) return [content];

  const paragraphs = content.split(/\n\s*\n/);
  const parts = [];
  let buffer = '';
  for (const para of paragraphs) {
    if ((buffer + '\n\n' + para).length > MAX_CHUNK_CHARS && buffer) {
      parts.push(buffer.trim());
      buffer = para;
    } else {
      buffer = buffer ? `${buffer}\n\n${para}` : para;
    }
  }
  if (buffer.trim()) parts.push(buffer.trim());
  return parts;
}

/**
 * Chunks one parsed document into { id, content, metadata } pieces ready for
 * embedding. `doc` is the shape produced by services/parser/fileParser.service.js.
 */
export function chunkDocument(doc) {
  const isCode = JS_LIKE_LANGUAGES.has(doc.language);
  const imports = isCode ? extractImports(doc.content) : [];
  const exports_ = isCode ? extractExports(doc.content) : [];

  const baseMetadata = {
    filepath: doc.filepath,
    filename: doc.filename,
    language: doc.language,
    imports,
    exports: exports_
  };

  const blocks = isCode ? splitBySymbol(doc.content) : [{ type: 'file', symbolName: null, content: doc.content }];

  const chunks = [];
  let chunkIndex = 0;
  for (const block of blocks) {
    const pieces = splitOversizedBlock(block.content);
    for (const piece of pieces) {
      chunks.push({
        id: `${doc.filepath}::${chunkIndex}`,
        content: piece,
        metadata: {
          ...baseMetadata,
          chunkType: block.type,
          symbolName: block.symbolName,
          chunkIndex
        }
      });
      chunkIndex += 1;
    }
  }

  return chunks;
}

/** Chunks every document in a parsed repository. */
export function chunkRepository(documents) {
  return documents.flatMap((doc) => chunkDocument(doc));
}

export default { chunkDocument, chunkRepository };
