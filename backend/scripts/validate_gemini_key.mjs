import { embedText } from "../services/ai/embeddings.service.js";

async function main() {
  try {
    console.log("Validating GEMINI_API_KEY by requesting one embedding...");
    const vec = await embedText("Hello from validate script");
    console.log(
      "Success — embedding vector length:",
      Array.isArray(vec) ? vec.length : typeof vec,
    );
    process.exit(0);
  } catch (err) {
    console.error("Validation failed:", err?.message || err);
    if (err?.response) console.error("Response:", err.response);
    process.exit(2);
  }
}

main();
