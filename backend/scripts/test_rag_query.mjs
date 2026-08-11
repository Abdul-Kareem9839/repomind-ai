import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { Project } from "../models/Project.model.js";
import { runRepoMindWorkflow } from "../services/langgraph/graph.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const projectId = process.argv[2] || process.env.PROJECT_ID;
const question = process.argv[3] || "Give a short summary of the repository.";
if (!projectId) {
  console.error("Usage: node test_rag_query.mjs <projectId> [question]");
  process.exit(1);
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "repomind-ai",
    });

    const project = await Project.findById(projectId).lean();
    if (!project) {
      throw new Error("Project not found: " + projectId);
    }
    if (project.status !== "ready") {
      throw new Error(
        "Project is not ready. Current status: " + project.status,
      );
    }

    console.log(
      "Running RAG query against collection",
      project.chromaCollectionName,
    );

    const result = await runRepoMindWorkflow({
      projectId: project._id.toString(),
      collectionName: project.chromaCollectionName,
      projectName: project.name,
      repositorySummary: project.repositorySummary,
      question,
    });

    console.log(
      "RAG result: retrievedChunks=",
      (result.retrievedChunks || []).length,
    );
    console.log(
      "Top retrieved chunk snippet:",
      (result.retrievedChunks || [])[0],
    );
    console.log("Answer:\n", result.answer);

    await mongoose.disconnect();
  } catch (err) {
    console.error("RAG query failed:", err.message || err);
    console.error(err.stack?.split("\n").slice(0, 5).join("\n"));
    process.exit(1);
  }
}

main();
