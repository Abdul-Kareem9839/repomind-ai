import { ChatPromptTemplate } from '@langchain/core/prompts';

const SYSTEM_PREAMBLE = `You are RepoMind AI, an assistant that answers questions about a specific
software repository. Always base your answer on the provided context. If the context doesn't
contain enough information to answer confidently, say so explicitly rather than guessing.
Never invent file names, function names, or behavior that isn't shown in the context.`;

/**
 * One template per LangGraph category (see ARCHITECTURE.md §6). Keeping them
 * separate — rather than one generic "answer this" template — lets each
 * category ask for a different shape of answer (a narrative for architecture,
 * a step-by-step trace for code flow, etc.) instead of the model guessing the
 * right format every time.
 */
export const architecturePrompt = ChatPromptTemplate.fromMessages([
  ['system', `${SYSTEM_PREAMBLE}\n\nThe user is asking about the overall architecture of the repository. Use the repository summary context to explain structure, stack, and how the pieces fit together.`],
  ['human', 'Repository context:\n{context}\n\nQuestion: {question}']
]);

export const codeFlowPrompt = ChatPromptTemplate.fromMessages([
  ['system', `${SYSTEM_PREAMBLE}\n\nThe user wants to understand how code flows between files/functions. Use the retrieved code (including anything pulled in via import relationships) to trace the flow step by step, citing filenames.`],
  ['human', 'Retrieved code:\n{context}\n\nQuestion: {question}']
]);

export const bugAnalysisPrompt = ChatPromptTemplate.fromMessages([
  ['system', `${SYSTEM_PREAMBLE}\n\nThe user is debugging or asking about a potential issue. Use the retrieved code to identify likely causes, point to the exact file(s) involved, and suggest a concrete fix. If a tool result is provided, incorporate it into your reasoning rather than re-deriving it.`],
  ['human', 'Retrieved code:\n{context}\n\nTool output (if any):\n{toolResult}\n\nQuestion: {question}']
]);

export const documentationPrompt = ChatPromptTemplate.fromMessages([
  ['system', `${SYSTEM_PREAMBLE}\n\nThe user wants documentation generated (README, API docs, interview questions, or a summary). If a tool already generated the requested artifact, present it directly (light formatting cleanup only, don't regenerate from scratch). Otherwise use the repository context provided and produce well-structured Markdown.`],
  ['human', 'Repository context:\n{context}\n\nTool output (if any):\n{toolResult}\n\nRequest: {question}']
]);

export const generalChatPrompt = ChatPromptTemplate.fromMessages([
  ['system', `${SYSTEM_PREAMBLE}\n\nThis question doesn't require repository context (e.g. small talk or a general programming question). Answer directly and concisely.`],
  ['human', '{question}']
]);

export const promptByCategory = {
  architecture: architecturePrompt,
  code_flow: codeFlowPrompt,
  bug_analysis: bugAnalysisPrompt,
  documentation: documentationPrompt,
  general_chat: generalChatPrompt
};

export default promptByCategory;
