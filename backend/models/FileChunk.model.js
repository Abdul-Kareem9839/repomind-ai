import mongoose from "mongoose";

/**
 * Persisted chunk content. MongoDB is the source of truth for the actual
 * source-code text of every indexed chunk; Chroma only ever receives the
 * embedding + a small metadata payload (see services/vector/vectorStore.service.js
 * and services/rag/fileChunk.service.js). This is what lets a repository index
 * without tripping Chroma Cloud's 'Document size (bytes)' quota.
 *
 * `chunkId` is the same stable id used as the Chroma vector id (either
 * `${filepath}::${chunkIndex}` from services/rag/chunker.service.js, or the
 * repository-summary sentinel from services/rag/indexer.service.js) — it's
 * what lets vectorStore.service.js join a Chroma similarity-search result
 * back to its full content here.
 */
const fileChunkSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    chunkId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    filepath: String,
    filename: String,
    language: String,
    chunkType: String,
    symbolName: {
      type: String,
      default: null,
    },
    chunkIndex: Number,
    imports: [String],
    exports: [String],
  },
  { timestamps: true },
);

// One chunk per (project, chunkId) — also the shape of the lookups
// vectorStore.service.js does after every Chroma query/get.
fileChunkSchema.index({ project: 1, chunkId: 1 }, { unique: true });

export const FileChunk = mongoose.model("FileChunk", fileChunkSchema);

export default FileChunk;
