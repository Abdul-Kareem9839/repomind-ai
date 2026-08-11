import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { config } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

let model = null;

/**
 * The LangChain-wrapped Gemini chat model, used specifically by the LangGraph
 * answerNode so prompt composition can go through LangChain's ChatPromptTemplate
 * + LCEL (`prompt.pipe(model)`) rather than raw string concatenation.
 *
 * services/ai/gemini.service.js (the plain @google/generative-ai wrapper used by
 * the repository analyzer) is intentionally left as-is — that call site doesn't
 * need LangChain's composition features, so switching it would be extra
 * indirection for no benefit. This is the one place LangChain's chat model
 * belongs.
 */
export function getChatModel({ temperature = 0.3 } = {}) {
  if (!config.gemini.apiKey) {
    throw ApiError.internal('GEMINI_API_KEY is not configured — chat answers require it.');
  }
  if (!model) {
    model = new ChatGoogleGenerativeAI({
      apiKey: config.gemini.apiKey,
      model: config.gemini.chatModel,
      temperature
    });
  }
  return model;
}

export default { getChatModel };
