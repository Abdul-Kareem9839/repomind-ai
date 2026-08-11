import { verifyAccessToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Reads the JWT from the httpOnly cookie (preferred) or Authorization header
 * (fallback, useful for non-browser clients), verifies it, and attaches the
 * authenticated user to req.user. V1 is access-token-only — see
 * ARCHITECTURE.md §7 — so an expired token simply means "log in again".
 */
export const protect = asyncHandler(async function protect(req, res, next) {
  const tokenFromCookie = req.cookies?.token;
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    throw ApiError.unauthorized('Authentication required');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired session, please log in again');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }

  req.user = user;
  next();
});

export default protect;
