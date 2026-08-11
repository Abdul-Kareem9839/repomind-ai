# Installation Guide

## Prerequisites

| Requirement           | Version            | Notes                                                                    |
| --------------------- | ------------------ | ------------------------------------------------------------------------ |
| Node.js               | ≥ 18               | Both `backend/package.json` and `frontend` target modern ESM             |
| MongoDB               | any recent 6.x/7.x | local instance or Atlas                                                  |
| ChromaDB              | server mode        | run as a separate process/container — this project talks to it over HTTP |
| Google Gemini API key | —                  | used for Gemini chat only; embeddings are generated locally              |

Git is required if you'll test the "import from GitHub URL" flow (the backend
shells out to `simple-git` to clone).

## 1. Start MongoDB and ChromaDB

Easiest with Docker:

```bash
docker run -d --name repomind-mongo -p 27017:27017 mongo:7

docker run -d --name repomind-chroma -p 8000:8000 chromadb/chroma
```

If you already run these natively, just make sure they're reachable at the URLs
you'll put in `.env` (defaults: `mongodb://127.0.0.1:27017/repomind-ai` and
`http://localhost:8000`).

## 2. Backend setup

```bash
cd backend
cp .env.example .env
```

Open `.env` and set, at minimum:

- `JWT_SECRET` — any long random string (auth will not start without this)
- `GEMINI_API_KEY` — from Google AI Studio (required for Gemini chat only; embeddings are local)

Everything else has a working default for local development. See
[`ENVIRONMENT.md`](ENVIRONMENT.md) for the full list.

```bash
npm install
npm run dev
```

You should see:

```
RepoMind AI API listening on port 5000 (development)
```

Verify it's alive:

```bash
curl http://localhost:5000/api/health
# { "success": true, "message": "RepoMind AI API is running" }
```

The server creates its own `uploads/`, `temp/`, and `chat-history/` directories on
startup (paths configurable via `UPLOAD_DIR` / `TEMP_DIR` / `CHAT_HISTORY_DIR`) —
no manual setup needed there.

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

`VITE_API_BASE_URL` in `.env` defaults to `http://localhost:5000/api`, matching
the backend's default port and `/api` mount — no change needed unless you moved
the backend's port or are deploying to different hosts.

Open `http://localhost:5173`, register an account, and you're in.

## 4. First project

From the dashboard, either:

- **GitHub URL** — paste a public repo URL (`https://github.com/user/repo`). The
  backend clones it into a scratch workspace, parses it, and indexes it before
  the request returns.
- **ZIP upload** — upload a `.zip` of a project (max size set by
  `MAX_UPLOAD_SIZE_MB`, default 50MB). It's extracted, parsed, indexed, and the
  original `.zip` is deleted from disk immediately after extraction.

Both flows run synchronously — the HTTP request stays open until parsing,
summarizing, chunking, embedding, and storing in ChromaDB have all finished, and
the response only comes back once the project's status is `ready`. For a large
repository this can take a while; see `docs/ARCHITECTURE.md` for why this is a
deliberate V1 choice and what the async alternative would look like.

## Troubleshooting

| Symptom                                                                           | Likely cause                                                                                                                                                                               |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server exits immediately with "Missing required environment variable: JWT_SECRET" | `.env` wasn't copied/filled in `backend/`                                                                                                                                                  |
| `GEMINI_API_KEY is not configured` error when uploading a project                 | Same — Gemini chat generation requires it; embeddings are generated locally with `@xenova/transformers`.                                                                                   |
| Upload/GitHub import hangs then fails                                             | ChromaDB isn't reachable at `CHROMA_URL`, or Mongo isn't reachable at `MONGO_URI`                                                                                                          |
| CORS error in the browser console                                                 | `CLIENT_URL` in backend `.env` doesn't match the origin the frontend is actually served from                                                                                               |
| 401 immediately after logging in                                                  | Cookie wasn't set — check you're not mixing `http://` frontend with a `secure` cookie config (cookies are only `secure` when `NODE_ENV=production`, so this shouldn't happen in local dev) |
