import React, { useState, useEffect, useCallback } from 'react';
import { Book } from '../types';
import { apiService } from '../services/api';
import PublicBookCard from '../components/PublicBookCard';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';

const BookLibrary: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [previousTokens, setPreviousTokens] = useState<string[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);

  const fetchBooks = useCallback(async (search?: string, currentPageSize?: number, token?: string | null) => {
    try {
      setLoading(true);
      setError('');
      // Make public request without userId to get all books
      const response = await apiService.listBooksPublic({ 
        search, 
        limit: currentPageSize || pageSize,
        nextToken: token || undefined 
      });
      setBooks(Array.isArray(response.items) ? response.items : []);
      setHasNextPage(!!response.nextToken);
      setNextToken(response.nextToken || null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Reset pagination when searching
    setPreviousTokens([]);
    setNextToken(null);
    fetchBooks(query || undefined, pageSize, null);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset pagination when changing page size
    setPreviousTokens([]);
    setNextToken(null);
    fetchBooks(searchQuery || undefined, newPageSize, null);
  };

  const handleNextPage = () => {
    if (hasNextPage && nextToken) {
      // Store current token in history for going back
      setPreviousTokens(prev => [...prev, nextToken]);
      fetchBooks(searchQuery || undefined, pageSize, nextToken);
    }
  };

  const handlePreviousPage = () => {
    if (previousTokens.length > 0) {
      // Get the previous token
      const newPreviousTokens = [...previousTokens];
      const previousToken = newPreviousTokens.pop();
      setPreviousTokens(newPreviousTokens);
      
      // If we're going back to the first page
      if (newPreviousTokens.length === 0) {
        fetchBooks(searchQuery || undefined, pageSize, null);
      } else {
        fetchBooks(searchQuery || undefined, pageSize, previousToken || null);
      }
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading our library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Our Library</h1>
          <p className="text-lg text-gray-600">
            Discover books shared by our community
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search books by description..."
            className="max-w-md mx-auto"
          />
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {(!Array.isArray(books) || books?.length === 0) ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {searchQuery 
                ? `No books found matching "${searchQuery}".`
                : "No books are available in our library yet."
              }
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => (
                <PublicBookCard
                  key={book.bookId}
                  book={book}
                />
              ))}
            </div>
            
            {/* Pagination Controls */}
            <div className="mt-8">
              <Pagination
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                hasNextPage={hasNextPage}
                hasPreviousPage={previousTokens.length > 0}
                onNextPage={handleNextPage}
                onPreviousPage={handlePreviousPage}
                currentItemsCount={books.length}
                isLoading={loading}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookLibrary;