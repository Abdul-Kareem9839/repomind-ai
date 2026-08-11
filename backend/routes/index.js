import { Router } from 'express';
import authRoutes from './auth.routes.js';
import projectRoutes from './project.routes.js';
import chatRoutes from './chat.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'RepoMind AI API is running' });
});

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/chat', chatRoutes);

export default router;
