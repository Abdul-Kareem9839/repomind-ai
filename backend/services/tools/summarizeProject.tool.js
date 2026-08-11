export const summarizeProjectSchema = {
  name: 'summarizeProject',
  description: 'Returns a high-level summary of the repository: stack, structure, auth, database, and routes.',
  parameters: { type: 'object', properties: {} }
};

/**
 * The repository summary is already computed once at index time (see
 * services/parser/repositoryAnalyzer.service.js) and stored on the Project
 * document — this tool just surfaces it rather than recomputing anything.
 */
export async function summarizeProject({ repositorySummary, projectName }) {
  if (!repositorySummary) {
    return { tool: 'summarizeProject', summary: `No repository summary is available yet for ${projectName || 'this project'}.` };
  }

  return {
    tool: 'summarizeProject',
    projectName,
    summary: repositorySummary.summary,
    frameworks: repositorySummary.frameworks,
    languages: repositorySummary.languages,
    database: repositorySummary.database,
    authentication: repositorySummary.authentication,
    routeCount: repositorySummary.routes?.length || 0
  };
}

export default summarizeProject;
