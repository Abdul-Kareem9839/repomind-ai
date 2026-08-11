import { ChromaClient } from "chromadb";
import { config } from "./env.js";

let client = null;

/**
 * Single shared ChromaDB client. We always pass our own precomputed Gemini
 * embeddings to add()/query() calls (see services/vector/vectorStore.service.js),
 * so no embeddingFunction is configured here — Chroma is used purely as a vector
 * store, not as the thing that generates the vectors.
 */
function parseChromaUrl(url) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || (parsed.protocol === "https:" ? 443 : 80),
    ssl: parsed.protocol === "https:",
  };
}

export function getChromaClient() {
  if (!client) {
    const chromaConfig = parseChromaUrl(config.chroma.url);
    client = new ChromaClient(chromaConfig);
  }
  return client;
}

export default getChromaClient;
