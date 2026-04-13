import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Book } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmationModal from './ConfirmationModal';

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
      addNotification('success', 'Book deleted successfully');
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
    <div 
      className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer ${
        listView ? 'flex' : ''
      }`}
      onClick={handleCardClick}
    >
      {book.coverImage && (
        <img
          src={book.coverImage}
          alt={book.title}
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
            <div className={`text-gray-900 ${listView ? 'text-base font-semibold' : 'text-sm font-medium'}`}>{book.title || 'Untitled Book'}</div>
            <div className="text-gray-600 text-xs">{book.author || 'Unknown author'}</div>
          </div>
          {!listView && (
            <div>
              <div className="flex items-center gap-3">
                <StatusBadge status={book.status} />
                {book.status === 'borrowed' && (book as any).lentToUserId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200" title="This book is currently lent out">
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
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200" title="This book is currently lent out">
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
      
      <div onClick={(e) => e.stopPropagation()}>
        {showEditModal && (
          <EditBookModal
            book={book}
            onClose={() => setShowEditModal(false)}
            onUpdate={onUpdate}
          />
        )}
        
        <ConfirmationModal
          isOpen={showDeleteModal}
          title="Delete Book"
          message={`Are you sure you want to delete "${book.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDestructive={true}
        />
      </div>
    </div>
  );
};

interface EditBookModalProps {
  book: Book;
  onClose: () => void;
  onUpdate: (book: Book) => void;
}

const EditBookModal: React.FC<EditBookModalProps> = ({ book, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: book.title,
    author: book.author,
    description: book.description || '',
    status: book.status,
    lentToUserId: book.lentToUserId || '',
    lentToUserName: book.lentToUserName || '',
  });
  const [lentToEmail, setLentToEmail] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updatedBook = await apiService.updateBook(book.bookId, formData);
      onUpdate(updatedBook);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update book');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Book</h3>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Author</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.status}
                onChange={(e) => {
                  const newStatus = e.target.value as any;
                  const updates: any = { status: newStatus };
                  // Clear lending info if changing away from borrowed
                  if (newStatus !== 'borrowed') {
                    updates.lentToUserId = '';
                    updates.lentToUserName = '';
                  }
                  setFormData({ ...formData, ...updates });
                }}
              >
                <option value="available">Available</option>
                <option value="borrowed">Lent</option>
                <option value="reading">Reading</option>
                <option value="giving_away">Giving away</option>
              </select>
            </div>

            {formData.status === 'borrowed' && (
              <div className="bg-amber-50 p-3 rounded-md border border-amber-200 space-y-3">
                <label className="block text-sm font-medium text-amber-800">Lent to (Selection)</label>
                
                {formData.lentToUserName ? (
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-amber-300 shadow-sm">
                    <span className="text-sm text-gray-900 font-medium">
                      {formData.lentToUserName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, lentToUserId: '', lentToUserName: '' })}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="email"
                        placeholder="recipient@email.com"
                        className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                        value={lentToEmail}
                        onChange={(e) => setLentToEmail(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={searchingUser || !lentToEmail}
                        onClick={async () => {
                          const normalizedEmail = lentToEmail.trim().toLowerCase();
                          if (!normalizedEmail) return;
                          setSearchingUser(true);
                          try {
                            const found = await apiService.findUserByEmail(normalizedEmail);
                            if (found) {
                              setFormData({
                                ...formData,
                                lentToUserId: found.userId,
                                lentToUserName: found.name
                              });
                              setLentToEmail('');
                            } else {
                              setError('No user found with that email. Ensure they have signed up.');
                            }
                          } catch (err: any) {
                            setError(err.message || 'Error searching for user');
                          } finally {
                            setSearchingUser(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-600 text-white text-xs rounded-md hover:bg-amber-700 disabled:opacity-50"
                      >
                        {searchingUser ? '...' : 'Find'}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-700 italic">
                      Lending field is optional; you can search by the recipient's registered email.
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
