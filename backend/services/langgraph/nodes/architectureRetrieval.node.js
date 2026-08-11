import { retrieveRepositorySummary, retrieveChunks } from '../../rag/retriever.service.js';

// Signals that the summary alone probably won't cover it — a specific file/folder
// is being asked about, not the project as a whole.
const NEEDS_DETAIL_PATTERN = /\.(js|jsx|ts|tsx|json|md|css|html)\b|\/[\w-]+\/|\bfolder\b|\bdirectory\b/i;

/**
 * architectureRetrievalNode — fetches the repository_summary document first
 * (one metadata lookup, no vector search). Only runs a supplementary similarity
 * search when the question references something specific enough that the
 * high-level summary likely won't cover it. See ARCHITECTURE.md §6.
 */
export async function architectureRetrievalNode(state) {
  const summaryDoc = await retrieveRepositorySummary({ collectionName: state.collectionName });

  const chunks = summaryDoc
    ? [{ filepath: summaryDoc.metadata?.filepath, snippet: summaryDoc.content, score: summaryDoc.score }]
    : [];

  if (NEEDS_DETAIL_PATTERN.test(state.question)) {
    const supplementary = await retrieveChunks({
      collectionName: state.collectionName,
      question: state.question,
      topK: 3
    });
    chunks.push(...supplementary);
  }

  return { retrievedChunks: chunks };
}

export default architectureRetrievalNode;
