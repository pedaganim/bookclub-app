import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUploadModal } from '../contexts/UploadModalContext';
import { apiService } from '../services/api';

const MobileTabBar: React.FC = () => {
  const { isAuthenticated, user, canAccessClubs } = useAuth();
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

  const isLostFoundPath = location.pathname === '/library/lost-found'
    || location.pathname.startsWith('/library/lost-found/')
    || location.pathname === '/my-lost-and-found';

  const isActivitiesActive = location.pathname === '/activities'
    || location.pathname.startsWith('/activities/')
    || location.pathname === '/events'
    || location.pathname.startsWith('/events/');

  const isNeighbourhoodsActive = (isActive('/neighbourhoods') || isActive('/clubs')) && !isActivitiesActive;

  const Icon = {
    Activities: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActivitiesActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
      </svg>
    ),
    Library: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isActive('/library') && !isLostFoundPath ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    LostFound: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isLostFoundPath ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isNeighbourhoodsActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-inner md:hidden z-40">
      <div className="max-w-7xl mx-auto grid grid-cols-5 text-[10px]">
        {/* 1. Activities (Prominently First) */}
        <Link
          to={canAccessClubs ? "/activities" : "/"}
          className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isActivitiesActive ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}
        >
          <Icon.Activities />
          <span className={isActivitiesActive ? 'font-semibold' : ''}>Activities</span>
        </Link>

        {/* 2. Library */}
        <Link
          to="/library"
          className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isActive('/library') && !isLostFoundPath ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}
        >
          <Icon.Library />
          <span className={isActive('/library') && !isLostFoundPath ? 'font-semibold' : ''}>Library</span>
        </Link>

        {/* 3. Center Create button */}
        {isAuthenticated && (
          <button
            onClick={openModal}
            className="flex flex-col items-center justify-center py-1 gap-0.5 text-indigo-600"
            aria-label="Create item"
          >
            <div className="bg-indigo-600 text-white rounded-full p-2.5 shadow-lg -mt-4 transform hover:scale-105 active:scale-95 transition-all">
              <Icon.Plus />
            </div>
          </button>
        )}

        {/* 4. Neighbourhoods (or Lost & Found fallback) */}
        {canAccessClubs ? (
          <Link
            to="/neighbourhoods"
            className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isNeighbourhoodsActive ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}
          >
            <Icon.Users />
            <span className={isNeighbourhoodsActive ? 'font-semibold' : ''}>Neighbourhoods</span>
          </Link>
        ) : (
          <Link
            to="/library/lost-found"
            className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${isLostFoundPath ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}
          >
            <Icon.LostFound />
            <span className={isLostFoundPath ? 'font-semibold' : ''}>Lost & Found</span>
          </Link>
        )}

        {/* 5. Chat */}
        <Link
          to="/messages"
          className={`flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${isActive('/messages') ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}
        >
          <Icon.Chat />
          <span className={isActive('/messages') ? 'font-semibold' : ''}>Chat</span>
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
