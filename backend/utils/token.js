import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * V1 uses a single access token — no refresh token, no rotation. The token is
 * short-lived enough to be safe but long enough (default 7d) to avoid constant
 * re-logins for a first release. See ARCHITECTURE.md §7 for the reasoning and
 * for where a refresh flow would plug in later.
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}
