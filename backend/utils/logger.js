import { config } from "../config/env.js";

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = config.env === "production" ? LEVELS.info : LEVELS.debug;

function timestamp() {
  return new Date().toISOString();
}

function write(level, scope, message, meta) {
  if (LEVELS[level] > currentLevel) return;
  const prefix = `[${timestamp()}] [${level.toUpperCase()}] [${scope}]`;
  if (meta !== undefined) {
    console[level === "debug" ? "log" : level](prefix, message, meta);
  } else {
    console[level === "debug" ? "log" : level](prefix, message);
  }
}

export function createLogger(scope) {
  return {
    error: (message, meta) => write("error", scope, message, meta),
    warn: (message, meta) => write("warn", scope, message, meta),
    info: (message, meta) => write("info", scope, message, meta),
    debug: (message, meta) => write("debug", scope, message, meta),
  };
}

export default createLogger;
