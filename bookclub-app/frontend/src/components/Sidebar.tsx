import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;

  const baseLink = 'flex items-center px-3 py-2 rounded-md text-sm font-medium';
  const active = 'bg-indigo-600 text-white';
  const inactive = 'text-gray-700 hover:bg-gray-100';

  return (
    <aside className="w-56 bg-white border-r border-gray-200 p-4 hidden md:block">
      <nav className="space-y-1">
        <NavLink
          to="/library"
          className={({ isActive }) => `${baseLink} ${isActive ? active : inactive}`}
        >
          📚 Browse Our Library
        </NavLink>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `${baseLink} ${isActive ? active : inactive}`}
        >
          All Books
        </NavLink>
        <NavLink
          to="/my-books"
          className={({ isActive }) => `${baseLink} ${isActive ? active : inactive}`}
        >
          My Books
        </NavLink>
        <NavLink
          to="/clubs"
          className={({ isActive }) => `${baseLink} ${isActive ? active : inactive}`}
        >
          My Clubs
        </NavLink>
        <NavLink
          to="/messages"
          className={({ isActive }) => `${baseLink} ${isActive ? active : inactive}`}
        >
          Messages
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
