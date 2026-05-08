import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUploadModal } from '../contexts/UploadModalContext';
import { apiService } from '../services/api';
import { useSubdomain } from '../hooks/useSubdomain';
import { config } from '../config';

import MobileTabBar from './MobileTabBar';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { isSubdomain, club } = useSubdomain();
  const { openModal } = useUploadModal();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setProfileOpen(false); }, [location.pathname]);

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

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const isLostFoundPath = location.pathname === '/library/lost-found'
    || location.pathname.startsWith('/library/lost-found/')
    || location.pathname === '/my-library/lost-found'
    || location.pathname === '/my-lost-and-found';

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
              <Link
                to="/library"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/library') && !isLostFoundPath
                    ? 'text-indigo-700 bg-indigo-50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Browse Library
              </Link>

              {isAuthenticated && (
                <Link
                  to="/my-library"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/my-library') && !isLostFoundPath ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  My Library
                </Link>
              )}

              <Link
                to="/library/lost-found"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isLostFoundPath ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                🧾 Lost & Found
              </Link>

              <Link
                to={isAuthenticated ? '/clubs' : '/clubs/browse'}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/clubs') ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Clubs
              </Link>

              {isAuthenticated && (
                <>
                  <div className="w-px h-4 bg-gray-200 mx-1" />
                  <button
                    onClick={openModal}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add to Library
                  </button>
                  <MessagesLinkWithUnread />
                </>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setProfileOpen(o => !o)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                  >
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={`${user.name}'s avatar`} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-700">{user?.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">{user?.name?.split(' ')[0]}</span>
                    <span className={`transition-transform duration-200 text-gray-400 ${profileOpen ? 'rotate-180' : ''}`}>
                      <Icon.ChevronDown />
                    </span>
                  </button>

                  {profileOpen && (
                    <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                      </div>
                      <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                        Profile
                      </Link>
                      <Link to="/about" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                        About
                      </Link>
                      <Link to="/about/blogs" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
                        </svg>
                        Blogs
                      </Link>
                      <Link to="/contact" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                        Contact Us
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/contact" className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors">Contact Us</Link>
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
            <div className="md:hidden flex items-center gap-3">
              <Link to="/contact" className="text-gray-500 hover:text-indigo-600 transition-colors p-1" aria-label="Contact Us">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </Link>
              {isAuthenticated && (
                <Link to="/my-library" className="text-indigo-600 hover:text-indigo-800 transition-colors p-1" aria-label="My Dashboard">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </Link>
              )}
              {isAuthenticated ? (
                <Link to="/profile" className="flex items-center hover:opacity-80 transition-opacity">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Avatar" className="h-7 w-7 rounded-full object-cover border border-gray-200 shadow-sm" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 shadow-sm">
                      <span className="text-xs font-bold text-indigo-700">{user?.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                </Link>
              ) : (
                <a 
                  href={`${config.apiBaseUrl.replace('api.', '')}/login`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  Sign In
                </a>
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
