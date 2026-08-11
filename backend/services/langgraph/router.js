/**
 * Conditional edge function used after plannerNode. general_chat skips
 * retrieval entirely and goes straight to answer (see ARCHITECTURE.md §6) —
 * every other category has its own retrieval node.
 */
export function routeByQueryType(state) {
  switch (state.queryType) {
    case "architecture":
      return "architectureRetrieval";
    case "code_flow":
      return "codeFlowRetrieval";
    case "bug_analysis":
      return "bugAnalysisRetrieval";
    case "documentation":
      return "documentationRetrieval";
    case "general_chat":
    default:
      return "generateAnswer";
  }
}

export default routeByQueryType;
