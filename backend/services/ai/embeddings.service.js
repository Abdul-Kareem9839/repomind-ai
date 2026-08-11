import path from "path";
import { pipeline, env as xenovaEnv } from "@xenova/transformers";
import { config } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";

// Local embedding pipeline: only @xenova/transformers is used here.
// Gemini is not involved in embeddings; it is reserved for chat/answer generation.
let embeddingPipelinePromise = null;
let embeddingDimension = null;

function configureXenovaEnv() {
  xenovaEnv.allowRemoteModels = config.localEmbedding.allowRemoteModels;
  if (config.localEmbedding.localModelPath) {
    xenovaEnv.localModelPath = path.resolve(
      config.localEmbedding.localModelPath,
    );
  }
  xenovaEnv.cacheDir = path.resolve(config.localEmbedding.cacheDir);
}

function normalizeEmbeddingTensor(result) {
  if (!result || !Array.isArray(result.dims) || !result.data) {
    throw new ApiError(
      500,
      "Local embedding model returned invalid tensor output.",
    );
  }

  const [batchSize, dimension] = result.dims;
  if (typeof batchSize !== "number" || typeof dimension !== "number") {
    throw new ApiError(
      500,
      "Unable to determine embedding shape from local model output.",
    );
  }
  if (result.data.length !== batchSize * dimension) {
    throw new ApiError(
      500,
      "Local embedding output tensor size does not match expected dimensions.",
    );
  }

  if (embeddingDimension === null) {
    embeddingDimension = dimension;
  }
  if (embeddingDimension !== dimension) {
    throw new ApiError(
      500,
      `Local embedding dimension changed unexpectedly: expected ${embeddingDimension}, got ${dimension}`,
    );
  }

  const embeddings = [];
  const values = Array.from(result.data);
  for (let i = 0; i < batchSize; i += 1) {
    embeddings.push(values.slice(i * dimension, (i + 1) * dimension));
  }

  return embeddings;
}

async function getEmbeddingPipeline() {
  if (!embeddingPipelinePromise) {
    configureXenovaEnv();
    if (!config.localEmbedding.model) {
      throw new ApiError(500, "Local embedding model is not configured.");
    }
    embeddingPipelinePromise = pipeline(
      "feature-extraction",
      config.localEmbedding.model,
      {
        cache_dir: config.localEmbedding.cacheDir,
        local_files_only: !config.localEmbedding.allowRemoteModels,
      },
    );
  }
  return embeddingPipelinePromise;
}

export async function embedText(text) {
  if (typeof text !== "string") {
    throw new ApiError(400, "embedText expects a string input.");
  }

  const extractor = await getEmbeddingPipeline();
  const result = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });
  const embeddings = normalizeEmbeddingTensor(result);

  if (embeddings.length !== 1) {
    throw new ApiError(
      500,
      "Unexpected embedding output size for single text input.",
    );
  }

  return embeddings[0];
}

export async function embedTexts(texts) {
  if (!Array.isArray(texts)) {
    throw new ApiError(400, "embedTexts expects an array of strings.");
  }

  const extractor = await getEmbeddingPipeline();
  const results = [];
  const batchSize = config.localEmbedding.batchSize;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const tensor = await extractor(batch, {
      pooling: "mean",
      normalize: true,
    });
    const batchEmbeddings = normalizeEmbeddingTensor(tensor);
    if (batchEmbeddings.length !== batch.length) {
      throw new ApiError(
        500,
        "Unexpected embedding batch size from local model.",
      );
    }
    results.push(...batchEmbeddings);
  }

  return results;
}

export default { embedText, embedTexts };
