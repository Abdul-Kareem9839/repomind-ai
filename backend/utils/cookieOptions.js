import { config } from "../config/env.js";

export const authCookieOptions = {
  httpOnly: true,
  secure: config.env === "production",
  sameSite: config.env === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const clearAuthCookieOptions = {
  httpOnly: true,
  secure: config.env === "production",
  sameSite: config.env === "production" ? "none" : "lax",
};
