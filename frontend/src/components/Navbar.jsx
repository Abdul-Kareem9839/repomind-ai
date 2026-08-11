import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <Link to="/" className="font-semibold">
        RepoMind AI
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user && <span className="text-gray-600">{user.name}</span>}
        <Link to="/profile" className="text-gray-600 hover:text-gray-900">
          Profile
        </Link>
        <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
          Logout
        </button>
      </div>
    </header>
  );
}
