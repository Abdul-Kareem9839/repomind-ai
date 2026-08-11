import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects.js';
import FileDropzone from '../components/FileDropzone.jsx';

export default function UploadProject() {
  const { createFromGithub, createFromZip } = useProjects({ autoLoad: false });
  const navigate = useNavigate();

  const [mode, setMode] = useState('github'); // 'github' | 'zip'
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'github') {
        await createFromGithub({ name, repoUrl });
      } else {
        if (!file) throw new Error('Please choose a .zip file');
        await createFromZip({ name, file });
      }
      navigate('/projects');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Upload a project</h1>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode('github')}
          className={`rounded px-3 py-1 ${mode === 'github' ? 'bg-gray-900 text-white' : 'border border-gray-300'}`}
        >
          GitHub URL
        </button>
        <button
          type="button"
          onClick={() => setMode('zip')}
          className={`rounded px-3 py-1 ${mode === 'zip' ? 'bg-gray-900 text-white' : 'border border-gray-300'}`}
        >
          ZIP Upload
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label className="block text-sm text-gray-700">Project name</label>
          <input
            type="text"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {mode === 'github' ? (
          <div>
            <label className="block text-sm text-gray-700">Repository URL</label>
            <input
              type="url"
              required
              placeholder="https://github.com/user/repo"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm text-gray-700">ZIP file</label>
            <div className="mt-1">
              <FileDropzone file={file} onChange={setFile} />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? 'Uploading and indexing...' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
