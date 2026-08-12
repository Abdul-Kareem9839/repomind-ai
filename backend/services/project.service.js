import fs from "fs-extra";
import path from "path";
import { Project } from "../models/Project.model.js";
import { ApiError } from "../utils/ApiError.js";
import { createLogger } from "../utils/logger.js";
import { config } from "../config/env.js";
import {
  cloneRepository,
  cleanupWorkspace as cleanupGithubWorkspace,
} from "./github/github.service.js";
import {
  extractZip,
  cleanupWorkspace as cleanupZipWorkspace,
} from "./parser/zipExtractor.service.js";
import { parseRepository } from "./parser/fileParser.service.js";
import { analyzeRepository } from "./parser/repositoryAnalyzer.service.js";
import { indexRepository } from "./rag/indexer.service.js";
import { deleteProjectChunks } from "./rag/fileChunk.service.js";
import { deleteCollection } from "./vector/vectorStore.service.js";
import { buildCollectionName } from "../utils/collectionName.js";

const log = createLogger("project.service");
const activeIngestions = new Set();

async function getExistingWorkspace(projectId) {
  const workspacePath = path.join(config.uploads.tempDir, projectId.toString());
  if (!(await fs.pathExists(workspacePath))) {
    return null;
  }

  const entries = await fs.readdir(workspacePath);
  return entries.length > 0 ? workspacePath : null;
}

async function cleanupWorkspace(project) {
  if (project.sourceType === "github") {
    await cleanupGithubWorkspace(project._id);
  } else {
    await cleanupZipWorkspace(project._id);
  }
}

/**
 * Full pipeline for a project that already exists in Mongo (status 'pending'):
 * ingest → parse → analyze → chunk → embed → store in Chroma. Updates status at
 * each stage so the dashboard reflects real progress, and only reaches 'ready'
 * once the project is actually queryable.
 */
async function resolveWorkspacePath(project) {
  const existingWorkspace = await getExistingWorkspace(project._id);
  if (existingWorkspace) {
    return existingWorkspace;
  }

  if (project.sourceType === "github") {
    return await cloneRepository(project.sourceUrl, project._id);
  }

  return await extractZip(project.sourceUrl, project._id);
}

async function runIngestionPipeline(project) {
  const projectId = project._id.toString();
  if (activeIngestions.has(projectId)) {
    log.info("Skipping duplicate ingestion", { projectId });
    return { project };
  }
  activeIngestions.add(projectId);

  log.info("runIngestionPipeline started", {
    projectId,
    sourceType: project.sourceType,
    previousStatus: project.status,
  });

  project.status = "indexing";
  project.failureReason = undefined;
  await project.save();

  try {
    const workspacePath = await resolveWorkspacePath(project);

    const documents = await parseRepository(workspacePath);

    if (documents.length === 0) {
      throw ApiError.badRequest(
        "No supported files were found in this repository (js, jsx, ts, tsx, json, md, html, css, yaml, yml).",
      );
    }

    const repositorySummary = await analyzeRepository(documents, workspacePath);
    const chromaCollectionName = buildCollectionName(project._id);

    const { chunkCount } = await indexRepository({
      projectId: project._id,
      collectionName: chromaCollectionName,
      documents,
      repositorySummary,
    });

    project.fileCount = documents.length;
    project.chunkCount = chunkCount;
    project.repositorySummary = repositorySummary;
    project.chromaCollectionName = chromaCollectionName;
    project.status = "ready";
    await project.save();

    try {
      await cleanupWorkspace(project);
    } catch (cleanupErr) {
      log.warn("cleanupWorkspace failed (non-fatal)", {
        projectId,
        message: cleanupErr.message,
      });
    }

    log.info("runIngestionPipeline completed", {
      projectId,
      status: project.status,
    });
    return { project };
  } catch (err) {
    project.status = "failed";
    project.failureReason = err.message;
    await project.save();
    await cleanupWorkspace(project).catch(() => {});
    log.error("runIngestionPipeline failed", {
      projectId,
      message: err.message,
    });
    throw err;
  } finally {
    activeIngestions.delete(projectId);
  }
}

function startBackgroundIngestion(project) {
  runIngestionPipeline(project)
    .then(({ project: updatedProject }) => {
      log.info("Project indexing completed", {
        projectId: updatedProject._id.toString(),
        status: updatedProject.status,
      });
    })
    .catch((err) => {
      log.error("Project indexing failed", {
        projectId: project._id.toString(),
        message: err?.message || "Unknown error",
      });
    });
}

export async function recoverUnfinishedProjects() {
  const unfinishedProjects = await Project.find({
    status: { $in: ["pending", "indexing"] },
  });

  if (unfinishedProjects.length === 0) {
    log.info("No unfinished projects found at startup");
    return;
  }

  log.info(`Found ${unfinishedProjects.length} unfinished projects`);

  for (const project of unfinishedProjects) {
    const projectId = project._id.toString();
    if (activeIngestions.has(projectId)) {
      log.info("Skipping duplicate recovery ingestion", { projectId });
      continue;
    }

    log.info(`Recovering project ${projectId}...`);
    try {
      await runIngestionPipeline(project);
      log.info(`Recovery completed: ready`, { projectId });
    } catch (err) {
      log.error(`Recovery failed: ${err.message}`, { projectId });
    }
  }
}

export async function createProjectFromGithub({ ownerId, name, repoUrl }) {
  const project = await Project.create({
    owner: ownerId,
    name,
    sourceType: "github",
    sourceUrl: repoUrl,
    status: "pending",
  });

  startBackgroundIngestion(project);
  return { project };
}

export async function createProjectFromZip({ ownerId, name, zipFilePath }) {
  const project = await Project.create({
    owner: ownerId,
    name,
    sourceType: "zip",
    sourceUrl: zipFilePath,
    status: "pending",
  });

  startBackgroundIngestion(project);
  return { project };
}

export async function listProjects(ownerId) {
  return Project.find({ owner: ownerId }).sort({ createdAt: -1 });
}

export async function getProjectById({ ownerId, projectId }) {
  const project = await Project.findOne({ _id: projectId, owner: ownerId });
  if (!project) {
    throw ApiError.notFound("Project not found");
  }
  return project;
}

export async function deleteProject({ ownerId, projectId }) {
  const project = await getProjectById({ ownerId, projectId });

  await Promise.all([
    cleanupGithubWorkspace(project._id),
    cleanupZipWorkspace(project._id),
  ]);
  if (project.chromaCollectionName) {
    await deleteCollection(project.chromaCollectionName);
  }
  await deleteProjectChunks(project._id);

  await project.deleteOne();
  return project;
}

/**
 * Trigger a synchronous reindex of an existing project by its id.
 * Returns the project document once indexing finishes (or throws on error).
 */
export async function reindexProject(projectId) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw ApiError.notFound("Project not found");
  }

  // Prevent duplicate parallel ingestions
  if (activeIngestions.has(projectId.toString())) {
    throw ApiError.badRequest("Ingestion already in progress for this project");
  }

  await runIngestionPipeline(project);
  return project;
}
