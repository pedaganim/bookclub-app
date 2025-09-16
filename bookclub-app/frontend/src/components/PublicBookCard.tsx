import React from 'react';
import { Book } from '../types';
import { NotificationContext } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

interface PublicBookCardProps {
  book: Book;
  isMemberOfBookClub?: boolean; // default true; when false and book has clubId, show Join Club
}

const PublicBookCard: React.FC<PublicBookCardProps> = ({ book, isMemberOfBookClub = true }) => {
  const [sending, setSending] = React.useState(false);
  const notificationCtx = React.useContext(NotificationContext);
  const { isAuthenticated, user } = useAuth();
  const navigateToJoin = () => {
    window.location.assign('/clubs');
    // We also set navigation state for React Router consumers via history API when available
    try {
      history.replaceState({ openJoin: true }, '');
    } catch {}
  };
  // Function to format description text properly
  const formatDescription = (text?: string) => {
    if (!text) return '';
    
    // Convert to proper sentence case if it's all caps
    if (text === text.toUpperCase()) {
      return text.toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    }
    
    return text;
  };

  // Get username from userName field or fallback to simplified userId
  const getDisplayUsername = (book: Book) => {
    if (book.userName) {
      return book.userName;
    }
    // Fallback to simplified version of the userId
    return `User ${book.userId.slice(-Math.min(8, book.userId.length))}`;
  };

  // Default placeholder image when no cover image is provided
  const defaultBookImage = "data:image/svg+xml,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100' height='100' fill='%23f3f4f6'/%3e%3ctext x='50%25' y='50%25' font-size='14' fill='%23374151' text-anchor='middle' dy='.3em'%3eBook%3c/text%3e%3c/svg%3e";

  const handleBorrowClick = async () => {
    // Require auth token; if missing, redirect to login
    if (!isAuthenticated) {
      window.location.assign('/login');
      return;
    }

    // Prevent self-DM when viewing own book
    if (user?.userId === book.userId) {
      notificationCtx?.addNotification('info', 'This is your own book.');
      return;
    }

    try {
      setSending(true);
      const { apiService } = await import('../services/api');
      const { trackBorrowIntent } = await import('../services/analytics');
      // Create or fetch conversation with the owner
      const conversation = await apiService.dmCreateConversation(book.userId);
      // Send an initial templated message
      const title = book.title ? `"${book.title}"` : 'your book';
      const message = `Hi! I'm interested in borrowing ${title}. Is it available?`;
      await apiService.dmSendMessage(conversation.conversationId, book.userId, message);
      // Track analytics (non-blocking)
      try { trackBorrowIntent(book.userId, book.bookId, book.title || '', { currentUserId: user?.userId, source: 'PublicBookCard' }); } catch {}
      // Navigate to the messages thread
      notificationCtx?.addNotification('success', 'Message sent to the owner. Opening chat…');
      window.location.assign(`/messages/${conversation.conversationId}`);
    } catch (e) {
      // If something goes wrong, fall back to messages list
      notificationCtx?.addNotification('error', 'Could not start a chat. Opening Messages…');
      window.location.assign('/messages');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image - Consistent portrait aspect ratio and crop */}
      <div className="w-full bg-gray-100" style={{ aspectRatio: '3 / 4' }}>
        <img
          src={book.coverImage || defaultBookImage}
          alt={book.title ? `Cover of ${book.title}` : 'Book cover'}
          className="w-full h-full object-cover object-center"
          onError={(e) => {
            // Fallback to default image if cover image fails to load
            (e.target as HTMLImageElement).src = defaultBookImage;
          }}
        />
      </div>
      
      <div className="p-3 sm:p-4">
        {/* Description */}
        {book.description && (
          <div className="mb-3">
            <p
              className="text-gray-700 text-sm leading-relaxed"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {formatDescription(book.description)}
            </p>
          </div>
        )}
        
        {/* Borrow action */}
        {(() => {
          // If the book belongs to a club and the viewer is not a member, show Join Club
          if (book.clubId && !isMemberOfBookClub) {
            const label = book.clubName ? `Join ${book.clubName}` : 'Join Club';
            return (
              <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-2">
                <button
                  type="button"
                  className={`w-full sm:w-auto text-sm font-medium text-white px-4 py-2 rounded-md transition-colors ${sending ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'}`}
                  title={label}
                  onClick={navigateToJoin}
                  disabled={sending}
                >
                  {label}
                </button>
                {book.userId && (
                  <a 
                    href={`/users/${book.userId}`} 
                    className="block text-center sm:inline text-sm text-indigo-700 hover:text-indigo-900 hover:underline py-1"
                  >
                    View owner profile
                  </a>
                )}
              </div>
            );
          }
          // Hide borrow button if this is the current user's own book
          try {
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
              const me = JSON.parse(savedUser);
              if (me?.userId && me.userId === book.userId) {
                return null;
              }
            }
          } catch {}
          return (
            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-2">
              <button
                type="button"
                className={`w-full sm:w-auto text-sm font-medium text-white px-4 py-2 rounded-md transition-colors ${sending ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'}`}
                title={`Borrow from ${getDisplayUsername(book)}`}
                onClick={handleBorrowClick}
                disabled={sending}
              >
                {sending ? 'Sending…' : `Borrow from ${getDisplayUsername(book)}`}
              </button>
              <a 
                href={`/users/${book.userId}`} 
                className="block text-center sm:inline text-sm text-indigo-700 hover:text-indigo-900 hover:underline py-1"
              >
                View profile
              </a>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default PublicBookCard;