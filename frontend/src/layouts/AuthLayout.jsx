import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded border border-gray-200 bg-white p-6">
        <h1 className="mb-4 text-center text-lg font-semibold">RepoMind AI</h1>
        <Outlet />
      </div>
    </div>
  );
}
