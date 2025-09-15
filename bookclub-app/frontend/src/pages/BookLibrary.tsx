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
  const [previousTokens, setPreviousTokens] = useState<(string | null)[]>([]);
  const [currentPageToken, setCurrentPageToken] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

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
      const hasMore = !!response.nextToken;
      setHasNextPage(hasMore);
      setNextToken(response.nextToken || null);

      // Kick off background total count computation on first page load/search
      if (currentPageToken === null) {
        // If no more pages, total is just current items length
        if (!hasMore) {
          setTotalCount(Array.isArray(response.items) ? response.items.length : 0);
        } else {
          // Compute total by walking the remaining pages in the background
          const initial = Array.isArray(response.items) ? response.items.length : 0;
          void (async () => {
            try {
              let count = initial;
              let tokenLocal: string | undefined = response.nextToken || undefined;
              const perPage = Math.max(pageSize, 50); // speed up counting a bit
              while (tokenLocal) {
                const resp = await apiService.listBooksPublic({
                  search,
                  limit: perPage,
                  nextToken: tokenLocal,
                });
                count += Array.isArray(resp.items) ? resp.items.length : 0;
                tokenLocal = resp.nextToken || undefined;
              }
              setTotalCount(count);
            } catch (e) {
              // Ignore count errors; leave totalCount undefined
            }
          })();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, [pageSize, currentPageToken]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Reset pagination when searching
    setPreviousTokens([]);
    setNextToken(null);
    setCurrentPageToken(null);
    setTotalCount(undefined);
    fetchBooks(query || undefined, pageSize, null);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset pagination when changing page size
    setPreviousTokens([]);
    setNextToken(null);
    setCurrentPageToken(null);
    setTotalCount(undefined);
    fetchBooks(searchQuery || undefined, newPageSize, null);
  };

  const handleNextPage = () => {
    if (hasNextPage && nextToken) {
      // Store current page's starting token in history for going back
      setPreviousTokens(prev => [...prev, currentPageToken]);
      setCurrentPageToken(nextToken);
      fetchBooks(searchQuery || undefined, pageSize, nextToken);
    }
  };

  const handlePreviousPage = () => {
    if (previousTokens.length > 0) {
      // Get the previous page's starting token
      const newPreviousTokens = [...previousTokens];
      const poppedToken = newPreviousTokens.pop();
      const previousPageToken = poppedToken !== undefined ? poppedToken : null;
      setPreviousTokens(newPreviousTokens);
      setCurrentPageToken(previousPageToken);
      
      fetchBooks(searchQuery || undefined, pageSize, previousPageToken);
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
          <p className="mt-4 text-gray-600">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Your Library</h1>
          <p className="text-base sm:text-lg text-gray-600">
            Discover books shared by our community
          </p>
        </div>

        {/* Top Pagination */}
        <div className="mb-4">
          <Pagination 
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            hasNextPage={hasNextPage}
            hasPreviousPage={previousTokens.length > 0}
            onNextPage={handleNextPage}
            onPreviousPage={handlePreviousPage}
            currentItemsCount={books.length}
            isLoading={loading}
            totalCount={totalCount}
            startIndex={(previousTokens.length * pageSize) + (books.length ? 1 : 0)}
          />
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
                : "No books are available in your library yet."
              }
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
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
                totalCount={totalCount}
                startIndex={(previousTokens.length * pageSize) + (books.length ? 1 : 0)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookLibrary;