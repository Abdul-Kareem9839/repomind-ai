import { FileChunk } from "../../models/FileChunk.model.js";
import { createLogger } from "../../utils/logger.js";

const log = createLogger("rag:fileChunk");

/**
 * Replaces every persisted chunk for a project in one go. Called once per
 * (re)index — see services/rag/indexer.service.js. Deleting the old set
 * before inserting the new one (rather than upserting over it) is what keeps
 * re-indexing idempotent: a repo that shrinks from 80 chunks to 60 doesn't
 * leave 20 orphaned FileChunk documents mixed in with the new index.
 *
 * `items` are the same { id, content, metadata } objects chunker.service.js /
 * indexer.service.js already build for Chroma — the embedding, if present, is
 * intentionally not persisted here (Chroma remains the vector store).
 */
export async function replaceProjectChunks(projectId, items) {
  const docs = items.map((item) => ({
    project: projectId,
    chunkId: item.id,
    content: item.content,
    filepath: item.metadata?.filepath,
    filename: item.metadata?.filename,
    language: item.metadata?.language,
    chunkType: item.metadata?.chunkType,
    symbolName: item.metadata?.symbolName ?? null,
    chunkIndex: item.metadata?.chunkIndex,
    imports: item.metadata?.imports || [],
    exports: item.metadata?.exports || [],
  }));

  await FileChunk.deleteMany({ project: projectId });
  if (docs.length > 0) {
    await FileChunk.insertMany(docs, { ordered: false });
  }

  log.info(`Persisted ${docs.length} FileChunk documents`, {
    projectId: projectId?.toString?.() ?? projectId,
  });
}

/** Fetches full chunk content for a set of stable chunk ids — used to turn a
 * Chroma similarity-search result (ids + metadata + score, no content) back
 * into the { id, content, metadata, score } shape the rest of the app expects. */
export async function getChunksByIds(projectId, chunkIds) {
  if (!projectId || !chunkIds || chunkIds.length === 0) return [];
  return FileChunk.find({ project: projectId, chunkId: { $in: chunkIds } }).lean();
}

export async function deleteProjectChunks(projectId) {
  await FileChunk.deleteMany({ project: projectId });
}

export default {
  replaceProjectChunks,
  getChunksByIds,
  deleteProjectChunks,
};
