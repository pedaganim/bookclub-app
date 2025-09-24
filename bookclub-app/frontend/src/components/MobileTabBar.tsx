import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  Squares2X2Icon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

const MobileTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const onAddBooks = () => {
    navigate('/my-books', { state: { openAddBooks: true } });
  };

  // Hide on medium+ screens
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 z-20">
      <ul className="flex justify-around items-stretch h-16">
        <li className="flex-1">
          <Link
            to="/library"
            className={`flex flex-col items-center justify-center h-full text-xs ${isActive('/library') ? 'text-indigo-600' : 'text-gray-600'}`}
          >
            <BookOpenIcon className="h-6 w-6" />
            <span className="mt-0.5">Library</span>
          </Link>
        </li>
        <li className="flex-1">
          <Link
            to="/messages"
            className={`flex flex-col items-center justify-center h-full text-xs ${isActive('/messages') ? 'text-indigo-600' : 'text-gray-600'}`}
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6" />
            <span className="mt-0.5">Messages</span>
          </Link>
        </li>
        <li className="flex-1">
          <Link
            to="/my-books"
            className={`flex flex-col items-center justify-center h-full text-xs ${isActive('/my-books') ? 'text-indigo-600' : 'text-gray-600'}`}
          >
            <Squares2X2Icon className="h-6 w-6" />
            <span className="mt-0.5">My Books</span>
          </Link>
        </li>
        <li className="flex-1">
          <button
            type="button"
            onClick={onAddBooks}
            className={`flex flex-col items-center justify-center h-full text-xs w-full ${isAuthenticated ? 'text-indigo-600 hover:text-indigo-700' : 'text-gray-600 hover:text-gray-700'}`}
          >
            <PlusCircleIcon className="h-6 w-6" />
            <span className="mt-0.5">Add Books</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default MobileTabBar;
