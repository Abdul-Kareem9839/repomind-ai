import { StateGraph, END } from "@langchain/langgraph";
import { graphChannels } from "./state.js";
import { plannerNode } from "./nodes/planner.node.js";
import { architectureRetrievalNode } from "./nodes/architectureRetrieval.node.js";
import { codeFlowRetrievalNode } from "./nodes/codeFlowRetrieval.node.js";
import { bugAnalysisRetrievalNode } from "./nodes/bugAnalysisRetrieval.node.js";
import { documentationRetrievalNode } from "./nodes/documentationRetrieval.node.js";
import { answerNode } from "./nodes/answer.node.js";
import { routeByQueryType } from "./router.js";

/**
 * Builds and compiles the graph once per process. See ARCHITECTURE.md §6 for
 * the full design: planner classifies the question into one of five
 * categories, each with its own retrieval node, all converging on answerNode.
 *
 * Extending this later (a sixth category, a tool node inserted into an
 * existing category's path) means adding a node + wiring its edges here —
 * existing nodes are untouched, which is the whole point of the per-category
 * design over one generic retrieve-then-answer chain.
 */
function buildGraph() {
  const workflow = new StateGraph({ channels: graphChannels });

  workflow.addNode("planner", plannerNode);
  workflow.addNode("architectureRetrieval", architectureRetrievalNode);
  workflow.addNode("codeFlowRetrieval", codeFlowRetrievalNode);
  workflow.addNode("bugAnalysisRetrieval", bugAnalysisRetrievalNode);
  workflow.addNode("documentationRetrieval", documentationRetrievalNode);
  workflow.addNode("generateAnswer", answerNode);

  workflow.setEntryPoint("planner");

  workflow.addConditionalEdges("planner", routeByQueryType, {
    architectureRetrieval: "architectureRetrieval",
    codeFlowRetrieval: "codeFlowRetrieval",
    bugAnalysisRetrieval: "bugAnalysisRetrieval",
    documentationRetrieval: "documentationRetrieval",
    generateAnswer: "generateAnswer",
  });

  workflow.addEdge("architectureRetrieval", "generateAnswer");
  workflow.addEdge("codeFlowRetrieval", "generateAnswer");
  workflow.addEdge("bugAnalysisRetrieval", "generateAnswer");
  workflow.addEdge("documentationRetrieval", "generateAnswer");
  workflow.addEdge("generateAnswer", END);

  return workflow.compile();
}

let compiledGraph = null;

function getGraph() {
  if (!compiledGraph) {
    compiledGraph = buildGraph();
  }
  return compiledGraph;
}

/**
 * Runs the full workflow for one question and returns the final state.
 * This is what services/chat.service.js (step 15) calls. projectName and
 * repositorySummary are passed straight from the caller's already-loaded
 * Project document — the graph itself never touches Mongo.
 */
export async function runRepoMindWorkflow({
  projectId,
  collectionName,
  projectName,
  repositorySummary,
  question,
}) {
  const graph = getGraph();

  const finalState = await graph.invoke({
    projectId,
    collectionName,
    projectName,
    repositorySummary,
    question,
  });

  return finalState;
}

export default runRepoMindWorkflow;
