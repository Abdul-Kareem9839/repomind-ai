import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { askQuestion, getChatHistory } from '../services/chat.service.js';

export const postQuestion = asyncHandler(async function postQuestion(req, res) {
  const { projectId } = req.params;
  const { question } = req.body;

  const chat = await askQuestion({
    ownerId: req.user._id,
    userId: req.user._id,
    projectId,
    question
  });

  return new ApiResponse(201, { chat }, 'Answer generated').send(res);
});

export const getHistory = asyncHandler(async function getHistory(req, res) {
  const { projectId } = req.params;
  const history = await getChatHistory({ ownerId: req.user._id, projectId });
  return new ApiResponse(200, { history }).send(res);
});
