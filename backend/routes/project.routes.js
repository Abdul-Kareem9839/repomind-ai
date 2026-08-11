import { Router } from 'express';
import {
  createFromGithub,
  createFromZip,
  getProjects,
  getProject,
  removeProject
} from '../controllers/project.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { uploadZip } from '../middlewares/upload.middleware.js';
import { validateRequest } from '../middlewares/validateRequest.middleware.js';
import {
  createGithubProjectSchema,
  uploadZipProjectSchema,
  projectIdParamSchema
} from '../middlewares/validators/project.validator.js';

const router = Router();

router.use(protect);

router.post('/github', validateRequest(createGithubProjectSchema), createFromGithub);
router.post('/upload', uploadZip, validateRequest(uploadZipProjectSchema), createFromZip);
router.get('/', getProjects);
router.get('/:id', validateRequest(projectIdParamSchema), getProject);
router.delete('/:id', validateRequest(projectIdParamSchema), removeProject);

export default router;
