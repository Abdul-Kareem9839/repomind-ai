import { generateText } from "../services/ai/gemini.service.js";
import { embedText } from "../services/ai/embeddings.service.js";
import {
  getOrCreateCollection,
  upsertChunks,
  queryCollection,
  deleteCollection,
} from "../services/vector/vectorStore.service.js";

async function run() {
  console.log("SMOKE TEST: start");

  const chat = await generateText("Smoke test: verify Gemini chat generation.");
  if (!chat || typeof chat !== "string" || chat.length === 0) {
    throw new Error("Gemini chat did not return a non-empty string");
  }
  console.log("SMOKE TEST: Gemini chat OK");

  const embedding = await embedText("Smoke test: verify local embeddings.");
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Embedding service did not return a non-empty vector");
  }
  console.log("SMOKE TEST: local embeddings OK length=" + embedding.length);

  const collectionName = `smoke_test_${Date.now()}`;
  const collection = await getOrCreateCollection(collectionName);
  if (!collection || typeof collection.upsert !== "function") {
    throw new Error("Failed to create or get Chroma collection");
  }
  console.log("SMOKE TEST: Chroma collection OK");

  await upsertChunks(collectionName, [
    {
      id: "smoke-1",
      content: "This is a smoke-test document.",
      embedding,
      metadata: { test: "smoke" },
    },
  ]);
  console.log("SMOKE TEST: Chroma upsert OK");

  const results = await queryCollection(collectionName, embedding, { topK: 1 });
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("Chroma query returned no results");
  }
  console.log(
    "SMOKE TEST: Chroma query OK id=" +
      results[0].id +
      " score=" +
      results[0].score,
  );

  await deleteCollection(collectionName);
  console.log("SMOKE TEST: Chroma cleanup OK");

  console.log("SMOKE TEST: all checks passed");
}

run().catch((err) => {
  console.error("SMOKE TEST FAILED:", err.message);
  console.error(err.stack?.split("\n").slice(0, 5).join("\n"));
  process.exit(1);
});
