import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUploadModal } from '../contexts/UploadModalContext';
import { apiService } from '../services/api';

const MobileTabBar: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { openModal } = useUploadModal();
  const location = useLocation();
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

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const Icon = {
    Home: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActive('/library') ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    LostFound: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActive('/library/lost-found') || location.pathname === '/my-library/lost-found' || location.pathname === '/my-lost-and-found' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-inner md:hidden z-40">
      <div className="max-w-7xl mx-auto grid grid-cols-5 text-[10px]">
        <Link
          to="/library"
          className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isActive('/library') && location.pathname !== '/library/lost-found' && location.pathname !== '/my-library/lost-found' && location.pathname !== '/my-lost-and-found' ? 'text-indigo-700' : 'text-gray-600'}`}
        >
          <Icon.Home />
          <span className={isActive('/library') && location.pathname !== '/library/lost-found' && location.pathname !== '/my-library/lost-found' && location.pathname !== '/my-lost-and-found' ? 'font-medium' : ''}>Browse</span>
        </Link>

        <Link
          to="/library/lost-found"
          className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isActive('/library/lost-found') || location.pathname === '/my-library/lost-found' || location.pathname === '/my-lost-and-found' ? 'text-indigo-700' : 'text-gray-600'}`}
        >
          <Icon.LostFound />
          <span className={isActive('/library/lost-found') || location.pathname === '/my-library/lost-found' || location.pathname === '/my-lost-and-found' ? 'font-medium' : ''}>Lost & Found</span>
        </Link>

        {isAuthenticated && (
          <button
            onClick={openModal}
            className="flex flex-col items-center justify-center py-1 gap-0.5 text-indigo-600"
            aria-label="Add to Library"
          >
            <div className="bg-indigo-600 text-white rounded-full p-2.5 shadow-lg -mt-4 transform hover:scale-105 active:scale-95 transition-all">
              <Icon.Plus />
            </div>
          </button>
        )}

        <Link
          to={isAuthenticated ? '/clubs' : '/clubs/browse'}
          className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isActive('/clubs') ? 'text-indigo-700' : 'text-gray-600'}`}
        >
          <Icon.Users />
          <span className={isActive('/clubs') ? 'font-medium' : ''}>Clubs</span>
        </Link>

        <Link
          to="/messages"
          className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${isActive('/messages') ? 'text-indigo-700' : 'text-gray-600'}`}
        >
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
  );
};

export default MobileTabBar;
