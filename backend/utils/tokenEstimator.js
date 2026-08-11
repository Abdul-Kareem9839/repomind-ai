// Gemini doesn't expose a local tokenizer in the SDK, so this is a heuristic
// (~4 chars/token, in line with published guidance for Gemini/GPT-family
// models). Good enough for logging and rough cost visibility — not for
// anything billing-accuracy-critical.
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text = '') {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateTokensForTexts(texts = []) {
  return texts.reduce((sum, t) => sum + estimateTokens(t), 0);
}

/**
 * pricePerMillion: USD per 1M tokens for the model/operation in question.
 * Callers pass the current published rate rather than this file hardcoding
 * prices that go stale.
 */
export function estimateCostUsd(tokenCount, pricePerMillion) {
  return (tokenCount / 1_000_000) * pricePerMillion;
}

export default { estimateTokens, estimateTokensForTexts, estimateCostUsd };
