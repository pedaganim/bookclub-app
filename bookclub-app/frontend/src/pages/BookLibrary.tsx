import React, { useState, useEffect, useCallback } from 'react';
import { Book, BookClub } from '../types';
import { apiService } from '../services/api';
import PublicBookCard from '../components/PublicBookCard';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

const BookLibrary: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [previousTokens, setPreviousTokens] = useState<(string | null)[]>([]);
  const [currentPageToken, setCurrentPageToken] = useState<string | null>(null);
  // Track counts of items actually shown on each visited page to compute accurate ranges
  const [previousPageCounts, setPreviousPageCounts] = useState<number[]>([]);
  const [shownBeforeCurrent, setShownBeforeCurrent] = useState<number>(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const { isAuthenticated, user } = useAuth();
  const [userClubs, setUserClubs] = useState<BookClub[]>([]);
  const [userClubIdSet, setUserClubIdSet] = useState<Set<string>>(new Set());
  const [ageGroupFine, setAgeGroupFine] = useState<string>('');

  const fetchBooks = useCallback(async (search?: string, currentPageSize?: number, token?: string | null, age?: string) => {
    try {
      setLoading(true);
      setError('');
      // Make public request without userId to get all books
      const response = await apiService.listBooksPublic({ 
        search, 
        limit: currentPageSize || pageSize,
        nextToken: token || undefined,
        ageGroupFine: age && age.length ? age : undefined,
        bare: true,
      });
      const desired = currentPageSize || pageSize;
      let items = Array.isArray(response.items) ? response.items : [];
      let filtered = (isAuthenticated && user?.userId)
        ? items.filter((b) => b.userId !== user.userId)
        : items;
      // Top up the page to the desired count if client-side filters removed items
      let tokenLocal: string | undefined = response.nextToken || undefined;
      while (filtered.length < desired && tokenLocal) {
        const resp = await apiService.listBooksPublic({
          search,
          limit: desired,
          nextToken: tokenLocal,
          ageGroupFine: age && age.length ? age : undefined,
          bare: true,
        });
        const batch = Array.isArray(resp.items) ? resp.items : [];
        const batchFiltered = (isAuthenticated && user?.userId)
          ? batch.filter((b) => b.userId !== user.userId)
          : batch;
        filtered = filtered.concat(batchFiltered);
        tokenLocal = resp.nextToken || undefined;
      }
      // Trim to desired page size for display
      const pageItems = filtered.slice(0, desired);
      setBooks(pageItems);
      const hasMore = !!tokenLocal;
      setHasNextPage(hasMore);
      setNextToken(tokenLocal || null);

      // Skip computing total count for performance
    } catch (err: any) {
      setError(err.message || 'Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, [pageSize, currentPageToken, isAuthenticated, user?.userId]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Reset pagination when searching
    setPreviousTokens([]);
    setNextToken(null);
    setCurrentPageToken(null);
    setPreviousPageCounts([]);
    setShownBeforeCurrent(0);
    setTotalCount(undefined);
    fetchBooks(query || undefined, pageSize, null, ageGroupFine);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    // Reset pagination when changing page size
    setPreviousTokens([]);
    setNextToken(null);
    setCurrentPageToken(null);
    setPreviousPageCounts([]);
    setShownBeforeCurrent(0);
    setTotalCount(undefined);
    fetchBooks(searchQuery || undefined, newPageSize, null, ageGroupFine);
  };

  const handleNextPage = () => {
    if (hasNextPage && nextToken) {
      // Store current page's starting token and count in history for going back
      setPreviousTokens(prev => [...prev, currentPageToken]);
      setPreviousPageCounts(prev => [...prev, books.length]);
      setShownBeforeCurrent(prev => prev + books.length);
      setCurrentPageToken(nextToken);
      fetchBooks(searchQuery || undefined, pageSize, nextToken, ageGroupFine);
    }
  };

  const handlePreviousPage = () => {
    if (previousTokens.length > 0) {
      // Get the previous page's starting token
      const newPreviousTokens = [...previousTokens];
      const poppedToken = newPreviousTokens.pop();
      const previousPageToken = poppedToken !== undefined ? poppedToken : null;
      setPreviousTokens(newPreviousTokens);
      // Adjust shown count using the count stack
      const newCounts = [...previousPageCounts];
      const lastCount = newCounts.pop() || 0;
      setPreviousPageCounts(newCounts);
      setShownBeforeCurrent(prev => Math.max(0, prev - lastCount));
      setCurrentPageToken(previousPageToken);
      
      fetchBooks(searchQuery || undefined, pageSize, previousPageToken, ageGroupFine);
    }
  };

  useEffect(() => {
    fetchBooks(undefined, pageSize, null, ageGroupFine);
  }, [fetchBooks]);

  // Load user's clubs to determine membership for Join vs Borrow action
  useEffect(() => {
    (async () => {
      if (!isAuthenticated) {
        setUserClubs([]);
        setUserClubIdSet(new Set());
        return;
      }
      try {
        const res = await apiService.getUserClubs();
        const items = res.items || [];
        setUserClubs(items);
        setUserClubIdSet(new Set(items.map((c) => c.clubId)));
      } catch {
        setUserClubs([]);
        setUserClubIdSet(new Set());
      }
    })();
  }, [isAuthenticated]);

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
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Library</h1>
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
            startIndex={shownBeforeCurrent + (books.length ? 1 : 0)}
          />
        </div>

        {/* Filters + Search */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Audience</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              value={ageGroupFine}
              onChange={(e) => {
                const val = e.target.value;
                setAgeGroupFine(val);
                // Reset pagination when changing audience filter
                setPreviousTokens([]);
                setNextToken(null);
                setCurrentPageToken(null);
                setPreviousPageCounts([]);
                setShownBeforeCurrent(0);
                setTotalCount(undefined);
                fetchBooks(searchQuery || undefined, pageSize, null, val);
              }}
            >
              <option value="">All</option>
              <option value="preschool">Preschool (3–5)</option>
              <option value="early_reader">Early Reader (6–8)</option>
              <option value="middle_grade">Middle Grade (8–12)</option>
              <option value="young_adult">Young Adult (13–17)</option>
              <option value="adult">Adult (18+)</option>
            </select>
          </div>
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search books..."
            className="sm:col-span-2"
            value={searchQuery}
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
                  isMemberOfBookClub={book.clubId ? userClubIdSet.has(book.clubId) : true}
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
                startIndex={shownBeforeCurrent + (books.length ? 1 : 0)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookLibrary;