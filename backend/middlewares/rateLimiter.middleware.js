import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

/**
 * General API limiter — mounted globally in app.js.
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

/**
 * Tighter limiter for auth routes to slow down brute-force login/register attempts.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' }
});
