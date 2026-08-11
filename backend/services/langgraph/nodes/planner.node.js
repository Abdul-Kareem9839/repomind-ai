import { generateText } from '../../ai/gemini.service.js';

export const QUERY_TYPES = ['architecture', 'code_flow', 'bug_analysis', 'documentation', 'general_chat'];

// Fast, free, deterministic first pass — covers the common cases without an
// LLM round trip. Only ambiguous questions fall through to the classifier call.
const KEYWORD_RULES = [
  { type: 'documentation', pattern: /\b(readme|documentation|interview questions?|generate docs|api docs)\b/i },
  { type: 'bug_analysis', pattern: /\b(bug|error|crash|fails?|failing|broken|fix|exception|stack trace|debug)\b/i },
  { type: 'architecture', pattern: /\b(architecture|overview|folder structure|project structure|tech stack|how is .* organized)\b/i },
  { type: 'code_flow', pattern: /\b(flow|trace|how does .* work|call(s|ed)? by|where is .* (called|defined|generated))\b/i }
];

function classifyByKeywords(question) {
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(question)) return rule.type;
  }
  return null;
}

const CLASSIFICATION_PROMPT = (question) => `Classify the following question about a software repository into
exactly one of these categories: architecture, code_flow, bug_analysis, documentation, general_chat.

- architecture: questions about overall project structure, stack, or how modules fit together
- code_flow: questions about how execution/data flows between specific files or functions
- bug_analysis: questions about fixing, debugging, or explaining an error
- documentation: requests to generate a README, API docs, interview questions, or a summary
- general_chat: anything that doesn't need the repository's code to answer

Respond with ONLY the category name, nothing else.

Question: "${question}"`;

/**
 * plannerNode — the entry point of the graph. Classifies req.question into one
 * of the five categories that determine which retrieval path runs next (see
 * ARCHITECTURE.md §6).
 */
export async function plannerNode(state) {
  const keywordMatch = classifyByKeywords(state.question);
  if (keywordMatch) {
    return { queryType: keywordMatch };
  }

  const llmResult = await generateText(CLASSIFICATION_PROMPT(state.question), { temperature: 0 });
  const normalized = llmResult?.trim().toLowerCase();

  if (normalized && QUERY_TYPES.includes(normalized)) {
    return { queryType: normalized };
  }

  // No API key configured, or the model returned something unexpected —
  // default to general_chat rather than failing the whole request.
  return { queryType: 'general_chat' };
}

export default plannerNode;
