import React, { useState } from 'react';
import { Book } from '../types';
import { apiService } from '../services/api';

interface BookCardProps {
  book: Book;
  onDelete: (bookId: string) => void;
  onUpdate: (book: Book) => void;
  showActions: boolean;
  listView?: boolean;
}

const BookCard: React.FC<BookCardProps> = ({ book, onDelete, onUpdate, showActions, listView = false }) => {
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this book?')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteBook(book.bookId);
      onDelete(book.bookId);
    } catch (error) {
      alert('Failed to delete book');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group relative ${
      listView ? 'flex items-center' : ''
    }`}>
      {/* Cover Image - always present since we filter for images */}
      <div className={listView ? "flex-shrink-0" : "relative"}>
        <img
          src={book.coverImage}
          alt={book.title}
          className={listView 
            ? "w-20 h-28 object-cover" 
            : "w-full h-64 object-cover"
          }
        />
        
        {/* Action buttons overlay for grid view */}
        {!listView && showActions && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              <button
                onClick={() => setShowEditModal(true)}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-1.5 rounded-full shadow-sm text-xs"
                title="Edit book"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 text-red-600 p-1.5 rounded-full shadow-sm text-xs disabled:opacity-50"
                title="Delete book"
              >
                {loading ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Minimal content - only show title if available */}
      {(book.title || (listView && showActions)) && (
        <div className={listView ? "flex-1 px-3 py-2 flex justify-between items-center min-w-0" : "p-3"}>
          {book.title && (
            <h3 className={`font-medium text-gray-900 ${listView ? 'text-sm truncate' : 'text-center text-sm'}`}>
              {book.title}
            </h3>
          )}
          
          {/* Action buttons for list view */}
          {listView && showActions && (
            <div className="flex space-x-2 ml-2 flex-shrink-0">
              <button
                onClick={() => setShowEditModal(true)}
                className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="text-red-600 hover:text-red-900 text-xs font-medium disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      )}
      
      {showEditModal && (
        <EditBookModal
          book={book}
          onClose={() => setShowEditModal(false)}
          onUpdate={onUpdate}
        />
      )}
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
