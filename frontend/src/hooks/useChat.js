import { useState, useCallback, useEffect } from 'react';
import { askQuestionRequest, getChatHistoryRequest } from '../services/chat.api.js';

export function useChat(projectId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getChatHistoryRequest(projectId)
      .then(setMessages)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load chat history'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const send = useCallback(
    async (question) => {
      setSending(true);
      setError(null);
      try {
        const chat = await askQuestionRequest({ projectId, question });
        setMessages((prev) => [...prev, chat]);
        return chat;
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to get an answer');
        throw err;
      } finally {
        setSending(false);
      }
    },
    [projectId]
  );

  return { messages, loading, sending, error, send };
}
