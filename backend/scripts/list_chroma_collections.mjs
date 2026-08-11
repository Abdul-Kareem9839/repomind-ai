import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getChromaClient } from "../config/chroma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

async function main() {
  try {
    const client = getChromaClient();
    // Try a few common list methods depending on client implementation
    if (typeof client.listCollections === "function") {
      const cols = await client.listCollections();
      console.log("collections:", cols);
    } else if (typeof client.getCollectionNames === "function") {
      const names = await client.getCollectionNames();
      console.log("collection names:", names);
    } else if (typeof client.getAllCollections === "function") {
      const cols = await client.getAllCollections();
      console.log("collections:", cols);
    } else {
      console.log("Chroma client does not expose a known list API.");
    }
  } catch (err) {
    console.error("Failed to list Chroma collections:", err.message || err);
    process.exit(1);
  }
}

main();
