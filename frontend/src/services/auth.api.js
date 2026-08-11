import { api } from './api.js';

export async function registerRequest({ name, email, password }) {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data.data;
}

export async function loginRequest({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  return data.data;
}

export async function logoutRequest() {
  await api.post('/auth/logout');
}

export async function meRequest() {
  const { data } = await api.get('/auth/me');
  return data.data;
}
