import React, { useState } from 'react';
import { Book } from '../types';
import { apiService } from '../services/api';
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}
    >
      {status}
    </span>
  );
};

// Reusable Action Buttons Component
const ActionButtons: React.FC<{
  onEdit: () => void;
  onDelete: () => void;
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
  const { addNotification } = useNotification();

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

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow ${
      listView ? 'flex' : ''
    }`}>
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
          {/* Title and author intentionally hidden per requirements */}
          {book.description && (
            <p className={`text-gray-500 text-sm mb-3 ${listView ? 'line-clamp-2' : 'line-clamp-3'}`}>
              {book.description}
            </p>
          )}
          {!listView && (
            <div className="flex items-center justify-between">
              <StatusBadge status={book.status} />
              {showActions && (
                <ActionButtons
                  onEdit={() => setShowEditModal(true)}
                  onDelete={() => setShowDeleteModal(true)}
                  loading={loading}
                />
              )}
            </div>
          )}
        </div>
        {listView && (
          <div className="ml-4 flex flex-col items-end space-y-2">
            <StatusBadge status={book.status} />
            {showActions && (
              <ActionButtons
                onEdit={() => setShowEditModal(true)}
                onDelete={() => setShowDeleteModal(true)}
                loading={loading}
              />
            )}
          </div>
        )}
      </div>
      
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
  });
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
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
                <option value="reading">Reading</option>
              </select>
            </div>
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
