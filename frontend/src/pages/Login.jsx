import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-sm text-gray-700">Email</label>
        <input
          type="email"
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-700">Password</label>
        <input
          type="password"
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Log in'}
      </button>
      <p className="text-center text-sm text-gray-600">
        No account?{' '}
        <Link to="/register" className="text-blue-600 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}
