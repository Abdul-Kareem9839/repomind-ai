import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function ProtectedRoute({ children }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return <div className="flex h-screen items-center justify-center text-gray-500">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
