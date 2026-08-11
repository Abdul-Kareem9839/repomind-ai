import { useState, useCallback, useEffect } from "react";
import {
  listProjectsRequest,
  createGithubProjectRequest,
  uploadZipProjectRequest,
  deleteProjectRequest,
} from "../services/project.api.js";

export function useProjects({ autoLoad = true } = {}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProjectsRequest();
      setProjects(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) refresh();
  }, [autoLoad, refresh]);

  useEffect(() => {
    if (!autoLoad) return undefined;

    const hasIndexingProjects = projects.some(
      (project) =>
        project.status === "pending" || project.status === "indexing",
    );

    if (!hasIndexingProjects) return undefined;

    const timer = window.setTimeout(() => {
      refresh();
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [autoLoad, projects, refresh]);

  const createFromGithub = useCallback(async ({ name, repoUrl }) => {
    const project = await createGithubProjectRequest({ name, repoUrl });
    setProjects((prev) => [project, ...prev]);
    return project;
  }, []);

  const createFromZip = useCallback(async ({ name, file }) => {
    const project = await uploadZipProjectRequest({ name, file });
    setProjects((prev) => [project, ...prev]);
    return project;
  }, []);

  const remove = useCallback(async (projectId) => {
    await deleteProjectRequest(projectId);
    setProjects((prev) => prev.filter((p) => p._id !== projectId));
  }, []);

  return {
    projects,
    loading,
    error,
    refresh,
    createFromGithub,
    createFromZip,
    remove,
  };
}
