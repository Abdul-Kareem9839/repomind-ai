# Folder Structure

## Backend (`backend/`)

```
backend/
├── server.js               Process entrypoint: ensures runtime dirs exist, connects Mongo, starts Express, handles graceful shutdown
├── app.js                  Express app assembly: middleware stack, route mounting, error handlers — no listening logic here (kept separate from server.js so tests can import the app without binding a port)
├── config/
│   ├── env.js               Reads and validates process.env once; everything else imports `config` from here instead of touching process.env directly
│   ├── db.js                 Mongoose connection
│   ├── chroma.js              Shared ChromaDB client
│   └── multer.js              Disk storage + file-type filter for ZIP uploads
├── models/                  Mongoose schemas: User, Project (with embedded repositorySummary), Chat
├── controllers/              Thin HTTP layer — pull data off req, call a service, wrap the result in ApiResponse. No business logic lives here.
├── services/                 Where the actual logic lives, grouped by concern:
│   ├── auth.service.js        register/login logic, password checks, token issuing
│   ├── project.service.js     orchestrates the full ingestion pipeline (see docs/RAG.md) and project CRUD
│   ├── chat.service.js        runs a question through the LangGraph workflow and persists the result
│   ├── github/                 clones a GitHub URL into a per-project temp workspace
│   ├── parser/                  walks a workspace, reads supported files (fileParser), and derives repositorySummary (repositoryAnalyzer); zipExtractor handles ZIP-specific extraction
│   ├── rag/                      chunker (splits parsed files into retrieval-sized pieces), indexer (chunk → embed → store), retriever (question → top-K context)
│   ├── vector/                    vectorStore.service.js — the only file that talks to ChromaDB directly
│   ├── ai/                        gemini.service.js (plain text generation, used by the analyzer), embeddings.service.js, chatModel.service.js (LangChain-wrapped model used by the graph), promptTemplates.js
│   ├── langgraph/                  the workflow itself — see docs/LANGGRAPH.md
│   └── tools/                       the five function-calling tools, registered in tools/index.js
├── middlewares/               protect (auth), validateRequest (Zod), rateLimiter, errorHandler, upload (multer wrapper), validators/ (one Zod schema file per resource)
├── routes/                    one file per resource, mounted under /api in routes/index.js
├── utils/                     small stateless helpers: ApiResponse/ApiError (response shape), asyncHandler (removes try/catch boilerplate from controllers), token.js (JWT sign/verify), logger.js, collectionName.js, fileTypes.js, tokenEstimator.js, cookieOptions.js
├── uploads/, temp/, chat-history/   runtime directories (git-ignored), created automatically on startup
```

**Why controllers are thin.** Every controller follows the same shape: destructure
`req`, call one service function, wrap the result in `new ApiResponse(...)`. This
means the actual behavior (what "creating a project" does) lives in one place —
`services/project.service.js` — and is independently testable without spinning up
Express. Validation happens even earlier, in middleware, so by the time a
controller runs, `req.body`/`req.params` are already known-good.

**Why services are split this finely** (`rag/`, `vector/`, `ai/`, `parser/`,
`github/` as separate folders rather than one `services/ai.js`). Each folder is a
seam the project's own instructions call out explicitly: new retrieval
strategies, new AI tools, or new repository-analysis features should be addable
without touching unrelated code. `vector/vectorStore.service.js` is deliberately
the *only* file importing `chromadb` — if the vector store were ever swapped
(e.g. for pgvector or Pinecone), that's the one file that changes; nothing in
`rag/` or `langgraph/` knows it's ChromaDB specifically.

## Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── main.jsx / App.jsx      entry + route table
│   ├── pages/                    one file per route: Login, Register, Dashboard, ProjectList, UploadProject, Chat, Profile
│   ├── layouts/                   AuthLayout (login/register), AppLayout (everything behind auth — wraps Navbar + Sidebar)
│   ├── components/                 small presentational pieces: Navbar, Sidebar, ProjectCard, ChatBubble, FileDropzone, ProtectedRoute
│   ├── context/AuthContext.jsx      holds { user, status } and the login/register/logout actions; the single source of truth for "am I logged in"
│   ├── hooks/                        useAuth (context accessor), useProjects, useChat — each hook owns the loading/error state for its resource so pages stay declarative
│   └── services/                      one file per backend resource (auth.api.js, project.api.js, chat.api.js), all built on the shared axios instance in api.js
```

**Why hooks own the state, not the pages.** `useProjects`/`useChat` each expose
`{ data, loading, error, ...actions }`. A page like `ProjectList.jsx` just calls
the hook and renders — if the loading/error handling ever needs to change (e.g.
adding retry logic), it changes in one hook, not in every page that lists
projects.

**Why `services/api.js` is a single shared instance.** One axios instance with
`withCredentials: true` and a 401 interceptor means every other API file
(`auth.api.js`, etc.) is just a thin list of endpoint functions — no repeated
config, and session expiry is handled in exactly one place.
