import { embedText } from "../services/ai/embeddings.service.js";

try {
  const embedding = await embedText(
    "Smoke test embedding from backend service",
  );
  if (!Array.isArray(embedding)) {
    console.error("EMBED TEST FAILED: result is not an array", embedding);
    process.exit(1);
  }
  console.log("EMBED TEST OK length=" + embedding.length);
  console.log("EMBED TEST firstValues=" + embedding.slice(0, 3).join(","));
} catch (error) {
  console.error("EMBED TEST FAILED", error.message || error);
  process.exit(1);
}
