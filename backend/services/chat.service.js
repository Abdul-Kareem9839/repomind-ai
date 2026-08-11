import { Project } from '../models/Project.model.js';
import { Chat } from '../models/Chat.model.js';
import { ApiError } from '../utils/ApiError.js';
import { runRepoMindWorkflow } from './langgraph/graph.js';

async function getReadyProject({ ownerId, projectId }) {
  const project = await Project.findOne({ _id: projectId, owner: ownerId });
  if (!project) {
    throw ApiError.notFound('Project not found');
  }
  if (project.status !== 'ready') {
    throw ApiError.badRequest(
      project.status === 'failed'
        ? `This project failed to index: ${project.failureReason || 'unknown error'}`
        : `This project is still ${project.status} — try again once indexing finishes.`
    );
  }
  return project;
}

export async function askQuestion({ ownerId, userId, projectId, question }) {
  const project = await getReadyProject({ ownerId, projectId });

  const result = await runRepoMindWorkflow({
    projectId: project._id.toString(),
    collectionName: project.chromaCollectionName,
    question,
    projectName: project.name,
    repositorySummary: project.repositorySummary
  });

  const chat = await Chat.create({
    project: project._id,
    user: userId,
    question,
    queryType: result.queryType || 'general_chat',
    retrievedChunks: (result.retrievedChunks || []).map((c) => ({
      filepath: c.filepath,
      snippet: c.snippet,
      score: c.score
    })),
    toolsUsed: result.toolsUsed || [],
    answer: result.answer || 'No answer was generated.'
  });

  return chat;
}

export async function getChatHistory({ ownerId, projectId }) {
  // getReadyProject also enforces ownership; history can still be read for a
  // project that isn't 'ready' (e.g. to see chats from before a re-index).
  const project = await Project.findOne({ _id: projectId, owner: ownerId });
  if (!project) {
    throw ApiError.notFound('Project not found');
  }

  return Chat.find({ project: project._id }).sort({ createdAt: 1 });
}
