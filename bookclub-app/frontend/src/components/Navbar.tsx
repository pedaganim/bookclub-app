import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { LIBRARY_CONFIGS } from '../config/libraryConfig';
import { useSubdomain } from '../hooks/useSubdomain';
import { config } from '../config';

import MobileTabBar from './MobileTabBar';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSubdomain, club } = useSubdomain();
  const [librariesOpen, setLibrariesOpen] = useState(false);
  const librariesRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (librariesRef.current && !librariesRef.current.contains(e.target as Node)) {
        setLibrariesOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setLibrariesOpen(false); }, [location.pathname]);

  // Simple inline SVG icons
  const Icon = {
    Book: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M4 6.75A2.25 2.25 0 0 1 6.25 4.5h11.5A2.25 2.25 0 0 1 20 6.75v11.25a.75.75 0 0 1-1.2.6c-.8-.6-1.79-.9-2.8-.9H6.25A2.25 2.25 0 0 1 4 15.45V6.75z" />
        <path d="M7.5 7.5h7.5M7.5 10.5h7.5" strokeLinecap="round" />
      </svg>
    ),
    GridApps: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    ChevronDown: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    ),
    Plus: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    ),
    Chat: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5A2.25 2.25 0 0 1 19.5 6.75v6A2.25 2.25 0 0 1 17.25 15H9l-3.75 3V6.75z" />
      </svg>
    ),
    User: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <path d="M4 19.25C4 16.9 7.58 15 12 15s8 1.9 8 4.25V20H4v-.75z" />
      </svg>
    ),
    Users: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  };

  // All library entries for the dropdown (Book Library + dynamic libraries)
  const dropdownLibraries = [
    { label: 'Book Library', emoji: '📚', route: '/library/books', accentBg: 'bg-amber-50', accentText: 'text-amber-700' },
  ];

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 gap-3">
              <Link to="/" className="flex items-center flex-shrink-0">
                <img
                  src={`${process.env.PUBLIC_URL || ''}/logo.png`}
                  alt="Community Library"
                  className="h-8 w-auto"
                />
              </Link>
              {isSubdomain && club && (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900 leading-tight">{club.name}</span>
                  <a 
                    href={config.apiBaseUrl.replace('api.', '')} 
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    ← Global Hub
                  </a>
                </div>
              )}
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {/* Libraries dropdown */}
              <div ref={librariesRef} className="relative">
                <button
                  onClick={() => setLibrariesOpen((o) => !o)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    librariesOpen ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Browse Libraries
                  <span className={`transition-transform duration-200 ${librariesOpen ? 'rotate-180' : ''}`}>
                    <Icon.ChevronDown />
                  </span>
                </button>

                {/* Mega-menu dropdown */}
                {librariesOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">Libraries</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {dropdownLibraries.map((lib) => (
                        <Link
                          key={lib.route}
                          to={lib.route}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors hover:${lib.accentBg} ${lib.accentBg} group`}
                        >
                          <span className="text-xl flex-shrink-0">{lib.emoji}</span>
                          <span className={`text-xs font-medium leading-tight ${lib.accentText}`}>{lib.label}</span>
                        </Link>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <Link
                        to="/library"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <span>🏛️</span> View all libraries
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <span className="w-px h-5 bg-gray-200 mx-1" />

              {/* Individual library links */}
              <Link to="/library/books" className="px-2.5 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-amber-700 hover:bg-amber-50 transition-colors">
                📚 Books
              </Link>

              {/* Divider */}
              <span className="w-px h-5 bg-gray-200 mx-1" />


              {isAuthenticated && (
                <>
                  <Link to="/my-books" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                    My Books
                  </Link>
                  <Link to="/clubs" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                    Clubs
                  </Link>
                  <MessagesLinkWithUnread />
                </>
              )}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={`${user.name}'s avatar`} className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-xs font-semibold text-indigo-700">{user?.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                    )}
                    <span>Profile</span>
                  </Link>
                  
                  {/* Moved here */}
                  <Link to="/about" className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors">
                    About
                  </Link>
                  <Link to="/about/blogs" className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors">
                    Blogs
                  </Link>

                  <button onClick={logout} className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/about" className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors">About</Link>
                  <Link to="/about/blogs" className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors mr-2">Blogs</Link>
                  <a 
                    href={`${config.apiBaseUrl.replace('api.', '')}/login`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                  >
                    Sign In
                  </a>
                </>
              )}
            </div>

            {/* Mobile top bar */}
            <div className="md:hidden flex items-center gap-2">
              <Link to="/about" className="text-xs font-medium text-gray-700 hover:text-gray-900 px-2 py-1">About</Link>
              <Link to="/about/blogs" className="text-xs font-medium text-gray-700 hover:text-gray-900 px-2 py-1">Blogs</Link>
              {isAuthenticated && (
                <>
                  <Link to="/my-books" className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 bg-indigo-50 rounded-md">My Books</Link>
                  <Link to="/profile" className="text-xs font-medium text-gray-700 hover:text-gray-900 px-2 py-1 flex items-center gap-1">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt="Avatar" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-indigo-700">{user?.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                    )}
                    <span>Profile</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <MobileTabBar />
    </>
  );
};

export default Navbar;

// ─── Messages link with unread badge ─────────────────────────────────────────
const MessagesLinkWithUnread: React.FC = () => {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const pollRef = useRef<number | undefined>(undefined);

  const loadUnread = async () => {
    if (!user?.userId) return;
    try {
      const res = await apiService.dmListConversations(50);
      const total = (res.items || []).reduce((sum: number, c: any) => {
        const forMe = c.userAId === user.userId ? Number(c.unreadCountForUserA || 0) : Number(c.unreadCountForUserB || 0);
        return sum + forMe;
      }, 0);
      setUnread(total);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadUnread();
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(loadUnread, 60000) as unknown as number;
    const onVisibility = () => { if (document.visibilityState === 'visible') loadUnread(); };
    const onDmUpdated = () => loadUnread();
    window.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('dm:updated', onDmUpdated as EventListener);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      window.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('dm:updated', onDmUpdated as EventListener);
    };
  }, [user?.userId]);

  return (
    <Link to="/messages" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors relative">
      Messages
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white bg-red-600 rounded-full">
          {unread}
        </span>
      )}
    </Link>
  );
};
