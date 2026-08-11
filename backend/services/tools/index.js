import { searchFiles, searchFilesSchema } from './searchFiles.tool.js';
import { findFunction, findFunctionSchema } from './findFunction.tool.js';
import { generateReadme, generateReadmeSchema } from './generateReadme.tool.js';
import { generateInterviewQuestions, generateInterviewQuestionsSchema } from './generateInterviewQuestions.tool.js';
import { summarizeProject, summarizeProjectSchema } from './summarizeProject.tool.js';

export const tools = {
  searchFiles: { run: searchFiles, schema: searchFilesSchema },
  findFunction: { run: findFunction, schema: findFunctionSchema },
  generateReadme: { run: generateReadme, schema: generateReadmeSchema },
  generateInterviewQuestions: { run: generateInterviewQuestions, schema: generateInterviewQuestionsSchema },
  summarizeProject: { run: summarizeProject, schema: summarizeProjectSchema }
};

export const toolSchemas = Object.values(tools).map((t) => t.schema);

/** Invokes a registered tool by name with the given args (which includes
 * collectionName/repositorySummary/projectName as needed — see each tool). */
export async function callTool(name, args) {
  const entry = tools[name];
  if (!entry) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return entry.run(args);
}

export default { tools, toolSchemas, callTool };
