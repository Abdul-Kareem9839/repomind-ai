# Environment Variables

## Backend (`backend/.env`)

| Variable                              | Default                                 | Required                     | Description                                                                                                                    |
| ------------------------------------- | --------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                                | `5000`                                  | no                           | Port the Express server listens on                                                                                             |
| `NODE_ENV`                            | `development`                           | no                           | `production` enables `secure` cookies and the compact Morgan log format                                                        |
| `CLIENT_URL`                          | `http://localhost:5173`                 | no                           | Sole allowed CORS origin — must match wherever the frontend is served from, or auth cookies won't be accepted cross-origin     |
| `MONGO_URI`                           | `mongodb://127.0.0.1:27017/repomind-ai` | no                           | MongoDB connection string                                                                                                      |
| `JWT_SECRET`                          | —                                       | **yes**                      | Signing secret for auth tokens. Server refuses to start without this                                                           |
| `JWT_EXPIRES_IN`                      | `7d`                                    | no                           | Token lifetime. V1 has no refresh flow, so this is also effectively the max session length                                     |
| `GEMINI_API_KEY`                      | —                                       | **yes**, for chat generation | Without it, chat answers fail per-request; embeddings are generated locally and do not require Gemini.                         |
| `GEMINI_CHAT_MODEL`                   | `gemini-1.5-pro`                        | no                           | Model used for chat generation and reasoning.                                                                                  |
| `LOCAL_EMBEDDING_MODEL`               | `Xenova/all-MiniLM-L6-v2`               | no                           | Local feature-extraction model used to embed chunks and questions                                                              |
| `LOCAL_EMBEDDING_CACHE_DIR`           | `.cache/xenova`                         | no                           | Local cache directory for Transformers model files                                                                             |
| `LOCAL_EMBEDDING_LOCAL_MODEL_PATH`    | ``                                      | no                           | Optional local model directory; leave blank to use default Xenova path                                                         |
| `LOCAL_EMBEDDING_ALLOW_REMOTE_MODELS` | `true`                                  | no                           | Allow downloading the local model once from Hugging Face if not already present                                                |
| `LOCAL_EMBEDDING_BATCH_SIZE`          | `64`                                    | no                           | Number of chunks embedded per local batch                                                                                      |
| `EMBEDDING_COLLECTION_VERSION`        | `v1`                                    | no                           | Collection version suffix to avoid mixing old embedding vectors                                                                |
| `CHROMA_URL`                          | `http://localhost:8000`                 | no                           | ChromaDB server URL                                                                                                            |
| `CHROMA_COLLECTION_PREFIX`            | `repomind`                              | no                           | Prefixes every per-project Chroma collection name (`{prefix}_{version}_{projectId}`)                                           |
| `MAX_UPLOAD_SIZE_MB`                  | `50`                                    | no                           | Multer's max ZIP upload size                                                                                                   |
| `UPLOAD_DIR`                          | `uploads`                               | no                           | Where uploaded ZIPs land before extraction                                                                                     |
| `TEMP_DIR`                            | `temp`                                  | no                           | Per-project scratch workspace for cloned/extracted source, keyed by project ID; cleaned up after indexing (success or failure) |
| `CHAT_HISTORY_DIR`                    | `chat-history`                          | no                           | Reserved runtime directory (chat history itself lives in MongoDB — see `docs/ARCHITECTURE.md`)                                 |
| `RATE_LIMIT_WINDOW_MS`                | `900000` (15 min)                       | no                           | Window for the general API rate limiter                                                                                        |
| `RATE_LIMIT_MAX`                      | `200`                                   | no                           | Max requests per window per IP, general API                                                                                    |

Auth endpoints (`/api/auth/register`, `/api/auth/login`) have their own, stricter
limiter (`authLimiter`) on top of the general one — see `middlewares/rateLimiter.middleware.js`.

## Frontend (`frontend/.env`)

| Variable            | Default                     | Description                                                               |
| ------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Base URL the Axios client is created with. Must include the `/api` prefix |

## Notes

- `config/env.js` throws at import time if `JWT_SECRET` is missing — this is
  intentional fail-fast behavior so a misconfigured deployment never silently
  runs with an insecure/undefined secret.
- `GEMINI_API_KEY` is checked lazily, per call site, rather than at startup —
  everything except AI features (auth, project listing, project metadata)
  works without it, which is convenient for local frontend development against
  a backend that hasn't been fully configured yet.
