# API Reference

Base URL: `http://localhost:5000/api` (adjust host/port for your deployment).

## Conventions

**Response envelope.** Every endpoint returns the same shape:

```json
{ "success": true, "message": "...", "data": { ... } }
```

Errors use the same envelope with `success: false`, plus an optional `details`
array for validation errors:

```json
{
  "success": false,
  "message": "Validation failed",
  "details": [{ "path": "body.email", "message": "Invalid email address" }]
}
```

**Authentication.** After register/login, the server sets an `httpOnly` cookie
named `token` (7-day default lifetime, `sameSite: lax`). Every protected route
reads this cookie automatically — the frontend just needs `withCredentials: true`
on its HTTP client. For non-browser clients, the same token is also returned in
the response body and accepted via `Authorization: Bearer <token>`.

**Rate limits.** All `/api/*` routes: 200 requests / 15 min per IP. Auth routes
(`/api/auth/register`, `/api/auth/login`) additionally: 20 requests / 15 min per IP.

**Errors you'll see everywhere:** `401` (missing/invalid/expired token), `400`
(validation failure — Zod-checked body/params), `404` (resource not found or not
owned by the caller), `500` (unexpected).

---

## Auth

### `POST /api/auth/register`

Body:
```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "at-least-8-chars" }
```
`name`: 2–80 chars. `password`: min 8 chars.

`201` →
```json
{ "success": true, "message": "Account created successfully",
  "data": { "user": { "id": "...", "name": "...", "email": "...", "createdAt": "..." }, "token": "..." } }
```
`409` if the email is already registered.

### `POST /api/auth/login`

Body: `{ "email": "...", "password": "..." }`

`200` → same shape as register. `401` on wrong credentials (deliberately
identical message for "no such user" and "wrong password", to avoid leaking
which one it was).

### `POST /api/auth/logout` 🔒

Clears the auth cookie. `200`, `data: null`.

### `GET /api/auth/me` 🔒

`200` → `{ "data": { "user": { "id", "name", "email", "createdAt" } } }`

---

## Projects

All project routes require authentication and are scoped to the calling user —
you can never see or act on another user's project (enforced at the query level,
e.g. `Project.findOne({ _id: projectId, owner: ownerId })`).

### `POST /api/projects/github` 🔒

Body:
```json
{ "name": "My API", "repoUrl": "https://github.com/user/repo" }
```
`repoUrl` must match `https://github.com/<owner>/<repo>` (optionally `.git`,
optionally trailing slash).

This request **blocks until ingestion finishes** — clone → parse → analyze →
chunk → embed → index into ChromaDB — then returns the finished project. See
`docs/RAG.md` for what happens in between.

`201` → `{ "data": { "project": { ...Project fields... } } }`
`400` if the repo has none of the supported file types, or the clone fails.

### `POST /api/projects/upload` 🔒

`multipart/form-data` with fields:
- `name` — string, 1–120 chars
- `file` — the `.zip` (field name must be exactly `file`)

Same synchronous ingestion behavior as the GitHub route. `400` if no file is
attached, the file isn't a `.zip`, or it exceeds `MAX_UPLOAD_SIZE_MB`.

### `GET /api/projects` 🔒

`200` → `{ "data": { "projects": [ ...Project[] ] } }`, newest first.

### `GET /api/projects/:id` 🔒

`200` → `{ "data": { "project": {...} } }`. `404` if not found or not yours.

### `DELETE /api/projects/:id` 🔒

Deletes the Mongo document, the project's Chroma collection, and any leftover
temp workspace. `200`, `data: null`.

### Project object shape

```json
{
  "_id": "665f...",
  "owner": "665f...",
  "name": "My API",
  "sourceType": "github | zip",
  "sourceUrl": "https://github.com/... (or original zip path, pre-cleanup)",
  "status": "pending | indexing | ready | failed",
  "failureReason": "present only when status is 'failed'",
  "chromaCollectionName": "repomind_665f...",
  "fileCount": 42,
  "chunkCount": 311,
  "repositorySummary": {
    "frameworks": ["Express", "React"],
    "languages": ["JavaScript", "JavaScript (JSX)"],
    "packageManager": "npm",
    "entryFiles": ["server.js"],
    "dependencies": { "runtime": [...], "dev": [...] },
    "routes": [{ "method": "POST", "path": "/api/auth/login", "file": "routes/auth.routes.js" }],
    "controllers": ["controllers/auth.controller.js", "..."],
    "authentication": { "strategy": "jsonwebtoken", "files": ["..."] },
    "database": { "type": "MongoDB", "odm": "Mongoose" },
    "summary": "human-readable paragraph, LLM-generated where an API key is configured"
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## Chat

### `POST /api/chat/:projectId` 🔒

Body: `{ "question": "How does login work?" }` (1–2000 chars)

Runs the full LangGraph workflow (see `docs/LANGGRAPH.md`) — classifies the
question, retrieves relevant context from the project's Chroma collection, runs
a tool if the category calls for one, and generates the answer.

`201` →
```json
{ "data": { "chat": {
  "_id": "...", "project": "...", "user": "...",
  "question": "How does login work?",
  "queryType": "code_flow",
  "retrievedChunks": [{ "filepath": "controllers/auth.controller.js", "snippet": "...", "score": 0.83 }],
  "toolsUsed": [],
  "answer": "...",
  "createdAt": "..."
} } }
```

`404` if the project doesn't exist / isn't yours. Answering against a project
that's still `indexing` or has `failed` will error at retrieval time since its
Chroma collection isn't populated (or doesn't exist) yet — check `status` first.

### `GET /api/chat/history/:projectId` 🔒

`200` → `{ "data": { "history": [ ...Chat[], oldest first ] } }`

---

## Health

### `GET /api/health`

No auth. `200` → `{ "success": true, "message": "RepoMind AI API is running" }`.
Useful for uptime checks / confirming the server started.
