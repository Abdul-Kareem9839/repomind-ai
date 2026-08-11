import dotenv from "dotenv";

dotenv.config();

// Some versions of the Google Generative AI SDK read the API key from
// `process.env.GOOGLE_API_KEY` at import-time. Mirror `GEMINI_API_KEY` there
// so that SDK-based clients pick up the key consistently.
if (process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
}

// Wrap global fetch to ensure requests to Google's generative endpoints use
// API-key auth (x-goog-api-key) instead of Authorization: Bearer which can
// be rejected for API keys that start with AQ.
try {
  const hasFetch = typeof globalThis.fetch === "function";
  const origFetch = hasFetch ? globalThis.fetch : null;
  if (
    process.env.GEMINI_API_KEY &&
    hasFetch &&
    !globalThis.__gemini_fetch_wrapped
  ) {
    globalThis.__gemini_fetch_wrapped = true;
    globalThis.fetch = async (input, init = {}) => {
      try {
        const url = typeof input === "string" ? input : input?.url || "";
        if (
          typeof url === "string" &&
          url.includes("generativelanguage.googleapis.com")
        ) {
          const headers = {};
          const existing = init.headers || {};
          if (existing instanceof Headers) {
            for (const [name, value] of existing.entries()) {
              headers[name.toLowerCase()] = value;
            }
          } else if (Array.isArray(existing)) {
            for (const [name, value] of existing) {
              headers[name.toLowerCase()] = value;
            }
          } else if (typeof existing === "object" && existing !== null) {
            for (const [name, value] of Object.entries(existing)) {
              headers[name.toLowerCase()] = value;
            }
          }
          // Always use API-key auth for Gemini, and strip any bearer auth header.
          delete headers.authorization;
          headers["x-goog-api-key"] = process.env.GEMINI_API_KEY;
          init = { ...init, headers };
        }
      } catch (e) {
        // fail silently and call original fetch below
      }
      return origFetch(input, init);
    };
  }
} catch (e) {
  // ignore errors wrapping fetch
}

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",

  mongoUri: required("MONGO_URI", "mongodb://127.0.0.1:27017/repomind-ai"),
  mongoDbName: process.env.MONGO_DB_NAME || "repomind-ai",

  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    chatModel: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-pro",
  },

  chroma: {
    url: process.env.CHROMA_URL || "http://localhost:8000",
    collectionPrefix: process.env.CHROMA_COLLECTION_PREFIX || "repomind",
  },

  localEmbedding: {
    model: process.env.LOCAL_EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2",
    cacheDir: process.env.LOCAL_EMBEDDING_CACHE_DIR || ".cache/xenova",
    localModelPath: process.env.LOCAL_EMBEDDING_LOCAL_MODEL_PATH || "",
    allowRemoteModels:
      process.env.LOCAL_EMBEDDING_ALLOW_REMOTE_MODELS !== "false",
    batchSize: Number(process.env.LOCAL_EMBEDDING_BATCH_SIZE) || 64,
    collectionVersion: process.env.EMBEDDING_COLLECTION_VERSION || "v2",
  },

  uploads: {
    dir: process.env.UPLOAD_DIR || "uploads",
    tempDir: process.env.TEMP_DIR || "temp",
    chatHistoryDir: process.env.CHAT_HISTORY_DIR || "chat-history",
    maxSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB) || 50,
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
  },
};

export default config;
