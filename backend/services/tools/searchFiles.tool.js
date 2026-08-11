import { retrieveChunks } from '../rag/retriever.service.js';

export const searchFilesSchema = {
  name: 'searchFiles',
  description: 'Search the repository for files/code relevant to a natural-language query. Returns the most relevant chunks with their file paths.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'What to search for' },
      topK: { type: 'number', description: 'Max results to return', default: 6 }
    },
    required: ['query']
  }
};

export async function searchFiles({ collectionName, query, topK = 6 }) {
  const results = await retrieveChunks({ collectionName, question: query, topK });
  return {
    tool: 'searchFiles',
    query,
    matches: results.map((r) => ({ filepath: r.filepath, snippet: r.snippet, score: r.score }))
  };
}

export default searchFiles;
