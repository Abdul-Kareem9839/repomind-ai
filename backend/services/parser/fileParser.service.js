import path from 'path';
import fs from 'fs-extra';
import {
  IGNORED_DIRS,
  isSupportedFile,
  detectLanguage,
  MAX_FILE_SIZE_BYTES
} from '../../utils/fileTypes.js';

/**
 * Recursively walks rootPath, skipping IGNORED_DIRS, and returns structured
 * documents for every supported file — ready for repositoryAnalyzer and, after
 * that, chunking. Binary files and anything past MAX_FILE_SIZE_BYTES are skipped
 * rather than read, so a stray minified bundle can't blow up the pipeline.
 */
export async function parseRepository(rootPath) {
  const documents = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile() || !isSupportedFile(entry.name)) continue;

      let stat;
      try {
        stat = await fs.stat(absolutePath);
      } catch {
        continue; // broken symlink etc.
      }
      if (stat.size === 0 || stat.size > MAX_FILE_SIZE_BYTES) continue;

      let content;
      try {
        content = await fs.readFile(absolutePath, 'utf-8');
      } catch {
        continue; // likely binary despite the extension
      }

      const relativePath = path.relative(rootPath, absolutePath).split(path.sep).join('/');

      documents.push({
        filepath: relativePath,
        absolutePath,
        filename: entry.name,
        language: detectLanguage(entry.name),
        content,
        sizeBytes: stat.size
      });
    }
  }

  await walk(rootPath);
  return documents;
}

export default parseRepository;
