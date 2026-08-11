# RepoMind AI

RepoMind AI is an AI-powered repository intelligence assistant. A user connects a
GitHub repository URL or uploads a `.zip` of a project, RepoMind parses and indexes
it with Retrieval-Augmented Generation (RAG), and the user then chats with the
project: architecture questions, code-flow tracing, bug analysis, documentation
generation, interview-question generation, and general Q&A — all grounded in the
actual repository content instead of the model's memory.

The backend is the focus of this project and is production-quality: modular
Express/MongoDB architecture, real RAG pipeline (local embeddings + ChromaDB,
Gemini chat), and a LangGraph workflow that routes each question to a
purpose-built retrieval strategy. The frontend is intentionally minimal — plain
React + Tailwind, no component libraries, no animations — since it exists to
exercise the API, not to be the deliverable.

## Stack

| Layer     | Technology                                                          |
| --------- | ------------------------------------------------------------------- |
| Frontend  | React, Vite, Tailwind CSS, React Router, Axios                      |
| Backend   | Node.js, Express, MongoDB/Mongoose, JWT + bcrypt                    |
| AI / RAG  | LangChain JS, LangGraph JS, Gemini chat, local embeddings, ChromaDB |
| Ingestion | simple-git (GitHub clone), unzipper (ZIP upload), fs-extra          |

## Repository layout

```
repomind-ai/
├── backend/     Express API — see docs/FOLDER_STRUCTURE.md
├── frontend/    Minimal React client
└── docs/        Everything below
```

## Documentation index

- [`docs/INSTALLATION.md`](docs/INSTALLATION.md) — get both services running locally
- [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) — every environment variable, explained
- [`docs/API.md`](docs/API.md) — full REST API reference
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, request lifecycle, key decisions
- [`docs/FOLDER_STRUCTURE.md`](docs/FOLDER_STRUCTURE.md) — what each folder/module is responsible for
- [`docs/RAG.md`](docs/RAG.md) — how repository ingestion, chunking, embedding, and retrieval work
- [`docs/LANGGRAPH.md`](docs/LANGGRAPH.md) — the planner → retrieval → answer graph, node by node

## Quick start

```bash
# Backend
cd backend
cp .env.example .env      # fill in JWT_SECRET and GEMINI_API_KEY at minimum
npm install
npm run dev                # http://localhost:5000

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

You'll also need MongoDB and ChromaDB running locally (or reachable via
`MONGO_URI` / `CHROMA_URL`). See [`docs/INSTALLATION.md`](docs/INSTALLATION.md) for
the full walkthrough, including how to run both with Docker.

## Status

This is a first release (V1). Known, intentional simplifications — not bugs — are
called out in `docs/ARCHITECTURE.md` under "Deliberate V1 trade-offs" (e.g.
single-token JWT auth with no refresh flow, synchronous ingestion on upload).
"# repomind-ai" 
