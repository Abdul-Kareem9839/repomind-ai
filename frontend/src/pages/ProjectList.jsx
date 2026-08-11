import React from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects.js';
import ProjectCard from '../components/ProjectCard.jsx';

export default function ProjectList() {
  const { projects, loading, error, remove } = useProjects();

  async function handleDelete(projectId) {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    await remove(projectId);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <Link to="/projects/new" className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
          Upload a project
        </Link>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading projects...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && projects.length === 0 && (
        <p className="text-sm text-gray-500">No projects yet. Upload one to get started.</p>
      )}

      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectCard key={project._id} project={project} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
