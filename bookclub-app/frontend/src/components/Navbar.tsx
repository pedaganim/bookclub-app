import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
// (No heroicons needed here)

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleAddBooksClick = () => {
    // Navigate to /my-books so the Home page opens the AddBookModal without being affected by any root redirects
    navigate('/my-books', { state: { openAddBooks: true } });
    setIsMobileMenuOpen(false);
  };

// Mobile bottom tab bar for small screens
const MobileTabBar: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-inner md:hidden z-40">
      <div className="max-w-7xl mx-auto grid grid-cols-5 text-sm">
        <Link to="/library" className="flex flex-col items-center justify-center py-2 text-gray-700 hover:text-gray-900">
          <span role="img" aria-label="library">📚</span>
          <span>Library</span>
        </Link>
        <Link to="/swap-toys" className="flex flex-col items-center justify-center py-2 text-gray-700 hover:text-gray-900">
          <span role="img" aria-label="swap-toys">🧸</span>
          <span>Swap Toys</span>
        </Link>
        <Link to={{ pathname: '/my-books' }} state={{ openAddBooks: true }} className="flex flex-col items-center justify-center py-2 text-indigo-600 hover:text-indigo-800 font-medium">
          <span role="img" aria-label="add">➕</span>
          <span>Add</span>
        </Link>
        <Link to="/messages" className="flex flex-col items-center justify-center py-2 text-gray-700 hover:text-gray-900">
          <span role="img" aria-label="messages">💬</span>
          <span>Messages</span>
        </Link>
        {isAuthenticated ? (
          <Link to="/profile" className="flex flex-col items-center justify-center py-2 text-gray-700 hover:text-gray-900">
            <span role="img" aria-label="profile">👤</span>
            <span>Profile</span>
          </Link>
        ) : (
          <Link to="/login" className="flex flex-col items-center justify-center py-2 text-indigo-600 hover:text-indigo-800">
            <span role="img" aria-label="login">🔑</span>
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </div>
  );
};

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center" onClick={closeMobileMenu}>
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
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && (
              <>
                <Link
                  to="/library"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  📚 Browse Library
                </Link>
                <Link
                  to="/my-books"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  My Books
                </Link>
                <button
                  onClick={handleAddBooksClick}
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Add Books
                </button>
                <Link
                  to="/clubs"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Clubs
                </Link>
                <Link
                  to="/swap-toys"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  🧸 Swap Toys
                </Link>
                <MessagesLinkWithUnread />
              </>
            )}
            {!isAuthenticated && (
              <>
                <Link
                  to="/library"
                  className="text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-md text-sm font-medium border border-indigo-200 hover:border-indigo-300 transition-colors"
                >
                  📚 Browse Library
                </Link>
                <Link
                  to="/about"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  About Us
                </Link>
                <Link
                  to="/about/blogs"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Blogs
                </Link>
                <Link
                  to="/swap-toys"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  🧸 Swap Toys
                </Link>
              </>
            )}
          </div>
          
          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button removed; use MobileTabBar for primary navigation on small screens */}
          <div className="md:hidden" />
        </div>
        {/* Mobile collapsible menu removed; MobileTabBar provides nav on small screens */}
      </div>
    </nav>
    {/* Mobile bottom tab bar */}
    <MobileTabBar />
    </>
  );
};

export default Navbar;

// Helper component to show Messages link with an unread badge
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
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadUnread();
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      loadUnread();
    }, 60000) as unknown as number; // 60s

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
    <Link
      to="/messages"
      className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium relative"
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

// Mobile version of MessagesLinkWithUnread
const MobileMessagesLinkWithUnread: React.FC<{ closeMobileMenu: () => void }> = ({ closeMobileMenu }) => {
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
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadUnread();
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(() => {
      loadUnread();
    }, 60000) as unknown as number;

    const onVisibility = () => { if (document.visibilityState === 'visible') loadUnread(); };
    window.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      window.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.userId]);

  return (
    <Link
      to="/messages"
      className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md relative"
      onClick={closeMobileMenu}
    >
      <div className="flex items-center justify-between">
        <span>Messages</span>
        {unread > 0 && (
          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
            {unread}
          </span>
        )}
      </div>
    </Link>
  );
};
