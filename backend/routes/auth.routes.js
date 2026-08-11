import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validateRequest.middleware.js';
import { registerSchema, loginSchema } from '../middlewares/validators/auth.validator.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/register', authLimiter, validateRequest(registerSchema), register);
router.post('/login', authLimiter, validateRequest(loginSchema), login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;
