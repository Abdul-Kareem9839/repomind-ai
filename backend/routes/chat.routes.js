import { Router } from 'express';
import { postQuestion, getHistory } from '../controllers/chat.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validateRequest.middleware.js';
import { askQuestionSchema, chatHistoryParamSchema } from '../middlewares/validators/chat.validator.js';

const router = Router();

router.use(protect);

router.post('/:projectId', validateRequest(askQuestionSchema), postQuestion);
router.get('/history/:projectId', validateRequest(chatHistoryParamSchema), getHistory);

export default router;
