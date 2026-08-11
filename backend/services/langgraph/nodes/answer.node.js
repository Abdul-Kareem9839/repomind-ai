import { getChatModel } from '../../ai/chatModel.service.js';
import { promptByCategory } from '../../ai/promptTemplates.js';
import { buildContext } from '../../rag/retriever.service.js';

/**
 * answerNode — every path in the graph converges here. Picks the prompt
 * template for state.queryType, fills it with retrieved context and any tool
 * output (findFunction/searchFiles for bug_analysis; generateReadme/
 * generateInterviewQuestions/summarizeProject for documentation — see
 * services/tools/), and invokes the chat model.
 */
export async function answerNode(state) {
  const template = promptByCategory[state.queryType] || promptByCategory.general_chat;
  const model = getChatModel();

  const chain = template.pipe(model);

  const context = buildContext(state.retrievedChunks || []);

  const result = await chain.invoke({
    question: state.question,
    context: context || 'No repository context was retrieved for this question.',
    toolResult: state.toolResult ? JSON.stringify(state.toolResult) : 'none'
  });

  const answerText = typeof result.content === 'string' ? result.content : String(result.content);

  return { answer: answerText };
}

export default answerNode;
