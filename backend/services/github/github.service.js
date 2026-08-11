import path from 'path';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { config } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?\/?$/;

export function isValidGithubUrl(url) {
  return GITHUB_URL_PATTERN.test(url.trim());
}

/**
 * Shallow-clones a GitHub repo into a per-project scratch directory under
 * config.uploads.tempDir. Caller is responsible for calling cleanupWorkspace
 * once parsing/analysis is done.
 */
export async function cloneRepository(repoUrl, projectId) {
  if (!isValidGithubUrl(repoUrl)) {
    throw ApiError.badRequest('Invalid GitHub repository URL. Expected format: https://github.com/user/repo');
  }

  const workspacePath = path.join(config.uploads.tempDir, projectId.toString());
  await fs.remove(workspacePath); // in case of a stale retry
  await fs.ensureDir(workspacePath);

  const git = simpleGit();

  try {
    await git.clone(repoUrl, workspacePath, ['--depth', '1', '--single-branch']);
  } catch (err) {
    await fs.remove(workspacePath);
    throw ApiError.badRequest(`Failed to clone repository: ${err.message}`);
  }

  return workspacePath;
}

export async function cleanupWorkspace(projectId) {
  const workspacePath = path.join(config.uploads.tempDir, projectId.toString());
  await fs.remove(workspacePath);
}
