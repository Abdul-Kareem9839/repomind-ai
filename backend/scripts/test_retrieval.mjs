import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { retrieveChunks } from "../services/rag/retriever.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const collectionName = process.argv[2] || process.env.CHROMA_COLLECTION_NAME;
const question = process.argv[3] || "What is the structure of this repository?";
if (!collectionName) {
  console.error("Usage: node test_retrieval.mjs <collectionName>");
  process.exit(1);
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "repomind-ai",
    });

    console.log("Retrieving chunks from", collectionName);
    const chunks = await retrieveChunks({ collectionName, question, topK: 5 });
    console.log("Retrieved chunks count:", chunks.length);
    for (const [i, c] of chunks.entries()) {
      console.log(`--- [${i}] filepath=${c.filepath} score=${c.score}`);
      console.log(c.snippet.slice(0, 200));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Retrieval failed:", err.message || err);
    process.exit(1);
  }
}

main();
