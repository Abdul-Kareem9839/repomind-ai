import fs from "fs-extra";
import app from "./app.js";
import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createLogger } from "./utils/logger.js";
import { recoverUnfinishedProjects } from "./services/project.service.js";

const log = createLogger("server");

async function ensureRuntimeDirs() {
  await Promise.all([
    fs.ensureDir(config.uploads.dir),
    fs.ensureDir(config.uploads.tempDir),
    fs.ensureDir(config.uploads.chatHistoryDir),
  ]);
}

async function start() {
  await ensureRuntimeDirs();
  await connectDB();
  await recoverUnfinishedProjects();

  const server = app.listen(config.port, () => {
    log.info(
      `RepoMind AI API listening on port ${config.port} (${config.env})`,
    );
  });

  const shutdown = (signal) => {
    log.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      log.info("Closed remaining connections.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  log.error("Failed to start", { message: err.message });
  process.exit(1);
});
