import { retrieveRepositorySummary, retrieveChunks } from '../../rag/retriever.service.js';
import { callTool } from '../../tools/index.js';

const README_PATTERN = /\breadme\b/i;
const INTERVIEW_PATTERN = /\binterview questions?\b/i;
const SUMMARY_PATTERN = /\bsummar(y|ize)\b/i;

/**
 * documentationRetrievalNode — docs need whole-project coverage, so retrieval is
 * intentionally wide: the summary plus a broad top-K search. When the question
 * clearly asks for a specific generated artifact (README, interview questions,
 * a summary), the matching tool runs too and its output is handed to answerNode
 * alongside the retrieved context. See ARCHITECTURE.md §6.
 */
export async function documentationRetrievalNode(state) {
  const [summaryDoc, chunks] = await Promise.all([
    retrieveRepositorySummary({ collectionName: state.collectionName }),
    retrieveChunks({ collectionName: state.collectionName, question: state.question, topK: 15 })
  ]);

  const retrievedChunks = summaryDoc
    ? [
        { filepath: summaryDoc.metadata?.filepath, snippet: summaryDoc.content, score: summaryDoc.score },
        ...chunks
      ]
    : chunks;

  const toolArgs = {
    collectionName: state.collectionName,
    repositorySummary: state.repositorySummary,
    projectName: state.projectName
  };

  let toolResult = null;
  const toolsUsed = [];

  if (README_PATTERN.test(state.question)) {
    toolResult = await callTool('generateReadme', toolArgs);
    toolsUsed.push('generateReadme');
  } else if (INTERVIEW_PATTERN.test(state.question)) {
    toolResult = await callTool('generateInterviewQuestions', toolArgs);
    toolsUsed.push('generateInterviewQuestions');
  } else if (SUMMARY_PATTERN.test(state.question)) {
    toolResult = await callTool('summarizeProject', toolArgs);
    toolsUsed.push('summarizeProject');
  }

  return { retrievedChunks, toolResult, toolsUsed };
}

export default documentationRetrievalNode;
