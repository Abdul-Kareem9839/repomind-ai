import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/projects', label: 'Projects' },
  { to: '/projects/new', label: 'Upload Project' }
];

export default function Sidebar() {
  return (
    <nav className="w-48 shrink-0 border-r border-gray-200 p-4">
      <ul className="space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `block rounded px-2 py-1 ${isActive ? 'bg-gray-200 font-medium' : 'text-gray-600 hover:bg-gray-100'}`
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
