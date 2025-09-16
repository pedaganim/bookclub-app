import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleAddBooksClick = () => {
    // Navigate to /my-books so the Home page opens the AddBookModal without being affected by any root redirects
    navigate('/my-books', { state: { openAddBooks: true } });
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
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
                  My Clubs
                </Link>
                <Link
                  to="/clubs/browse"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Browse Clubs
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

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              {isAuthenticated ? (
                <>
                  {/* User info */}
                  <div className="flex items-center px-3 py-3 border-b border-gray-200">
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={`${user.name}'s avatar`}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user?.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="ml-3 text-gray-900 font-medium">{user?.name}</span>
                  </div>
                  
                  {/* Navigation links */}
                  <Link
                    to="/library"
                    className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    📚 Browse Library
                  </Link>
                  <Link
                    to="/my-books"
                    className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    My Books
                  </Link>
                  <button
                    onClick={handleAddBooksClick}
                    className="block w-full text-left px-3 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                  >
                    Add Books
                  </button>
                  <Link
                    to="/clubs"
                    className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    My Clubs
                  </Link>
                  <Link
                    to="/clubs/browse"
                    className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    Browse Clubs
                  </Link>
                  <MobileMessagesLinkWithUnread closeMobileMenu={closeMobileMenu} />
                  <Link
                    to="/profile"
                    className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      closeMobileMenu();
                    }}
                    className="block w-full text-left px-3 py-3 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/library"
                    className="block px-3 py-3 text-base font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md border border-indigo-200"
                    onClick={closeMobileMenu}
                  >
                    📚 Browse Library
                  </Link>
                  <Link
                    to="/about"
                    className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                    onClick={closeMobileMenu}
                  >
                    About Us
                  </Link>
                  <Link
                    to="/login"
                    className="block px-3 py-3 text-base font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-center"
                    onClick={closeMobileMenu}
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
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
