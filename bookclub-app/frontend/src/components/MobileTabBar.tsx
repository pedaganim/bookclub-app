import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

const MobileTabBar: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [librarySheetOpen, setLibrarySheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<number | undefined>(undefined);

  const loadUnread = async () => {
    if (!user?.userId) return;
    try {
      const res = await apiService.dmListConversations(50);
      const total = (res.items || []).reduce((sum: number, c: any) => {
        const forMe = c.userAId === user.userId ? Number(c.unreadCountForUserA || 0) : Number(c.unreadCountForUserB || 0);
        return sum + forMe;
      }, 0);
      setUnreadCount(total);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (isAuthenticated) {
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
    }
  }, [isAuthenticated, user?.userId]);

  const isActive = (path: string) => {
    if (path === '/library') {
      return location.pathname === '/library' || (location.pathname.startsWith('/library/') && location.pathname !== '/library/books');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const Icon = {
    Home: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActive('/library') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActive('/messages') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5A2.25 2.25 0 0 1 19.5 6.75v6A2.25 2.25 0 0 1 17.25 15H9l-3.75 3V6.75z" />
      </svg>
    ),
    Users: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActive('/clubs') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  };

  const allLibraries = [
    { label: 'Books', emoji: '📚', route: '/library/books', accentBg: 'bg-amber-50', accentText: 'text-amber-700' },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-inner md:hidden z-40">
        <div className="max-w-7xl mx-auto grid grid-cols-5 text-[10px]">
          <Link to="/library" className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isActive('/library') ? 'text-indigo-700' : 'text-gray-600'}`}>
            <Icon.Home />
            <span className={isActive('/library') ? 'font-medium' : ''}>Home</span>
          </Link>
          <button
            onClick={() => setLibrarySheetOpen(true)}
            className="flex flex-col items-center justify-center py-2 gap-0.5 text-gray-600 hover:text-indigo-700 transition-colors"
          >
            <Icon.Grid />
            <span>Libraries</span>
          </button>
          {isAuthenticated && (
            <Link 
              to="/my-books" 
              state={{ openAddBooks: true }}
              className={`flex flex-col items-center justify-center py-2 gap-0.5 font-semibold ${isActive('/my-books') ? 'text-indigo-700' : 'text-indigo-600'}`}
            >
              <div className="bg-indigo-600 text-white rounded-full p-1.5 shadow-sm -mt-1">
                <Icon.Plus />
              </div>
              <span className="mt-0.5 text-[11px]">Add</span>
            </Link>
          )}
          <Link
            to={isAuthenticated ? "/clubs" : "/clubs/browse"}
            className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isActive('/clubs') ? 'text-indigo-700' : 'text-gray-600'}`}
          >
            <Icon.Users />
            <span className={isActive('/clubs') ? 'font-medium' : ''}>Clubs</span>
          </Link>
          <Link to="/messages" className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${isActive('/messages') ? 'text-indigo-700' : 'text-gray-600'}`}>
            <Icon.Chat />
            <span className={isActive('/messages') ? 'font-medium' : ''}>Chat</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </Link>
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

export default MobileTabBar;
