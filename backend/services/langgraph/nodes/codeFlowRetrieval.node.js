import path from 'path';
import { retrieveChunks } from '../../rag/retriever.service.js';
import { getByMetadata } from '../../vector/vectorStore.service.js';

const CANDIDATE_EXTENSIONS = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.ts'];

/** Resolves a relative import specifier against the importing file's directory
 * into a handful of candidate repo-relative filepaths (we don't know the real
 * extension without hitting the filesystem, which is gone by chat time — so we
 * generate the plausible variants and let the metadata lookup confirm which
 * ones actually exist as indexed chunks). */
function resolveCandidatePaths(importerFilepath, importSpecifier) {
  if (!importSpecifier.startsWith('.')) return []; // skip node_modules/package imports
  const importerDir = path.dirname(importerFilepath);
  const resolvedBase = path.normalize(path.join(importerDir, importSpecifier)).split(path.sep).join('/');
  return CANDIDATE_EXTENSIONS.map((ext) => `${resolvedBase}${ext}`);
}

/**
 * codeFlowRetrievalNode — similarity search scoped to what the question names,
 * then a second pass that follows each result's `imports` metadata one hop to
 * pull in the files it directly depends on, so the answer can describe flow
 * across files rather than one isolated chunk. See ARCHITECTURE.md §6.
 */
export async function codeFlowRetrievalNode(state) {
  const primary = await retrieveChunks({
    collectionName: state.collectionName,
    question: state.question,
    topK: 6
  });

  const candidatePaths = new Set();
  for (const chunk of primary) {
    const importSpecifiers = (chunk.metadata?.imports || '').split(',').filter(Boolean);
    for (const spec of importSpecifiers) {
      for (const candidate of resolveCandidatePaths(chunk.filepath, spec)) {
        candidatePaths.add(candidate);
      }
    }
  }

  let followed = [];
  if (candidatePaths.size > 0) {
    const results = await getByMetadata(
      state.collectionName,
      { filepath: { $in: [...candidatePaths] } },
      10
    );
    followed = results.map((r) => ({
      filepath: r.metadata?.filepath,
      snippet: r.content,
      score: null,
      metadata: { ...r.metadata, relation: 'imported-by-result' }
    }));
  }

  // De-dupe by filepath+chunkIndex in case the import-following pass rediscovers
  // something already in the primary results.
  const seen = new Set(primary.map((c) => `${c.filepath}::${c.metadata?.chunkIndex}`));
  const deduped = followed.filter((c) => !seen.has(`${c.filepath}::${c.metadata?.chunkIndex}`));

  return { retrievedChunks: [...primary, ...deduped] };
}

export default codeFlowRetrievalNode;
