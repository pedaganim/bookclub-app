import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book, BookClub } from '../types';
import { apiService } from '../services/api';
import PublicBookCard from '../components/PublicBookCard';

const ClubBooks: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [club, setClub] = useState<BookClub | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchClub = useCallback(async () => {
    if (!clubId) return;
    try {
      const res = await apiService.getClub(clubId);
      setClub(res);
    } catch {
      // club info is optional — continue without it
    }
  }, [clubId]);

  const fetchBooks = useCallback(async (token?: string | null) => {
    if (!clubId) return;
    try {
      const res = await apiService.listBooksByClub(clubId, { limit: 50, nextToken: token || undefined });
      setBooks(prev => token ? [...prev, ...(res.items as Book[])] : (res.items as Book[]));
      setNextToken(res.nextToken || null);
    } catch (e: any) {
      setError(e.message || 'Failed to load books');
    }
  }, [clubId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchClub(), fetchBooks(null)]);
      setLoading(false);
    };
    init();
  }, [fetchClub, fetchBooks]);

  const handleLoadMore = async () => {
    if (!nextToken || loadingMore) return;
    setLoadingMore(true);
    await fetchBooks(nextToken);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading books…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/clubs')}
            className="text-sm text-indigo-600 hover:text-indigo-800 mb-3 inline-flex items-center gap-1"
          >
            ← Back to Clubs
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {club ? club.name : 'Club'} — Books
          </h1>
          {club?.description && (
            <p className="mt-1 text-gray-600">{club.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">{books.length} book{books.length !== 1 ? 's' : ''} in this club</p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {books.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No books have been added to this club yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => (
                <PublicBookCard key={book.bookId} book={book} isMemberOfBookClub={!!club?.isMember} />
              ))}
            </div>
            {nextToken && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClubBooks;
