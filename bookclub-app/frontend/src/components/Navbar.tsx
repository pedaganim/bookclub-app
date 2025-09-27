import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
// (No external icon libraries; use neutral inline SVGs)

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [, setIsMobileMenuOpen] = useState(false);

  const handleAddBooksClick = () => {
    // Navigate to /my-books so the Home page opens the AddBookModal without being affected by any root redirects
    navigate('/my-books', { state: { openAddBooks: true } });
    setIsMobileMenuOpen(false);
  };

// Simple neutral inline SVG icons
const Icon = {
  Book: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <path d="M4 6.75A2.25 2.25 0 0 1 6.25 4.5h11.5A2.25 2.25 0 0 1 20 6.75v11.25a.75.75 0 0 1-1.2.6c-.8-.6-1.79-.9-2.8-.9H6.25A2.25 2.25 0 0 1 4 15.45V6.75z" />
      <path d="M7.5 7.5h7.5M7.5 10.5h7.5" strokeLinecap="round" />
    </svg>
  ),
  Toy: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="8" r="2.5" />
      <path d="M5 16c2-2 12-2 14 0M9 13.5c.5.3 1.5.5 3 .5s2.5-.2 3-.5" strokeLinecap="round" />
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

// Mobile bottom tab bar for small screens
const MobileTabBar: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-inner md:hidden z-40">
      <div className="max-w-7xl mx-auto grid grid-cols-5 text-sm">
        <Link to="/library" className="flex flex-col items-center justify-center py-2 text-gray-700 hover:text-gray-900">
          <Icon.Book />
          <span>Library</span>
        </Link>
        <Link to="/swap-toys" className="flex flex-col items-center justify-center py-2 text-gray-700 hover:text-gray-900">
          <Icon.Toy />
          <span>Swap Toys</span>
        </Link>
        <Link to={{ pathname: '/my-books' }} state={{ openAddBooks: true }} className="flex flex-col items-center justify-center py-2 text-gray-700 hover:text-gray-900 font-medium">
          <Icon.Plus />
          <span>Add</span>
        </Link>
        <Link to="/messages" className="flex flex-col items-center justify-center py-2 text-gray-700 hover:text-gray-900">
          <Icon.Chat />
          <span>Messages</span>
        </Link>
        {isAuthenticated ? (
          <Link to="/profile" className="flex flex-col items-center justify-center py-2 text-gray-700 hover:text-gray-900">
            <Icon.User />
            <span>Profile</span>
          </Link>
        ) : (
          <Link to="/login" className="flex flex-col items-center justify-center py-2 text-gray-700 hover:text-gray-900">
            <Icon.User />
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
                  Browse Library
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
                  Swap Toys
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


