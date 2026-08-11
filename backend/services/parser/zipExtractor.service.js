import path from 'path';
import fs from 'fs-extra';
import unzipper from 'unzipper';
import { config } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Extracts an uploaded ZIP into a per-project scratch directory, then deletes
 * the original ZIP (per the spec — "delete ZIP after extraction").
 */
export async function extractZip(zipFilePath, projectId) {
  const workspacePath = path.join(config.uploads.tempDir, projectId.toString());
  await fs.remove(workspacePath);
  await fs.ensureDir(workspacePath);

  try {
    await fs
      .createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: workspacePath }))
      .promise();
  } catch (err) {
    await fs.remove(workspacePath);
    throw ApiError.badRequest(`Failed to extract ZIP archive: ${err.message}`);
  } finally {
    await fs.remove(zipFilePath).catch(() => {}); // best-effort cleanup of the upload
  }

  // If the zip contained a single root folder (common case), flatten it so
  // the parser always sees project files directly under workspacePath.
  const entries = await fs.readdir(workspacePath);
  if (entries.length === 1) {
    const onlyEntryPath = path.join(workspacePath, entries[0]);
    const stat = await fs.stat(onlyEntryPath);
    if (stat.isDirectory()) {
      const tempFlatten = `${workspacePath}__flatten`;
      await fs.move(onlyEntryPath, tempFlatten);
      await fs.remove(workspacePath);
      await fs.move(tempFlatten, workspacePath);
    }
  }

  return workspacePath;
}

export async function cleanupWorkspace(projectId) {
  const workspacePath = path.join(config.uploads.tempDir, projectId.toString());
  await fs.remove(workspacePath);
}
