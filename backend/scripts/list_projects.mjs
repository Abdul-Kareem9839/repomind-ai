import dotenv from "dotenv";
import mongoose from "mongoose";
import { Project } from "../models/Project.model.js";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "repomind-ai",
    });
    const projects = await Project.find({}).sort({ createdAt: -1 }).lean();
    console.log(JSON.stringify(projects, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error("error", err.message || err);
    process.exit(1);
  }
}

main();
