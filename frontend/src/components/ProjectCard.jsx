import React from 'react';
import { Link } from 'react-router-dom';

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-700',
  indexing: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700'
};

export default function ProjectCard({ project, onDelete }) {
  return (
    <div className="flex items-center justify-between rounded border border-gray-200 p-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{project.name}</span>
          <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLES[project.status] || 'bg-gray-100'}`}>
            {project.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {project.sourceType === 'github' ? project.sourceUrl : 'Uploaded ZIP'}
          {project.fileCount ? ` · ${project.fileCount} files` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {project.status === 'ready' && (
          <Link to={`/projects/${project._id}/chat`} className="text-blue-600 hover:underline">
            Chat
          </Link>
        )}
        <button onClick={() => onDelete(project._id)} className="text-red-600 hover:underline">
          Delete
        </button>
      </div>
    </div>
  );
}
