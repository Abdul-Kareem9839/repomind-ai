import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    method: String,
    path: String,
    file: String,
  },
  { _id: false },
);

// Embedded directly on Project — see ARCHITECTURE.md §3/§5. Populated by
// services/parser/repositoryAnalyzer.service.js after parsing, before chunking.
const repositorySummarySchema = new mongoose.Schema(
  {
    frameworks: [String],
    languages: [String],
    packageManager: String,
    entryFiles: [String],
    folderStructure: mongoose.Schema.Types.Mixed,
    dependencies: {
      runtime: [String],
      dev: [String],
    },
    routes: [routeSchema],
    controllers: [String],
    authentication: {
      strategy: String,
      files: [String],
    },
    database: {
      type: {
        type: String,
        default: null,
      },
      odm: {
        type: String,
        default: null,
      },
    },
    summary: String,
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: ["github", "zip"],
      required: true,
    },
    sourceUrl: {
      type: String, // GitHub URL, or original ZIP filename for reference
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "indexing", "ready", "failed"],
      default: "pending",
    },
    failureReason: {
      type: String,
    },
    chromaCollectionName: {
      type: String,
      unique: true,
      sparse: true,
    },
    fileCount: {
      type: Number,
      default: 0,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    repositorySummary: {
      type: repositorySummarySchema,
      default: undefined,
    },
  },
  { timestamps: true },
);

projectSchema.index({ owner: 1, createdAt: -1 });

export const Project = mongoose.model("Project", projectSchema);

export default Project;
