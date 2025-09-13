import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
            <Link
              to="/about"
              className="ml-4 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              About
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
