import mongoose from "mongoose";
import { config } from "./env.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("db");
let isConnected = false;

function getDatabaseNameFromUri(uri) {
  try {
    const parsed = new URL(uri);
    const path = parsed.pathname || "";
    if (path && path !== "/") {
      return path.slice(1);
    }
  } catch (err) {
    // Ignore invalid URLs here and let mongoose handle the connection error.
  }
  return null;
}

export async function connectDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  mongoose.set("strictQuery", true);

  const connectOptions = {};
  if (!getDatabaseNameFromUri(config.mongoUri) && config.mongoDbName) {
    connectOptions.dbName = config.mongoDbName;
  }

  try {
    const conn = await mongoose.connect(config.mongoUri, connectOptions);
    isConnected = true;

    log.info(
      `MongoDB connected: ${conn.connection.host}/${conn.connection.name}`,
    );

    mongoose.connection.on("error", (err) => {
      log.error("MongoDB connection error", { message: err.message });
    });

    mongoose.connection.on("disconnected", () => {
      log.warn("MongoDB disconnected");
      isConnected = false;
    });

    return conn.connection;
  } catch (err) {
    log.error("Failed to connect to MongoDB", { message: err.message });
    process.exit(1);
  }
}

export async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}
