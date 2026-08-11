import { api } from './api.js';

export async function listProjectsRequest() {
  const { data } = await api.get('/projects');
  return data.data.projects;
}

export async function getProjectRequest(projectId) {
  const { data } = await api.get(`/projects/${projectId}`);
  return data.data.project;
}

export async function createGithubProjectRequest({ name, repoUrl }) {
  const { data } = await api.post('/projects/github', { name, repoUrl });
  return data.data.project;
}

export async function uploadZipProjectRequest({ name, file }) {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);
  const { data } = await api.post('/projects/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.data.project;
}

export async function deleteProjectRequest(projectId) {
  await api.delete(`/projects/${projectId}`);
}
