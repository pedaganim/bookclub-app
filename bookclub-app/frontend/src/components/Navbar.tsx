import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { LIBRARY_CONFIGS } from '../config/libraryConfig';
import { useSubdomain } from '../hooks/useSubdomain';
import { config } from '../config';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSubdomain, club } = useSubdomain();
  const [librariesOpen, setLibrariesOpen] = useState(false);
  const librariesRef = useRef<HTMLDivElement>(null);

  const handleAddBooksClick = () => {
    navigate('/my-books', { state: { openAddBooks: true } });
  };

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
                  <button onClick={handleAddBooksClick} className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                    Add Books
                  </button>
                  <Link to="/clubs" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                    Clubs
                  </Link>
                  <MessagesLinkWithUnread />
                </>
              )}
              {!isAuthenticated && (
                <>
                  <Link to="/about" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors">About</Link>
                  <Link to="/about/blogs" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors">Blogs</Link>
                </>
              )}
            </div>

            {/* Right: User actions */}
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
                  <button onClick={logout} className="text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors">
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile top bar */}
            <div className="md:hidden flex items-center gap-2">
              <Link to="/about" className="text-sm text-gray-700 hover:text-gray-900 px-2 py-1">About</Link>
              <Link to="/my-books" className="text-sm text-gray-700 hover:text-gray-900 px-2 py-1">My Books</Link>
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

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────
const MobileTabBar: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [librarySheetOpen, setLibrarySheetOpen] = useState(false);

  const Icon = {
    Home: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    Grid: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    Plus: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
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
  };

  const allLibraries = [
    { label: 'Books', emoji: '📚', route: '/library/books', accentBg: 'bg-amber-50', accentText: 'text-amber-700' },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-inner md:hidden z-40">
        <div className="max-w-7xl mx-auto grid grid-cols-5 text-[11px]">
          <Link to="/library" className="flex flex-col items-center justify-center py-2 gap-0.5 text-gray-600 hover:text-indigo-700 transition-colors">
            <Icon.Home />
            <span>Home</span>
          </Link>
          <button
            onClick={() => setLibrarySheetOpen(true)}
            className="flex flex-col items-center justify-center py-2 gap-0.5 text-gray-600 hover:text-indigo-700 transition-colors"
          >
            <Icon.Grid />
            <span>Libraries</span>
          </button>
          <Link
            to="/my-books"
            state={{ openAddBooks: true }}
            className="flex flex-col items-center justify-center py-2 gap-0.5 text-gray-600 hover:text-indigo-700 transition-colors"
          >
            <Icon.Plus />
            <span>Add</span>
          </Link>
          <Link to="/messages" className="flex flex-col items-center justify-center py-2 gap-0.5 text-gray-600 hover:text-indigo-700 transition-colors">
            <Icon.Chat />
            <span>Messages</span>
          </Link>
          {isAuthenticated ? (
            <Link to="/profile" className="flex flex-col items-center justify-center py-2 gap-0.5 text-gray-600 hover:text-indigo-700 transition-colors">
              <Icon.User />
              <span>Profile</span>
            </Link>
          ) : (
            <Link to="/login" className="flex flex-col items-center justify-center py-2 gap-0.5 text-gray-600 hover:text-indigo-700 transition-colors">
              <Icon.User />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile library picker bottom sheet */}
      {librarySheetOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
          onClick={() => setLibrarySheetOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl px-4 py-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
            <p className="text-sm font-semibold text-gray-800 mb-4">Browse Libraries</p>
            <div className="grid grid-cols-2 gap-3">
              {allLibraries.map((lib) => (
                <Link
                  key={lib.route}
                  to={lib.route}
                  onClick={() => setLibrarySheetOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${lib.accentBg}`}
                >
                  <span className="text-2xl">{lib.emoji}</span>
                  <span className={`text-sm font-medium ${lib.accentText}`}>{lib.label}</span>
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                to="/library"
                onClick={() => setLibrarySheetOpen(false)}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50 text-sm font-medium text-gray-700"
              >
                🏛️ View all libraries
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

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
