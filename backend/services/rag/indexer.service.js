import { chunkRepository } from './chunker.service.js';
import { embedTexts } from '../ai/embeddings.service.js';
import { upsertChunks } from '../vector/vectorStore.service.js';
import { estimateTokensForTexts } from '../../utils/tokenEstimator.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('rag:indexer');
const REPOSITORY_SUMMARY_ID = '__repository_summary__';

function buildSummaryChunkContent(repositorySummary) {
  const {
    frameworks,
    languages,
    packageManager,
    entryFiles,
    dependencies,
    routes,
    controllers,
    authentication,
    database,
    summary
  } = repositorySummary;

  // A single dense, human-readable document — this is what architecture-type
  // questions retrieve first (see ARCHITECTURE.md §6), so it's written to be
  // useful on its own, not just a JSON dump.
  return [
    summary,
    `Frameworks: ${frameworks.join(', ') || 'none detected'}`,
    `Languages: ${languages.join(', ') || 'none detected'}`,
    `Package manager: ${packageManager}`,
    `Entry files: ${entryFiles.join(', ') || 'none detected'}`,
    `Runtime dependencies: ${dependencies.runtime.join(', ') || 'none'}`,
    `Dev dependencies: ${dependencies.dev.join(', ') || 'none'}`,
    `Database: ${database.type || 'none detected'}${database.odm ? ` (via ${database.odm})` : ''}`,
    `Authentication: ${authentication.strategy || 'none detected'}${
      authentication.files.length ? ` (${authentication.files.join(', ')})` : ''
    }`,
    `Controller files: ${controllers.join(', ') || 'none'}`,
    `Routes:\n${routes.map((r) => `  ${r.method} ${r.path} (${r.file})`).join('\n') || '  none detected'}`
  ].join('\n');
}

/**
 * Chunks + embeds + stores a whole parsed repository into its Chroma
 * collection, including one high-priority repository_summary document (see
 * ARCHITECTURE.md §3). This is the step that finally makes a project queryable
 * — callers should flip Project.status to 'ready' only after this resolves.
 */
export async function indexRepository({ collectionName, documents, repositorySummary }) {
  const codeChunks = chunkRepository(documents);

  const summaryItem = {
    id: REPOSITORY_SUMMARY_ID,
    content: buildSummaryChunkContent(repositorySummary),
    metadata: {
      filepath: REPOSITORY_SUMMARY_ID,
      filename: REPOSITORY_SUMMARY_ID,
      language: 'Summary',
      chunkType: 'repository_summary',
      symbolName: null,
      imports: [],
      exports: []
    }
  };

  const allItems = [summaryItem, ...codeChunks];

  const estimatedTokens = estimateTokensForTexts(allItems.map((item) => item.content));
  log.info(`Embedding ${allItems.length} chunks (~${estimatedTokens.toLocaleString()} tokens) for ${collectionName}`);

  const vectors = await embedTexts(allItems.map((item) => item.content));

  const itemsWithEmbeddings = allItems.map((item, idx) => ({ ...item, embedding: vectors[idx] }));

  await upsertChunks(collectionName, itemsWithEmbeddings);

  log.info(`Indexed ${allItems.length} chunks into ${collectionName}`);

  return { chunkCount: codeChunks.length, totalIndexed: allItems.length };
}

export default { indexRepository };
