import { retrieveChunks } from '../../rag/retriever.service.js';
import { callTool } from '../../tools/index.js';

const FUNCTION_NAME_PATTERN = /\b([A-Za-z_$][\w$]*)\s*\(/;
const FILE_MENTION_PATTERN = /\b[\w-]+\.(js|jsx|ts|tsx)\b/;

/**
 * bugAnalysisRetrievalNode — broad similarity search, plus a tool call when the
 * question names something specific enough to search for directly: a function
 * name (findFunction) or a filename (searchFiles). See ARCHITECTURE.md §6.
 */
export async function bugAnalysisRetrievalNode(state) {
  const chunks = await retrieveChunks({
    collectionName: state.collectionName,
    question: state.question,
    topK: 10
  });

  const functionMatch = state.question.match(FUNCTION_NAME_PATTERN);
  const fileMatch = state.question.match(FILE_MENTION_PATTERN);

  let toolResult = null;
  const toolsUsed = [];

  if (functionMatch) {
    toolResult = await callTool('findFunction', {
      collectionName: state.collectionName,
      functionName: functionMatch[1]
    });
    toolsUsed.push('findFunction');
  } else if (fileMatch) {
    toolResult = await callTool('searchFiles', {
      collectionName: state.collectionName,
      query: fileMatch[0]
    });
    toolsUsed.push('searchFiles');
  }

  return { retrievedChunks: chunks, toolResult, toolsUsed };
}

export default bugAnalysisRetrievalNode;
