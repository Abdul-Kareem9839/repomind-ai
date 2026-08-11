import {
  getOrCreateCollection,
  upsertChunks,
  queryCollection,
  deleteCollection,
} from "../services/vector/vectorStore.service.js";

try {
  const collectionName = "smoke_test_" + Date.now();
  const collection = await getOrCreateCollection(collectionName);
  console.log("CHROMA TEST: created collection", collectionName);
  const embedding = Array.from({ length: 10 }, (_, i) => i * 0.1 + 0.01);
  await upsertChunks(collectionName, [
    {
      id: "test-1",
      content: "Smoke test document",
      embedding,
      metadata: { test: "chroma" },
    },
  ]);
  console.log("CHROMA TEST: upserted");
  const results = await queryCollection(collectionName, embedding, { topK: 1 });
  console.log("CHROMA TEST: query results", results);
  await deleteCollection(collectionName);
  console.log("CHROMA TEST: deleted collection");
} catch (error) {
  console.error("CHROMA TEST FAILED", error.message || error);
  process.exit(1);
}
