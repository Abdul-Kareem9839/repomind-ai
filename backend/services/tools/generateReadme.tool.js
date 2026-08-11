import { generateText } from '../ai/gemini.service.js';
import { retrieveChunks } from '../rag/retriever.service.js';

export const generateReadmeSchema = {
  name: 'generateReadme',
  description: 'Generates a README.md for the repository based on its structure, stack, and code.',
  parameters: { type: 'object', properties: {} }
};

export async function generateReadme({ collectionName, repositorySummary, projectName }) {
  const broadContext = await retrieveChunks({
    collectionName,
    question: 'project setup, entry point, main features, configuration',
    topK: 10
  });

  const prompt = `Write a complete README.md in Markdown for a project called "${projectName}".

Repository facts:
- Frameworks: ${repositorySummary?.frameworks?.join(', ') || 'unknown'}
- Languages: ${repositorySummary?.languages?.join(', ') || 'unknown'}
- Package manager: ${repositorySummary?.packageManager || 'unknown'}
- Database: ${repositorySummary?.database?.type || 'none detected'}
- Authentication: ${repositorySummary?.authentication?.strategy || 'none detected'}
- Entry files: ${repositorySummary?.entryFiles?.join(', ') || 'unknown'}

Relevant code excerpts:
${broadContext.map((c) => `--- ${c.filepath} ---\n${c.snippet}`).join('\n\n')}

Include: a title, a short description, tech stack, installation steps, environment variables
(if any are implied by the code), and how to run the project. Output only the Markdown.`;

  const readme = await generateText(prompt, { temperature: 0.4 });

  return {
    tool: 'generateReadme',
    content: readme || 'README generation is unavailable — GEMINI_API_KEY is not configured.'
  };
}

export default generateReadme;
