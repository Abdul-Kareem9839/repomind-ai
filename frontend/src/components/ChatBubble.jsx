import React from 'react';

export default function ChatBubble({ role, content, meta }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl whitespace-pre-wrap rounded px-3 py-2 text-sm ${
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        {content}
        {meta && <div className="mt-1 text-xs opacity-60">{meta}</div>}
      </div>
    </div>
  );
}
