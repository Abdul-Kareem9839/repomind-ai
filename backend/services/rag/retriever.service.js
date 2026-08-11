import { embedText } from '../ai/embeddings.service.js';
import { queryCollection, getByMetadata } from '../vector/vectorStore.service.js';

/**
 * Runs top-K retrieval for a single question against a project's collection.
 * `where` lets callers (LangGraph nodes, per category — see ARCHITECTURE.md §6)
 * scope the search, e.g. { chunkType: 'repository_summary' } for architecture
 * questions, or leave it unset for a broad search.
 */
export async function retrieveChunks({ collectionName, question, topK = 8, where }) {
  const queryEmbedding = await embedText(question);
  const results = await queryCollection(collectionName, queryEmbedding, { topK, where });

  return results.map((r) => ({
    filepath: r.metadata?.filepath,
    snippet: r.content,
    score: r.score,
    metadata: r.metadata
  }));
}

/** Fetches the repository_summary document directly, without a similarity search. */
export async function retrieveRepositorySummary({ collectionName }) {
  const results = await getByMetadata(collectionName, { chunkType: 'repository_summary' }, 1);
  return results[0] || null;
}

/** Builds a single context string from retrieved chunks, ready to drop into a prompt. */
export function buildContext(chunks) {
  return chunks
    .map((c) => `--- ${c.filepath} ---\n${c.snippet}`)
    .join('\n\n');
}

export default { retrieveChunks, retrieveRepositorySummary, buildContext };
