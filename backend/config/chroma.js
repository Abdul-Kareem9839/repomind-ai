import { ChromaClient, CloudClient } from "chromadb";
import { config } from "./env.js";

let client = null;

/**
 * Single shared ChromaDB client. We always pass our own precomputed local
 * embeddings to add()/query() calls (see services/vector/vectorStore.service.js),
 * so no embeddingFunction is configured here — Chroma is used purely as a vector
 * store, not as the thing that generates the vectors.
 *
 * Uses Chroma Cloud (CloudClient) when CHROMA_API_KEY/CHROMA_TENANT/CHROMA_DATABASE
 * are set — this is what production (Render) should use, since Chroma Cloud is
 * the only "always reachable, persists across restarts" option available on a
 * free tier. Falls back to a local Chroma server at CHROMA_URL (e.g. the Docker
 * container used for local dev) when those aren't set.
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
    const { apiKey, tenant, database } = config.chroma.cloud;
    if (apiKey && tenant && database) {
      client = new CloudClient({ apiKey, tenant, database });
    } else {
      const chromaConfig = parseChromaUrl(config.chroma.url);
      client = new ChromaClient(chromaConfig);
    }
  }
  return client;
}

export default getChromaClient;
