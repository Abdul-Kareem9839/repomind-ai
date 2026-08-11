# How the LangGraph Workflow Works

Every chat question runs through a compiled LangGraph `StateGraph`
(`services/langgraph/graph.js`), called once per question from
`services/chat.service.js`. This is the piece the whole project's instructions
call "the heart of the application" — it's what decides *how* to answer a
question, not just *that* it should be answered.

```
                    ┌─────────────┐
   question ──────► │   planner   │
                    └──────┬──────┘
                           │ routeByQueryType
        ┌──────────┬───────┼────────┬────────────┐
        ▼          ▼       ▼        ▼             ▼
  architecture  code_flow  bug   documentation  (general_chat
  Retrieval     Retrieval  Analysis  Retrieval    skips straight
                           Retrieval               to answer)
        └──────────┴───────┴────────┴────────────┘
                           │
                           ▼
                       ┌────────┐
                       │ answer │ ──► final answer text
                       └────────┘
```

## Shared state (`services/langgraph/state.js`)

The graph carries one state object through every node:
`projectId, collectionName, projectName, repositorySummary, question, queryType,
retrievedChunks, toolResult, toolsUsed, answer`. Every channel uses the same
reducer — "last write wins, otherwise keep the previous value" — so a node only
needs to return the fields it actually changes; everything else passes through
untouched.

## 1. Planner (`nodes/planner.node.js`)

Classifies the question into one of five categories:
`architecture | code_flow | bug_analysis | documentation | general_chat`.

Classification is two-tiered:

1. **Keyword rules first** (fast, free, deterministic) — regex patterns like
   `/\b(bug|error|crash|fails?|broken|fix|exception|stack trace|debug)\b/i` for
   `bug_analysis`, or `/\b(readme|documentation|interview questions?)\b/i` for
   `documentation`. Most real questions hit one of these and never touch the
   LLM.
2. **LLM fallback** for anything ambiguous — a single Gemini call
   (`temperature: 0`) asked to output exactly one category name, nothing else.
   If no API key is configured, or the model returns something unexpected, the
   question defaults to `general_chat` rather than failing the request.

## 2. Router (`services/langgraph/router.js`)

A plain conditional-edge function — no LLM, no I/O — that maps `queryType` to
the next node. `general_chat` is the one category with no dedicated retrieval
node; it goes straight to `answer`, since "doesn't need the repository's code"
is the definition the planner uses for that category.

## 3. Retrieval nodes

Each category gets its own retrieval strategy, not a shared generic one —
this is the main design decision the graph exists to express.

**`architectureRetrieval`** — fetches the repository summary chunk directly (one
metadata lookup, no embedding call needed). Only runs a supplementary
similarity search on top of that if the question references something specific
(a file extension, a path segment, "folder", "directory") that the high-level
summary likely doesn't cover.

**`codeFlowRetrieval`** — a similarity search (`topK: 6`) for the question,
then a second pass: for each result, it reads that chunk's `imports` metadata,
resolves each relative import specifier against candidate file extensions
(`.js .jsx .ts .tsx /index.js /index.ts`), and looks those up directly by
metadata match. This is what lets an answer describe flow *across* files ("the
login handler calls X, which is defined in Y") instead of only ever seeing one
isolated chunk.

**`bugAnalysisRetrieval`** — a broad similarity search (`topK: 10`), plus a tool
call when the question is specific enough to search for directly: if it
contains something that looks like a function call (`someFunc(`), it calls the
**`findFunction`** tool; else if it names a specific file (`auth.controller.js`),
it calls **`searchFiles`**.

**`documentationRetrieval`** — deliberately wide retrieval (summary chunk +
`topK: 15` similarity search), since documentation questions need whole-project
coverage rather than a narrow match. On top of that, if the question clearly
asks for a specific generated artifact, the matching tool runs and its output is
handed to `answer` alongside the retrieved context: "readme" → **`generateReadme`**,
"interview questions" → **`generateInterviewQuestions`**, "summar(y/ize)" →
**`summarizeProject`**.

## 4. Answer (`nodes/answer.node.js`)

Every path converges here. It:

1. Picks a prompt template from `services/ai/promptTemplates.js` by
   `queryType` (falling back to the `general_chat` template for anything
   unrecognized)
2. Flattens `retrievedChunks` into one context string via
   `retriever.service.js`'s `buildContext` — or explicitly tells the model "No
   repository context was retrieved for this question" if there's nothing,
   rather than silently prompting without context
3. Passes `toolResult` (JSON-stringified, or the literal string `"none"`) into
   the prompt too, so a tool's output (e.g. a generated README) is available to
   shape the final answer rather than being returned raw
4. Invokes the LangChain-wrapped chat model (`chatModel.service.js`) via LCEL
   (`template.pipe(model)`) and returns the resulting text as `answer`

`services/chat.service.js` then persists `{ question, queryType, retrievedChunks,
toolsUsed, answer }` as a `Chat` document and returns it to the controller.

## The five tools (`services/tools/`)

Registered in `services/tools/index.js` and invoked by category-specific nodes
via `callTool(name, args)`:

| Tool | Used by | What it does |
|---|---|---|
| `searchFiles` | bug_analysis | Similarity search wrapper — natural-language query in, ranked file matches out |
| `findFunction` | bug_analysis | Exact metadata match on `symbolName` first; falls back to a semantic search for the name if nothing exact is found (handles methods and near-miss names the chunker didn't tag exactly) |
| `generateReadme` | documentation | Broad context retrieval + repository summary facts → one Gemini call producing a full README.md |
| `generateInterviewQuestions` | documentation | Retrieves core-logic/architecture/auth context → Gemini generates N question+answer pairs grounded in the actual code |
| `summarizeProject` | documentation | No retrieval, no LLM call — just re-surfaces the `repositorySummary` already computed once at ingestion time |

## Extending the graph

Per the project's own design goal, adding a sixth category means: write a new
node file, add a keyword rule (and/or extend the classification prompt) in
`planner.node.js`, add a case in `router.js`, register the node and its edge
to `answer` in `graph.js`. No existing node needs to change. The same is true
for tools — a new one is a new file plus one line in `tools/index.js`; nodes
that don't call it are unaffected.
