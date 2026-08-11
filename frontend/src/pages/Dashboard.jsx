import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useProjects } from '../hooks/useProjects.js';

export default function Dashboard() {
  const { user } = useAuth();
  const { projects, loading } = useProjects();

  const readyCount = projects.filter((p) => p.status === 'ready').length;
  const indexingCount = projects.filter((p) => p.status === 'indexing' || p.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome{user ? `, ${user.name}` : ''}</h1>
        <p className="text-sm text-gray-500">Here's an overview of your repositories.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded border border-gray-200 p-4">
          <p className="text-2xl font-semibold">{loading ? '—' : projects.length}</p>
          <p className="text-sm text-gray-500">Total projects</p>
        </div>
        <div className="rounded border border-gray-200 p-4">
          <p className="text-2xl font-semibold">{loading ? '—' : readyCount}</p>
          <p className="text-sm text-gray-500">Ready to chat</p>
        </div>
        <div className="rounded border border-gray-200 p-4">
          <p className="text-2xl font-semibold">{loading ? '—' : indexingCount}</p>
          <p className="text-sm text-gray-500">Indexing</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link to="/projects/new" className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
          Upload a project
        </Link>
        <Link to="/projects" className="rounded border border-gray-300 px-4 py-2 text-sm">
          View all projects
        </Link>
      </div>
    </div>
  );
}
