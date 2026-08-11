import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createProjectFromGithub,
  createProjectFromZip,
  listProjects,
  getProjectById,
  deleteProject
} from '../services/project.service.js';

export const createFromGithub = asyncHandler(async function createFromGithub(req, res) {
  const { name, repoUrl } = req.body;
  const { project } = await createProjectFromGithub({
    ownerId: req.user._id,
    name,
    repoUrl
  });
  return new ApiResponse(201, { project }, 'Repository imported and indexed').send(res);
});

export const createFromZip = asyncHandler(async function createFromZip(req, res) {
  if (!req.file) {
    throw ApiError.badRequest('A .zip file is required (field name: "file")');
  }
  const { name } = req.body;
  const { project } = await createProjectFromZip({
    ownerId: req.user._id,
    name,
    zipFilePath: req.file.path
  });
  return new ApiResponse(201, { project }, 'Project uploaded and indexed').send(res);
});

export const getProjects = asyncHandler(async function getProjects(req, res) {
  const projects = await listProjects(req.user._id);
  return new ApiResponse(200, { projects }).send(res);
});

export const getProject = asyncHandler(async function getProject(req, res) {
  const project = await getProjectById({ ownerId: req.user._id, projectId: req.params.id });
  return new ApiResponse(200, { project }).send(res);
});

export const removeProject = asyncHandler(async function removeProject(req, res) {
  await deleteProject({ ownerId: req.user._id, projectId: req.params.id });
  return new ApiResponse(200, null, 'Project deleted').send(res);
});
