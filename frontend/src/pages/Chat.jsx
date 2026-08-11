import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useChat } from '../hooks/useChat.js';
import { getProjectRequest } from '../services/project.api.js';
import ChatBubble from '../components/ChatBubble.jsx';

export default function Chat() {
  const { id: projectId } = useParams();
  const { messages, loading, sending, error, send } = useChat(projectId);
  const [question, setQuestion] = useState('');
  const [project, setProject] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    getProjectRequest(projectId).then(setProject).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question;
    setQuestion('');
    await send(q).catch(() => {});
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3">
        <h1 className="text-lg font-semibold">{project?.name || 'Chat'}</h1>
        <p className="text-sm text-gray-500">Ask anything about this repository.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded border border-gray-200 p-4">
        {loading && <p className="text-sm text-gray-500">Loading conversation...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-gray-500">
            No messages yet — try asking "Explain the project architecture" or "How does login work?"
          </p>
        )}
        {messages.map((chat) => (
          <React.Fragment key={chat._id}>
            <ChatBubble role="user" content={chat.question} />
            <ChatBubble role="assistant" content={chat.answer} meta={chat.queryType} />
          </React.Fragment>
        ))}
        {sending && <ChatBubble role="assistant" content="Thinking..." />}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this repository..."
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
