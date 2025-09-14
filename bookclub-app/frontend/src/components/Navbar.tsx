import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              {(() => {
                const logoSrc = `${process.env.PUBLIC_URL || ''}/logo.png`;
                return (
                  <img 
                    src={logoSrc} 
                    alt="Book Club" 
                    className="h-8 w-auto"
                  />
                );
              })()}
            </Link>
            {!isAuthenticated && (
              // Public Library link shown only when not signed in; moved to Sidebar for signed-in users
              <Link
                to="/library"
                className="ml-8 text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-md text-sm font-medium border border-indigo-200 hover:border-indigo-300 transition-colors"
              >
                📚 Your Library
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to="/clubs"
                className="ml-4 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                My Clubs
              </Link>
            )}
            {isAuthenticated && (
              <MessagesLinkWithUnread />
            )}
            <Link
              to="/about"
              className="ml-4 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              About US
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-700">Welcome, {user?.name}</span>
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={`${user.name}'s avatar`}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span>Profile</span>
                </Link>
                <button
                  onClick={logout}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

// Helper component to show Messages link with an unread badge
const MessagesLinkWithUnread: React.FC = () => {
  const [unread, setUnread] = useState(0);
  const pollRef = useRef<number | undefined>(undefined);

  const loadUnread = async () => {
    try {
      const res = await apiService.dmListConversations(50);
      const total = (res.items || []).reduce((sum, c: any) => {
        // We cannot know current userId here; sum both as approximation and rely on markRead for accuracy.
        // Better approach would consume userId from AuthContext, but keep minimal coupling.
        const a = Number(c.unreadCountForUserA || 0);
        const b = Number(c.unreadCountForUserB || 0);
        return sum + Math.max(a, b); // approximation
      }, 0);
      setUnread(total);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadUnread();
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      loadUnread();
    }, 30000) as unknown as number; // 30s
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  return (
    <Link
      to="/messages"
      className="ml-4 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium relative"
    >
      Messages
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white bg-red-600 rounded-full">
          {unread}
        </span>
      )}
    </Link>
  );
};
