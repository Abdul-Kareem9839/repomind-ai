import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../../config/env.js";
import { createLogger } from "../../utils/logger.js";

const log = createLogger("ai:gemini");
let client = null;

function getClient() {
  if (!config.gemini.apiKey) return null;
  if (!client) {
    // Ensure SDKs that rely on env var `GOOGLE_API_KEY` will use the key.
    process.env.GOOGLE_API_KEY = config.gemini.apiKey;
    client = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return client;
}

/**
 * Plain text generation against the configured Gemini chat model. Returns null
 * (rather than throwing) when no API key is configured or the call fails, so
 * callers that treat this as a "nice to have" enhancement — like the repository
 * summary — can fall back gracefully instead of failing the whole ingestion.
 */
export async function generateText(prompt, { temperature = 0.4 } = {}) {
  const genAI = getClient();
  if (!genAI) return null;

  try {
    const model = genAI.getGenerativeModel(
      { model: config.gemini.chatModel },
      { apiVersion: "v1" },
    );
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature },
    });
    return result.response.text().trim();
  } catch (err) {
    log.error("generateText failed", { message: err.message });
    return null;
  }
}

export default { generateText };
