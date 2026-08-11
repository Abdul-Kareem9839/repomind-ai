import { config } from "../config/env.js";

export function buildCollectionName(projectId) {
  return `${config.chroma.collectionPrefix}_${config.localEmbedding.collectionVersion}_${projectId}`;
}

export default buildCollectionName;
