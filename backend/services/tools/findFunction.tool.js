import { getByMetadata } from '../vector/vectorStore.service.js';
import { retrieveChunks } from '../rag/retriever.service.js';

export const findFunctionSchema = {
  name: 'findFunction',
  description: 'Find where a specific function or class is defined in the repository, by name.',
  parameters: {
    type: 'object',
    properties: {
      functionName: { type: 'string', description: 'The exact or approximate function/class name to look for' }
    },
    required: ['functionName']
  }
};

/**
 * Tries an exact metadata match on symbolName first (fast, precise). If nothing
 * matches exactly — the name might be slightly off, or it's a method rather
 * than a top-level declaration our chunker tags with a symbolName — falls back
 * to a semantic search for the name instead of returning nothing.
 */
export async function findFunction({ collectionName, functionName }) {
  const exactMatches = await getByMetadata(collectionName, { symbolName: functionName }, 5);

  if (exactMatches.length > 0) {
    return {
      tool: 'findFunction',
      functionName,
      matchType: 'exact',
      matches: exactMatches.map((m) => ({ filepath: m.metadata?.filepath, snippet: m.content }))
    };
  }

  const semanticMatches = await retrieveChunks({
    collectionName,
    question: `function or class named ${functionName}`,
    topK: 5
  });

  return {
    tool: 'findFunction',
    functionName,
    matchType: 'semantic',
    matches: semanticMatches.map((m) => ({ filepath: m.filepath, snippet: m.snippet, score: m.score }))
  };
}

export default findFunction;
