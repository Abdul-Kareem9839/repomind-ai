import { getChromaClient } from "../../config/chroma.js";
import { extractProjectIdFromCollectionName } from "../../utils/collectionName.js";
import { getChunksByIds } from "../rag/fileChunk.service.js";
import { createLogger } from "../../utils/logger.js";

const log = createLogger("vector:chroma");

// Chroma metadata values must be string/number/boolean — arrays (imports,
// exports) get flattened to comma-joined strings, null becomes an empty string.
function sanitizeMetadata(metadata) {
  const clean = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      clean[key] = value.join(",");
    } else if (value === null || value === undefined) {
      clean[key] = "";
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Satisfies chromadb's IEmbeddingFunction interface without doing anything.
 * Every call site in this app (upsertChunks/queryCollection below) always
 * passes precomputed local embeddings explicitly, so `generate()` should
 * never actually run.
 *
 * This exists to fix "Cannot instantiate a collection with the
 * DefaultEmbeddingFunction. Please install @chroma-core/default-embed...":
 * that warning fires because getOrCreateCollection() was being called with no
 * embeddingFunction at all, so the chromadb client tried to lazily construct
 * its own DefaultEmbeddingFunction (which needs the optional
 * @chroma-core/default-embed package we deliberately don't install) as soon
 * as anything needed one. Passing a real — if inert — embeddingFunction here
 * stops that lazy instantiation without installing anything or changing
 * where our embeddings actually come from.
 */
class NoopEmbeddingFunction {
  name = "repomind-precomputed-embeddings";

  async generate() {
    throw new Error(
      "NoopEmbeddingFunction.generate() was invoked — every call site in this " +
        "app must pass precomputed embeddings explicitly (see services/ai/embeddings.service.js) " +
        "instead of relying on Chroma to generate them.",
    );
  }
}

const noopEmbeddingFunction = new NoopEmbeddingFunction();

export async function getOrCreateCollection(collectionName) {
  const client = getChromaClient();
  return client.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: noopEmbeddingFunction,
  });
}

/**
 * Resolves Chroma-returned chunk ids back to their full content in MongoDB
 * (see services/rag/fileChunk.service.js). Returns a Map so callers can look
 * up by id in whatever order Chroma returned them.
 */
async function resolveContent(collectionName, ids) {
  const projectId = extractProjectIdFromCollectionName(collectionName);
  if (!projectId || ids.length === 0) return new Map();

  const chunks = await getChunksByIds(projectId, ids);
  return new Map(chunks.map((c) => [c.chunkId, c.content]));
}

/**
 * Upserts pre-embedded chunks. Each item: { id, content, embedding, metadata }.
 * `content` is intentionally NOT sent to Chroma — MongoDB is the source of
 * truth for full chunk content (see services/rag/fileChunk.service.js), and
 * Chroma Cloud's free tier enforces a small quota on the 'documents' field it
 * would otherwise occupy. Chroma only ever receives ids, embeddings, and
 * lightweight metadata.
 */
export async function upsertChunks(collectionName, items, batchSize = 100) {
  const collection = await getOrCreateCollection(collectionName);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await collection.upsert({
      ids: batch.map((item) => item.id),
      embeddings: batch.map((item) => item.embedding),
      metadatas: batch.map((item) => sanitizeMetadata(item.metadata)),
    });
  }
}

/**
 * Similarity search. `where` is an optional Chroma metadata filter, e.g.
 * { chunkType: 'repository_summary' }. Content is joined back in from
 * MongoDB by chunk id, so the returned shape is unchanged: { id, content,
 * metadata, score }.
 */
export async function queryCollection(
  collectionName,
  queryEmbedding,
  { topK = 8, where } = {},
) {
  const collection = await getOrCreateCollection(collectionName);

  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    ...(where ? { where } : {}),
  });

  const ids = result.ids?.[0] || [];
  const metadatas = result.metadatas?.[0] || [];
  const distances = result.distances?.[0] || [];

  const contentById = await resolveContent(collectionName, ids);

  return ids.map((id, idx) => ({
    id,
    content: contentById.get(id) ?? null,
    metadata: metadatas[idx],
    // Chroma returns a distance (lower = closer); expose a similarity score
    // (higher = closer) since that reads more naturally everywhere else.
    score: distances[idx] === undefined ? null : 1 - distances[idx],
  }));
}

export async function deleteCollection(collectionName) {
  const client = getChromaClient();
  try {
    await client.deleteCollection({ name: collectionName });
  } catch (err) {
    // Deleting a collection that never got created (e.g. ingestion failed before
    // step 10 ran, or this is the first-ever index for the project) shouldn't
    // block project deletion or re-indexing.
    log.warn(`Could not delete collection ${collectionName}`, {
      message: err.message,
    });
  }
}

/**
 * Metadata-only lookup (no similarity search) — used to fetch the single
 * repository_summary document directly by its known chunkType, without paying
 * for an embedding + vector search, and to follow `imports` metadata one hop
 * (see services/langgraph/nodes/codeFlowRetrieval.node.js). Content is joined
 * back in from MongoDB the same way queryCollection does.
 */
export async function getByMetadata(collectionName, where, limit = 1) {
  const collection = await getOrCreateCollection(collectionName);
  const result = await collection.get({ where, limit });

  const ids = result.ids || [];
  const metadatas = result.metadatas || [];

  const contentById = await resolveContent(collectionName, ids);

  return ids.map((id, idx) => ({
    id,
    content: contentById.get(id) ?? null,
    metadata: metadatas[idx],
    score: null,
  }));
}

export default {
  getOrCreateCollection,
  upsertChunks,
  queryCollection,
  deleteCollection,
  getByMetadata,
};
