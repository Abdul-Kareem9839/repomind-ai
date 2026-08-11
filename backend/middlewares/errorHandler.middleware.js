import { config } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("errorHandler");

export function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  let statusCode = 500;
  let message = "Internal server error";
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err?.name === "ValidationError") {
    // Mongoose validation error
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err?.code === 11000) {
    // Mongo duplicate key
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `${field} already in use`;
  } else if (
    err?.name === "JsonWebTokenError" ||
    err?.name === "TokenExpiredError"
  ) {
    statusCode = 401;
    message = "Invalid or expired authentication token";
  } else if (err?.message) {
    message = err.message;
  }

  // Always log server errors (5xx); log client errors (4xx) only outside
  // production to avoid drowning real logs in expected validation noise.
  if (statusCode >= 500 || config.env !== "production") {
    log.error(`${req.method} ${req.originalUrl} -> ${statusCode}`, {
      message: err?.message,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(config.env !== "production" && err?.stack ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
