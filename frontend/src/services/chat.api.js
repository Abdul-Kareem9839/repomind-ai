import { api } from './api.js';

export async function askQuestionRequest({ projectId, question }) {
  const { data } = await api.post(`/chat/${projectId}`, { question });
  return data.data.chat;
}

export async function getChatHistoryRequest(projectId) {
  const { data } = await api.get(`/chat/history/${projectId}`);
  return data.data.history;
}
