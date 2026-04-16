import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LibraryItem } from '../types';
import { NotificationContext } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { getItemLabel, getItemLabelLower } from '../utils/labels';

interface PublicBookCardProps {
  book: LibraryItem;
  isMemberOfBookClub?: boolean; // default true; when false and book has clubId, show Join Club
}

const PublicBookCard: React.FC<PublicBookCardProps> = ({ book, isMemberOfBookClub = false }) => {
  const [sending, setSending] = React.useState(false);
  const notificationCtx = React.useContext(NotificationContext);
  const { isAuthenticated, user } = useAuth();
  const [requestingJoin, setRequestingJoin] = React.useState(false);
  const [joinRequested, setJoinRequested] = React.useState(false);
  const navigate = useNavigate();


  const requestToJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      window.location.assign('/login');
      return;
    }
    const clubId = (book as any).clubId;
    if (!clubId) return;
    try {
      setRequestingJoin(true);
      const { apiService } = await import('../services/api');
      const res = await apiService.requestClubJoin(clubId);
      if (res.status === 'pending' || res.status === 'active') {
        setJoinRequested(true);
        notificationCtx?.addNotification('success', res.status === 'active' ? 'Joined club!' : 'Request to join sent');
      }
    } catch (e) {
      notificationCtx?.addNotification('error', 'Could not request to join club');
    } finally {
      setRequestingJoin(false);
    }
  };

  const handleCardClick = () => {
    const itemId = (book as any).bookId || (book as any).listingId;
    navigate(`/books/${itemId}`);
  };


  // Default placeholder image when no cover image is provided
  const itemLabelForSvg = getItemLabel(book.category || 'book');
  const defaultBookImage = `data:image/svg+xml,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100' height='100' fill='%23f3f4f6'/%3e%3ctext x='50%25' y='50%25' font-size='14' fill='%23374151' text-anchor='middle' dy='.3em'%3e${itemLabelForSvg}%3c/text%3e%3c/svg%3e`;

  const handleBorrowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // If book belongs to a club and viewer is not a member, block borrow and prompt to join
    if ((book as any).clubId && !isMemberOfBookClub) {
      notificationCtx?.addNotification('info', 'Join this club to contact the owner.');
      return;
    }
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
      const itemLabelLower = getItemLabelLower(book.category || 'book');
      const title = book.title ? `"${book.title}"` : `your ${itemLabelLower}`;
      const message = `Hi! I'm interested in borrowing ${title}. Is it available?`;
      await apiService.dmSendMessage(conversation.conversationId, book.userId, message);
      // Track analytics (non-blocking)
      try { trackBorrowIntent(book.userId, (book as any).bookId || (book as any).listingId, book.title || '', { currentUserId: user?.userId, source: 'PublicBookCard' }); } catch {}
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
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Image - Consistent portrait aspect ratio and crop */}
      <Link 
        to={`/books/${(book as any).bookId || (book as any).listingId}`} 
        aria-label={book.title ? `View details for ${book.title}` : 'View book details'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full bg-gray-100" style={{ aspectRatio: '3 / 4' }}>
          <img
            src={(book as any).coverImage || ((book as any).images && (book as any).images[0]) || defaultBookImage}
            alt={book.title ? `Cover of ${book.title}` : `${getItemLabel(book.category || 'book')} cover`}
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              // Fallback to default image if cover image fails to load
              (e.target as HTMLImageElement).src = defaultBookImage;
            }}
          />
        </div>
      </Link>
      {/* Screen-reader only "View details" control for accessibility */}
      <div className="sr-only">
        <Link to={`/books/${(book as any).bookId || (book as any).listingId}`}>
          {book.title ? `View details for ${book.title}` : `View ${getItemLabelLower(book.category || 'book')} details`}
        </Link>
      </div>
      
      <div className="p-3 sm:p-4">
        {/* Title & Category/Author */}
        <div className="mb-2">
          <div className="text-sm font-medium text-gray-900 truncate">{book.title || 'Untitled Item'}</div>
          {book.category === 'book' || !book.category ? (
            <div className="text-xs text-gray-600 truncate">{(book as any).author || 'Unknown author'}</div>
          ) : (
            <div className="text-xs text-indigo-600 font-medium uppercase tracking-wider">{book.category.replace('_', ' ')}</div>
          )}
        </div>

        {/* Action Button */}
        {(() => {
          // If the book belongs to a club and the viewer is not a member, show Join Club
          if ((book as any).clubId && !isMemberOfBookClub) {
            const joinLabel = `Join the Club to Borrow`;
            return (
              <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-2">
                <button
                  type="button"
                  className={`w-full sm:w-auto text-sm font-medium text-white px-4 py-2 rounded-md transition-colors ${requestingJoin || joinRequested ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'}`}
                  title={joinRequested ? 'Request sent' : joinLabel}
                  onClick={requestToJoin}
                  disabled={requestingJoin || joinRequested}
                >
                  {joinRequested ? 'Requested' : joinLabel}
                </button>
                {book.userId && (
                  <a 
                    href={`/users/${book.userId}`} 
                    className="block text-center sm:inline text-sm text-indigo-700 hover:text-indigo-900 hover:underline py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View owner
                  </a>
                )}
              </div>
            );
          }

          // Hide borrow button if this is the current user's own book
          const isOwn = user?.userId === book.userId;
          if (isOwn) {
            return (
              <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-md inline-block">
                Your Listing
              </div>
            );
          }

          const itemLabel = getItemLabel(book.category || 'book');
          const actionLabel = `Borrow ${itemLabel}`;
          
          if (book.status === 'borrowed') {
            return (
              <div className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-md inline-block">
                Currently Lent
              </div>
            );
          }

          return (
            <div className="space-y-2">
              <button
                type="button"
                className={`w-full text-sm font-medium text-white px-4 py-2 rounded-md transition-colors ${sending ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'}`}
                title={actionLabel}
                onClick={handleBorrowClick}
                disabled={sending}
              >
                {sending ? 'Sending…' : actionLabel}
              </button>
              {book.userId && (
                <a 
                  href={`/users/${book.userId}`} 
                  className="block text-center text-sm text-indigo-700 hover:text-indigo-900 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View owner profile
                </a>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default PublicBookCard;
