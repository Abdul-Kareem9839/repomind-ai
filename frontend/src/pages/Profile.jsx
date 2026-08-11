import React from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Profile</h1>
      <div className="rounded border border-gray-200 p-4 text-sm">
        <p>
          <span className="text-gray-500">Name:</span> {user.name}
        </p>
        <p className="mt-2">
          <span className="text-gray-500">Email:</span> {user.email}
        </p>
        <p className="mt-2">
          <span className="text-gray-500">Joined:</span>{' '}
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
        </p>
      </div>
    </div>
  );
}
