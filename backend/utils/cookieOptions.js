import { config } from "../config/env.js";

// Vercel (frontend) and Render (backend) are different eTLD+1 domains, so this
// is inherently a cross-site cookie. SameSite=None + Secure alone is no longer
// sufficient: Chrome's third-party-cookie phase-out (and Safari ITP / Firefox
// ETP before it) will silently accept the Set-Cookie header on the response
// (which is why curl and server logs looked correct) but then refuse to
// persist/send it back on subsequent requests, since it treats a cookie set
// by a cross-site XHR/fetch target as third-party. `Partitioned` (CHIPS) opts
// the cookie into a per-top-level-site partition, which browsers still honor
// for exactly this "single SPA origin talking to one API origin" pattern.
const isProd = config.env === "production";

export const authCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  ...(isProd ? { partitioned: true } : {}),
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const clearAuthCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  ...(isProd ? { partitioned: true } : {}),
};
