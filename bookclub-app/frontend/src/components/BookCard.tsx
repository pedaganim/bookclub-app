import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmationModal from './ConfirmationModal';
import EditBookModal from './EditBookModal';
import { getItemLabel, getItemLabelLower } from '../utils/labels';

interface BookCardProps {
  book: Book;
  onDelete: (bookId: string) => void;
  onUpdate: (book: Book) => void;
  showActions: boolean;
  listView?: boolean;
}

// Reusable Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'borrowed':
        return 'bg-yellow-100 text-yellow-800';
      case 'reading':
        return 'bg-blue-100 text-blue-800';
      case 'giving_away':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}
    >
      {status === 'borrowed' ? 'lent' : status}
    </span>
  );
};

// Reusable Action Buttons Component
const ActionButtons: React.FC<{
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  loading: boolean;
}> = ({ onEdit, onDelete, loading }) => {
  return (
    <div className="flex space-x-2">
      <button
        onClick={onEdit}
        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
      >
        Edit
      </button>
      <button
        onClick={onDelete}
        disabled={loading}
        className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
};

const BookCard: React.FC<BookCardProps> = ({ book, onDelete, onUpdate, showActions, listView = false }) => {
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      setLoading(true);
      await apiService.deleteBook(book.bookId);
      onDelete(book.bookId);
      addNotification('success', `${getItemLabel(book.category || 'book')} deleted successfully`);
    } catch (error) {
      addNotification('error', 'Failed to delete book');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleCardClick = () => {
    navigate(`/books/${book.bookId}`);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  return (
    <>
      <div 
        className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
          listView ? 'flex' : ''
        }`}
        onClick={handleCardClick}
      >
        {book.coverImage && (
          <img
            src={book.coverImage}
            alt={book.title || `${getItemLabel(book.category || 'book')} cover`}
            className={listView 
              ? "w-20 h-28 object-cover flex-shrink-0" 
              : "w-full h-48 object-cover"
            }
          />
        )}
        <div className={listView ? "flex-1 p-4 flex justify-between items-start" : "p-4"}>
          <div className={listView ? "flex-1" : ""}>
            {/* Show title and author; remove description */}
            <div className="mb-3">
              <div className={`text-gray-900 ${listView ? 'text-base font-semibold' : 'text-sm font-medium'}`}>{book.title || `Untitled ${getItemLabel(book.category || 'book')}`}</div>
              <div className="text-gray-600 text-xs">{book.author || 'Unknown author'}</div>
            </div>
            {!listView && (
              <div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={book.status} />
                  {book.status === 'borrowed' && (book as any).lentToUserId && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200" title={`This ${getItemLabelLower(book.category || 'book')} is currently lent out`}>
                      Lent to {(book as any).lentToUserName || (book as any).lentToUserId}
                    </span>
                  )}
                  <Link 
                    to={`/books/${book.bookId}`} 
                    className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View details
                  </Link>
                </div>
                {showActions && user?.userId === book.userId && (
                  <div className="mt-2">
                    <ActionButtons
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      loading={loading}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          {listView && (
            <div className="ml-4 flex flex-col items-end space-y-2">
              <div className="flex items-center gap-3">
                <StatusBadge status={book.status} />
                {book.status === 'borrowed' && (book as any).lentToUserId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200" title={`This ${getItemLabelLower(book.category || 'book')} is currently lent out`}>
                    Lent to {(book as any).lentToUserName || (book as any).lentToUserId}
                  </span>
                )}
                <Link 
                  to={`/books/${book.bookId}`} 
                  className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View details
                </Link>
              </div>
              {showActions && user?.userId === book.userId && (
                <ActionButtons
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  loading={loading}
                />
              )}
            </div>
          )}
        </div>
      </div>
      
      {showEditModal && (
        <EditBookModal
          book={book}
          onClose={() => setShowEditModal(false)}
          onBookUpdated={(updated) => {
            onUpdate(updated);
            setShowEditModal(false);
          }}
        />
      )}
      
      <ConfirmationModal
        isOpen={showDeleteModal}
        title={`Delete ${getItemLabel(book.category || 'book')}`}
        message={`Are you sure you want to delete "${book.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDestructive={true}
      />
    </>
  );
};

export default BookCard;
