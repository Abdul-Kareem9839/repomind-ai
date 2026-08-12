import { config } from "../config/env.js";

export function buildCollectionName(projectId) {
  return `${config.chroma.collectionPrefix}_${config.localEmbedding.collectionVersion}_${projectId}`;
}

// Inverse of buildCollectionName(). A Mongo ObjectId is a 24-char hex string
// with no underscores, so it's always the last underscore-delimited segment
// of a collection name we generated — that holds regardless of what
// CHROMA_COLLECTION_PREFIX / EMBEDDING_COLLECTION_VERSION are set to. Used by
// services/vector/vectorStore.service.js to scope FileChunk lookups back to
// the right project without threading projectId through every retrieval call
// site. Returns null for collection names we didn't generate this way (e.g.
// ad-hoc names used by scripts/chroma-test.mjs).
const PROJECT_ID_SUFFIX_PATTERN = /_([a-f0-9]{24})$/i;

export function extractProjectIdFromCollectionName(collectionName) {
  const match =
    typeof collectionName === "string" ? collectionName.match(PROJECT_ID_SUFFIX_PATTERN) : null;
  return match ? match[1] : null;
}

export default buildCollectionName;
