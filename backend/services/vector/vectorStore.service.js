import { getChromaClient } from '../../config/chroma.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('vector:chroma');

// Chroma metadata values must be string/number/boolean — arrays (imports,
// exports) get flattened to comma-joined strings, null becomes an empty string.
function sanitizeMetadata(metadata) {
  const clean = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      clean[key] = value.join(',');
    } else if (value === null || value === undefined) {
      clean[key] = '';
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export async function getOrCreateCollection(collectionName) {
  const client = getChromaClient();
  return client.getOrCreateCollection({ name: collectionName });
}

/**
 * Upserts pre-embedded chunks. Each item: { id, content, embedding, metadata }.
 * Batches writes so a large repository doesn't send one gigantic request.
 */
export async function upsertChunks(collectionName, items, batchSize = 100) {
  const collection = await getOrCreateCollection(collectionName);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await collection.upsert({
      ids: batch.map((item) => item.id),
      embeddings: batch.map((item) => item.embedding),
      documents: batch.map((item) => item.content),
      metadatas: batch.map((item) => sanitizeMetadata(item.metadata))
    });
  }
}

/**
 * Similarity search. `where` is an optional Chroma metadata filter, e.g.
 * { chunkType: 'repository_summary' }.
 */
export async function queryCollection(collectionName, queryEmbedding, { topK = 8, where } = {}) {
  const collection = await getOrCreateCollection(collectionName);

  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    ...(where ? { where } : {})
  });

  const ids = result.ids?.[0] || [];
  const documents = result.documents?.[0] || [];
  const metadatas = result.metadatas?.[0] || [];
  const distances = result.distances?.[0] || [];

  return ids.map((id, idx) => ({
    id,
    content: documents[idx],
    metadata: metadatas[idx],
    // Chroma returns a distance (lower = closer); expose a similarity score
    // (higher = closer) since that reads more naturally everywhere else.
    score: distances[idx] === undefined ? null : 1 - distances[idx]
  }));
}

export async function deleteCollection(collectionName) {
  const client = getChromaClient();
  try {
    await client.deleteCollection({ name: collectionName });
  } catch (err) {
    // Deleting a collection that never got created (e.g. ingestion failed before
    // step 10 ran) shouldn't block project deletion.
    log.warn(`Could not delete collection ${collectionName}`, { message: err.message });
  }
}

/**
 * Metadata-only lookup (no similarity search) — used to fetch the single
 * repository_summary document directly by its known chunkType, without paying
 * for an embedding + vector search.
 */
export async function getByMetadata(collectionName, where, limit = 1) {
  const collection = await getOrCreateCollection(collectionName);
  const result = await collection.get({ where, limit });

  const ids = result.ids || [];
  const documents = result.documents || [];
  const metadatas = result.metadatas || [];

  return ids.map((id, idx) => ({
    id,
    content: documents[idx],
    metadata: metadatas[idx],
    score: null
  }));
}

export default { getOrCreateCollection, upsertChunks, queryCollection, deleteCollection, getByMetadata };
