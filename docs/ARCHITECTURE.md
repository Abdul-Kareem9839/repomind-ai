# Architecture Overview

This is the document the backend's own code comments point to (search for
`ARCHITECTURE.md` in `backend/` — auth middleware, the Project model, every
RAG/LangGraph service). It explains the system end to end and the reasoning
behind the decisions that aren't obvious from the code alone.

## §1. High-level shape

```
┌──────────┐  HTTP/JSON, cookie auth  ┌───────────┐        ┌──────────┐
│ React SPA│ ───────────────────────► │  Express  │ ─────► │ MongoDB  │  (users, projects, chats)
└──────────┘                          │    API    │        └──────────┘
                                       │           │        ┌──────────┐
                                       │           │ ─────► │ ChromaDB │  (per-project vectors)
                                       │           │        └──────────┘
                                       │           │        ┌──────────┐
                                       │           │ ─────► │  Gemini  │  (chat only)
                                       └───────────┘        └──────────┘
```

Three external dependencies, three clear responsibilities: MongoDB owns
structured data (accounts, project metadata, chat transcripts), ChromaDB owns
vector search, Gemini owns chat generation and reasoning. Embeddings are
created locally with a Transformers feature-extraction model so the system does
not call Gemini for vector generation. No component does more than one of these
jobs.

## §2. Request lifecycle

1. `app.js` — helmet, CORS (locked to `CLIENT_URL`), body/cookie parsing,
   Morgan logging (skipped in `test` env), global rate limiter, routes,
   `notFoundHandler`, `errorHandler` (must be last — this ordering is what
   lets any thrown `ApiError` anywhere downstream become a clean JSON response)
2. Route → `validateRequest(zodSchema)` → (auth routes: `protect`) → controller
3. Controller calls exactly one service function, wraps the result in
   `new ApiResponse(statusCode, data, message)`
4. Anything thrown anywhere in that chain — an explicit `ApiError`, a Mongoose
   validation error, a Mongo duplicate-key error, a JWT error — is normalized
   by `errorHandler` into the same `{ success: false, message, details? }` shape

## §3. Data model

Three collections, deliberately kept flat rather than over-normalized for a
project this size:

- **User** — name/email/password (bcrypt-hashed, 12 rounds, `select: false` so
  it's never returned by default queries)
- **Project** — one document per repository/upload. `repositorySummary` (see
  §5) is **embedded directly on the Project document**, not a separate
  collection — it's small, always fetched together with the project, and
  never queried independently, so normalizing it would only add a join for no
  benefit. `chromaCollectionName` is the pointer into the vector store; a
  project's real "content" lives there, not in Mongo.
- **Chat** — one document per question/answer pair (not one document per whole
  conversation with a messages array). This keeps each turn independently
  queryable and matches how the frontend actually consumes history — fetch all
  chats for a project, render each as a question bubble + answer bubble pair.

## §4. Ingestion pipeline

Covered in full in `docs/RAG.md`. The one architectural point worth restating
here: ingestion is **synchronous** in V1 — `POST /api/projects/github` and
`/upload` don't return until the project is `ready` (or `failed`). See §8 for
why, and what would change to make it async.

## §5. Repository summary

`repositorySummary` (computed once, in `services/parser/repositoryAnalyzer.service.js`)
does double duty:

1. Stored on the `Project` document, so the dashboard/API can show stack,
   routes, auth strategy, etc. without touching Chroma at all
2. Turned into one extra searchable chunk at index time (see
   `docs/RAG.md` §4), so it's also the first thing retrieved for
   architecture- and documentation-type questions

Structural fields (frameworks, database, auth strategy, routes) are detected
deterministically from `package.json` dependency names and route-registration
regexes — no LLM involved, so they're free and consistent. Only the free-text
`summary` paragraph is LLM-generated, and it degrades gracefully to `null` if
no Gemini key is configured (see `docs/ENVIRONMENT.md`).

## §6. LangGraph workflow

Full detail in `docs/LANGGRAPH.md`. The core idea: a **planner** node
classifies each question into one of five categories, and each category has
its **own retrieval node** — architecture questions fetch the repository
summary first, code-flow questions follow import chains one hop, bug-analysis
questions call function/file-search tools, documentation questions retrieve
broadly and can trigger a generation tool. All five paths converge on one
**answer** node that picks the matching prompt template and calls the model.

This per-category design (rather than one generic "retrieve then answer"
chain) is what the project's extensibility goal depends on: adding a sixth
category is a new node + one router case, with zero changes to the other five.

## §7. Authentication

JWT in an `httpOnly` cookie (`sameSite: lax`, `secure` only when
`NODE_ENV=production`), 7-day default expiry, verified per-request in the
`protect` middleware by looking up the user fresh from Mongo (so a deleted
user's existing token stops working immediately, not just after it expires).

**V1 deliberately ships with a single access token and no refresh flow.** The
token's lifetime is long enough (7 days by default) that this doesn't mean
constant re-logins for a first release, and there's no rotation/revocation
complexity to get right under time pressure. The token is also returned in the
response body (`{ user, token }`) alongside the cookie, so non-browser clients
can use `Authorization: Bearer <token>` instead — useful for testing the API
directly with curl/Postman without dealing with cookies at all.

**Where a refresh flow would plug in later:** a second, longer-lived
`refreshToken` cookie, a `/api/auth/refresh` route that verifies it and issues
a new short-lived access token, and shortening `JWT_EXPIRES_IN` on the access
token itself (e.g. 15 minutes) now that refresh covers the rest of the
session. `utils/token.js` already isolates all signing/verification behind
`signAccessToken`/`verifyAccessToken`, so this is additive, not a rewrite.

## §8. Deliberate V1 trade-offs

These are intentional scope decisions for a first release, not bugs:

| Decision                                                 | Why                                                                             | What "fixing" it later looks like                                                                                                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ingestion runs synchronously in the request              | Simpler to reason about and debug for V1; no job queue/worker infra to stand up | Move `runIngestionPipeline` onto a queue (BullMQ, etc.), have the route return immediately with `status: 'pending'`, and have the frontend poll `GET /api/projects/:id` for status changes (it already renders `pending/indexing/ready/failed` distinctly) |
| Single access token, no refresh                          | See §7                                                                          | See §7                                                                                                                                                                                                                                                     |
| One Mongo query per protected request to load `req.user` | Simplicity + always-fresh user state (see §7) over the small perf cost          | Cache the user briefly (e.g. in-memory TTL or Redis) keyed by user ID if this becomes measurable under load                                                                                                                                                |
| Repository summary embedded on `Project`, not normalized | It's small and always read together with the project                            | Not expected to need changing — this isn't a temporary shortcut                                                                                                                                                                                            |

## §9. Extensibility hooks (by design)

- **New retrieval strategy** → new node in `services/langgraph/nodes/`, one
  router case, one edge in `graph.js` (§6)
- **New AI tool** → new file in `services/tools/`, one line in
  `services/tools/index.js`
- **New repository-analysis signal** (e.g. detecting a testing framework) →
  add a signature set and detection function in `repositoryAnalyzer.service.js`;
  it flows automatically into both the stored `repositorySummary` and the
  summary chunk without touching the chunker, indexer, or graph
- **Swapping the vector store** → `services/vector/vectorStore.service.js` is
  the only file that imports `chromadb`; everything else calls its exported
  functions
