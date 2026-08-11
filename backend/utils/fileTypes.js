export const SUPPORTED_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".html",
  ".css",
  ".yaml",
  ".yml",
  ".py",
]);

export const SUPPORTED_FILENAMES = new Set([".env.example"]);

export const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  ".turbo",
  "coverage",
  ".cache",
  "out",
  "vendor",
  "__pycache__",
  ".venv",
]);

export const EXTENSION_TO_LANGUAGE = {
  ".js": "JavaScript",
  ".jsx": "JavaScript (JSX)",
  ".ts": "TypeScript",
  ".tsx": "TypeScript (TSX)",
  ".json": "JSON",
  ".md": "Markdown",
  ".html": "HTML",
  ".css": "CSS",
  ".yaml": "YAML",
  ".yml": "YAML",
};

export const MAX_FILE_SIZE_BYTES = 400 * 1024; // 400 KB

export function isSupportedFile(filename) {
  if (SUPPORTED_FILENAMES.has(filename)) return true;
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = filename.slice(dotIndex).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}

export function detectLanguage(filename) {
  if (SUPPORTED_FILENAMES.has(filename)) return "Config";
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) return "Unknown";
  const ext = filename.slice(dotIndex).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || "Unknown";
}
