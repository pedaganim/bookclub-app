import React, { useState, useEffect, useCallback } from 'react';
import { Book } from '../types';
import { apiService } from '../services/api';
import BookCard from '../components/BookCard';
import AddBookModal from '../components/AddBookModal';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my-books'>('all');
  const { user } = useAuth();

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const params = filter === 'my-books' && user ? { userId: user.userId } : {};
      const response = await apiService.listBooks(params);
      setBooks(response.items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, [filter, user]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleBookAdded = (newBook: Book) => {
    setBooks([newBook, ...books]);
    setShowAddModal(false);
  };

  const handleBookDeleted = (bookId: string) => {
    setBooks(books.filter(book => book.bookId !== bookId));
  };

  const handleBookUpdated = (updatedBook: Book) => {
    setBooks(books.map(book => 
      book.bookId === updatedBook.bookId ? updatedBook : book
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BookClub</h1>
            <p className="mt-2 text-gray-600">
              Discover and share books with the community
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Add Book
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md font-medium ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All Books
            </button>
            <button
              onClick={() => setFilter('my-books')}
              className={`px-4 py-2 rounded-md font-medium ${
                filter === 'my-books'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              My Books
            </button>
          </div>
        </div>

        {books.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {filter === 'my-books' 
                ? "You haven't added any books yet. Click 'Add Book' to get started!"
                : "No books available. Be the first to add one!"
              }
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => (
              <BookCard
                key={book.bookId}
                book={book}
                onDelete={handleBookDeleted}
                onUpdate={handleBookUpdated}
                showActions={user?.userId === book.userId}
              />
            ))}
          </div>
        )}

        {showAddModal && (
          <AddBookModal
            onClose={() => setShowAddModal(false)}
            onBookAdded={handleBookAdded}
          />
        )}
      </div>
    </div>
  );
};

export default Home;
