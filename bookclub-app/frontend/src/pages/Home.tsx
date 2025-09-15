import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Book, BookListResponse } from '../types';
import { apiService } from '../services/api';
import BookCard from '../components/BookCard';
import PublicBookCard from '../components/PublicBookCard';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import AddBookModal from '../components/AddBookModal';
// Clubs are temporarily disabled
import { useAuth } from '../contexts/AuthContext';
import { 
  Squares2X2Icon, 
  ListBulletIcon, 
  BookOpenIcon 
} from '@heroicons/react/24/outline';

const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my-books'>('all');
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'books'>('books');
  const [searchQuery, setSearchQuery] = useState('');
  // Pagination state for "All Books" filter
  const [pageSize, setPageSize] = useState(25);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [previousTokens, setPreviousTokens] = useState<(string | null)[]>([]);
  const [currentPageToken, setCurrentPageToken] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  // Client-side pagination for 'My Books'
  const [myPageIndex, setMyPageIndex] = useState(0);
  const { user } = useAuth();
  // Background total count for 'All Books'
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  const fetchBooks = useCallback(async (search?: string, currentPageSize?: number, token?: string | null) => {
    try {
      setLoading(true);
      setError('');
      if (filter === 'my-books' && user) {
        // My Books - fetch all pages and paginate on the client
        const maxTotal = 2000;
        const perPage = 100;
        let aggregated: Book[] = [];
        let tokenLocal: string | undefined = undefined;
        for (let i = 0; i < Math.ceil(maxTotal / perPage); i++) {
          const resp: BookListResponse = await apiService.listBooks({
            userId: user.userId,
            limit: perPage,
            nextToken: tokenLocal,
          });
          if (Array.isArray(resp.items)) {
            aggregated = aggregated.concat(resp.items as Book[]);
          }
          tokenLocal = resp.nextToken || undefined;
          if (!tokenLocal || aggregated.length >= maxTotal) break;
        }
        setBooks(aggregated);
        // Reset API pagination state (unused for my-books)
        setHasNextPage(false);
        setNextToken(null);
      } else {
        // All Books - use public API with search and pagination support
        const response = await apiService.listBooksPublic({ 
          search, 
          limit: currentPageSize || pageSize,
          nextToken: token || undefined 
        });
        setBooks(Array.isArray(response.items) ? response.items : []);
        const hasMore = !!response.nextToken;
        setHasNextPage(hasMore);
        setNextToken(response.nextToken || null);

        // On first page for current query/pageSize, compute background total
        if (token == null) {
          if (!hasMore) {
            setTotalCount(Array.isArray(response.items) ? response.items.length : 0);
          } else {
            const initial = Array.isArray(response.items) ? response.items.length : 0;
            void (async () => {
              try {
                let count = initial;
                let tokenLocal: string | undefined = response.nextToken || undefined;
                const perPage = Math.max(currentPageSize || pageSize, 50);
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
                // ignore errors and leave totalCount undefined
              }
            })();
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, [filter, user, pageSize]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Reset pagination when searching (only for "All Books" filter)
    if (filter === 'all') {
      setPreviousTokens([]);
      setNextToken(null);
      setCurrentPageToken(null);
    }
    setTotalCount(undefined);
    fetchBooks(query || undefined, pageSize, null);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset pagination when changing page size
    setPreviousTokens([]);
    setNextToken(null);
    setCurrentPageToken(null);
    setMyPageIndex(0);
    setTotalCount(undefined);
    fetchBooks(searchQuery || undefined, newPageSize, null);
  };

  const handleNextPage = () => {
    if (filter === 'my-books') {
      const maxIndex = Math.ceil(books.length / pageSize) - 1;
      setMyPageIndex((idx) => Math.min(idx + 1, Math.max(0, maxIndex)));
    } else if (hasNextPage && nextToken) {
      // Store current page's starting token in history for going back
      setPreviousTokens(prev => [...prev, currentPageToken]);
      setCurrentPageToken(nextToken);
      fetchBooks(searchQuery || undefined, pageSize, nextToken);
    }
  };

  const handlePreviousPage = () => {
    if (filter === 'my-books') {
      setMyPageIndex((idx) => Math.max(0, idx - 1));
    } else if (previousTokens.length > 0) {
      // Get the previous page's starting token
      const newPreviousTokens = [...previousTokens];
      const poppedToken = newPreviousTokens.pop();
      const previousPageToken = poppedToken !== undefined ? poppedToken : null;
      setPreviousTokens(newPreviousTokens);
      setCurrentPageToken(previousPageToken);
      
      fetchBooks(searchQuery || undefined, pageSize, previousPageToken);
    }
  };

  // Clubs disabled: no-op

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Keep filter in sync with current route
  useEffect(() => {
    if (location.pathname === '/my-books' && filter !== 'my-books') {
      setFilter('my-books');
      setMyPageIndex(0);
    } else if (location.pathname === '/' && filter !== 'all') {
      setFilter('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Watch for navigation state to open AddBookModal
  useEffect(() => {
    if (location.state && (location.state as any).openAddBooks) {
      setShowAddModal(true);
      // Clear the state to prevent reopening on refresh/back navigation
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.pathname, navigate]);

  // Derive displayed items and pagination flags
  const displayedBooks = filter === 'my-books'
    ? books.slice(myPageIndex * pageSize, myPageIndex * pageSize + pageSize)
    : books;
  const hasPrev = filter === 'my-books' ? myPageIndex > 0 : previousTokens.length > 0;
  const hasNext = filter === 'my-books' ? ((myPageIndex + 1) * pageSize) < books.length : hasNextPage;

  const handleBookAdded = (newBook: Book) => {
    setBooks([newBook, ...books]);
    setShowAddModal(false);
    // Move user to "My Books" after successful upload
    if (filter !== 'my-books') {
      setFilter('my-books');
      setMyPageIndex(0);
      navigate('/my-books');
    }
  };

  const handleBookDeleted = (bookId: string) => {
    setBooks(books.filter(book => book.bookId !== bookId));
  };

  const handleBookUpdated = (updatedBook: Book) => {
    setBooks(books.map(book => 
      book.bookId === updatedBook.bookId ? updatedBook : book
    ));
  };

  // Clubs disabled: removed related handlers

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
          <div className="flex gap-2">
            {/* Internal navigation buttons removed - users should use top navigation */}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('books')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'books'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BookOpenIcon className="h-4 w-4" />
                Books
              </button>
              {/* Clubs tab disabled */}
            </nav>
          </div>
        </div>

        {activeTab === 'books' ? (
          <>
            {/* Top Pagination - Show for both filters */}
            <div className="mb-4">
              <Pagination
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                hasNextPage={hasNext}
                hasPreviousPage={hasPrev}
                onNextPage={handleNextPage}
                onPreviousPage={handlePreviousPage}
                currentItemsCount={displayedBooks.length}
                isLoading={loading}
                totalCount={filter === 'my-books' ? books.length : totalCount}
                startIndex={
                  filter === 'my-books'
                    ? (myPageIndex * pageSize) + (displayedBooks.length ? 1 : 0)
                    : (previousTokens.length * pageSize) + (displayedBooks.length ? 1 : 0)
                }
              />
            </div>

            {error && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  {/* Filter buttons removed - navigation should be through top nav */}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md ${
                      viewMode === 'grid'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="Grid View"
                  >
                    <Squares2X2Icon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md ${
                      viewMode === 'list'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    title="List View"
                  >
                    <ListBulletIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Search Bar - Only show for "All Books" filter */}
            {filter === 'all' && (
              <div className="mb-6">
                <SearchBar 
                  onSearch={handleSearch}
                  placeholder="Search books by description..."
                  className="max-w-md mx-auto"
                />
              </div>
            )}

            {(!Array.isArray(books) || books?.length === 0) ? (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  {filter === 'my-books' 
                    ? "You haven't added any books yet. Click 'Add Books' to get started!"
                    : searchQuery 
                      ? `No books found matching "${searchQuery}".`
                      : "No books available. Be the first to add one!"
                  }
                </div>
              </div>
            ) : (
              <>
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
                }>
                  {displayedBooks.map((book) => (
                    filter === 'all' ? (
                      <PublicBookCard
                        key={book.bookId}
                        book={book}
                        // Using the same card in both views to ensure borrow/profile actions are available
                      />
                    ) : (
                      <BookCard
                        key={book.bookId}
                        book={book}
                        onDelete={handleBookDeleted}
                        onUpdate={handleBookUpdated}
                        showActions={user?.userId === book.userId}
                        listView={viewMode === 'list'}
                      />
                    )
                  ))}
                </div>
                
                {/* Bottom Pagination - Show for both filters */}
                <div className="mt-8">
                  <Pagination
                    pageSize={pageSize}
                    onPageSizeChange={handlePageSizeChange}
                    hasNextPage={hasNext}
                    hasPreviousPage={hasPrev}
                    onNextPage={handleNextPage}
                    onPreviousPage={handlePreviousPage}
                    currentItemsCount={displayedBooks.length}
                    isLoading={loading}
                    totalCount={filter === 'my-books' ? books.length : totalCount}
                    startIndex={
                      filter === 'my-books'
                        ? (myPageIndex * pageSize) + (displayedBooks.length ? 1 : 0)
                        : (previousTokens.length * pageSize) + (displayedBooks.length ? 1 : 0)
                    }
                  />
                </div>
              </>
            )}
          </>
        ) : null}

        {/* Modals */}
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
