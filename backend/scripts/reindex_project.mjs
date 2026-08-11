import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { reindexProject } from "../services/project.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const projectId = process.argv[2] || process.env.PROJECT_ID;
if (!projectId) {
  console.error("Usage: node reindex_project.mjs <projectId>");
  process.exit(1);
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "repomind-ai",
    });

    console.log("Starting reindex for project", projectId);
    await reindexProject(projectId);
    console.log("Reindex completed for project", projectId);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Reindex failed:", err.message || err);
    console.error(err.stack?.split("\n").slice(0, 5).join("\n"));
    process.exit(1);
  }
}

main();
