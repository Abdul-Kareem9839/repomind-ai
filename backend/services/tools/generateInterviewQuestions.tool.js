import { generateText } from '../ai/gemini.service.js';
import { retrieveChunks } from '../rag/retriever.service.js';

export const generateInterviewQuestionsSchema = {
  name: 'generateInterviewQuestions',
  description: 'Generates technical interview questions (with answers) based on the repository\'s actual code.',
  parameters: {
    type: 'object',
    properties: {
      count: { type: 'number', description: 'How many questions to generate', default: 8 }
    }
  }
};

export async function generateInterviewQuestions({ collectionName, repositorySummary, projectName, count = 8 }) {
  const context = await retrieveChunks({
    collectionName,
    question: 'core logic, architecture decisions, authentication, data handling',
    topK: 12
  });

  const prompt = `Based on this repository ("${projectName}", stack: ${repositorySummary?.frameworks?.join(', ') || 'unknown'}),
write exactly ${count} technical interview questions a candidate who built this project should be able to answer,
each with a concise model answer grounded in the actual code below. Format as Markdown with
"### Q1: ..." / "**Answer:** ..." pairs.

Code context:
${context.map((c) => `--- ${c.filepath} ---\n${c.snippet}`).join('\n\n')}`;

  const questions = await generateText(prompt, { temperature: 0.5 });

  return {
    tool: 'generateInterviewQuestions',
    content: questions || 'Interview question generation is unavailable — GEMINI_API_KEY is not configured.'
  };
}

export default generateInterviewQuestions;
