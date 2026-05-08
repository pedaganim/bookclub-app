import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book, BookClub } from '../types';
import { apiService } from '../services/api';
import PublicBookCard from '../components/PublicBookCard';
import { useAuth } from '../contexts/AuthContext';
import { ArchiveBoxIcon, UserPlusIcon, UsersIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import InviteByEmailModal from '../components/InviteByEmailModal';

const ClubBooks: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [club, setClub] = useState<BookClub | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const scrollRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});

  const fetchClub = useCallback(async () => {
    if (!clubId) return;
    try {
      const res = await apiService.getClub(clubId);
      setClub(res);
    } catch {
      // club info is optional — continue without it
    }
  }, [clubId]);

  // Re-fetch club when authentication changes to get membership status
  useEffect(() => {
    if (isAuthenticated) {
      fetchClub();
    }
  }, [isAuthenticated, fetchClub]);

  const handleRequestJoin = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    if (!clubId) return;
    try {
      setJoining(true);
      setJoinError('');
      await apiService.requestClubJoin(clubId);
      setClub(prev => prev ? { ...prev, userStatus: 'pending' } : prev);
    } catch (e: any) {
      setJoinError(e.message || 'Failed to send join request');
    } finally {
      setJoining(false);
    }
  };

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

  // Helper to group books by category
  const groupedItems = books.reduce((acc, book) => {
    const category = book.category || 'book';
    if (!acc[category]) acc[category] = [];
    acc[category].push(book);
    return acc;
  }, {} as Record<string, Book[]>);

  // Define display names for categories
  const categoryLabels: Record<string, string> = {
    book: '📚 Books',
    toy: '🧸 Toys',
    tool: '🛠️ Tools',
    game: '🎲 Games',
    event_hire: '🎉 Event Hire',
    other: '✨ Other Items'
  };

  // Scroll functions for horizontal scrolling
  const scrollLeft = (category: string) => {
    const element = scrollRefs.current[category];
    if (element) {
      element.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = (category: string) => {
    const element = scrollRefs.current[category];
    if (element) {
      element.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading library…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(isAuthenticated ? '/clubs' : '/clubs/browse')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-4 inline-flex items-center gap-1 group transition-colors"
          >
            <span className="transform group-hover:-translate-x-1 transition-transform">←</span> Back to Clubs
          </button>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {club ? club.name : 'Community'} Library
              </h1>
              {club?.description && (
                <p className="mt-2 text-lg text-gray-600 max-w-2xl">{club.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 self-start flex-wrap">
              <div className="bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-600">
                  <span className="text-indigo-600 font-bold">{books.length}</span> items available
                </p>
              </div>

              {/* Join / pending for non-members */}
              {club && !club.isMember && club.userRole !== 'admin' && club.createdBy !== user?.userId && club.userStatus !== 'active' && (
                club.userStatus === 'pending' ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Request Sent
                  </span>
                ) : (
                  <button
                    onClick={handleRequestJoin}
                    disabled={joining}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <UserPlusIcon className="h-4 w-4" />
                    {joining ? 'Sending…' : (isAuthenticated ? 'Request to Join' : 'Join Club')}
                  </button>
                )
              )}

              {club && (club.isMember || club.userRole === 'admin') && (
                <button
                  onClick={() => navigate(`/clubs/${clubId}/members`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <UsersIcon className="h-4 w-4 text-gray-400" />
                  {club.userRole === 'admin' ? 'Manage Members' : 'View Members'}
                </button>
              )}

              {club && (club.userRole === 'admin' || club.createdBy === user?.userId) && (
                <button
                  onClick={() => setShowInvite(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm"
                >
                  <EnvelopeIcon className="h-4 w-4" />
                  Invite Members
                </button>
              )}
            </div>
          </div>
        </div>

        {joinError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 border border-red-100">
            <p className="text-sm text-red-700">{joinError}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-100">
            <div className="flex items-center gap-2 text-red-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {books.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <ArchiveBoxIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Virtual shelves are empty</h3>
            <p className="text-gray-500 mt-1">No items have been shared in this club yet.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedItems).map(([category, items]) => (
              <section key={category} className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    {categoryLabels[category] || category}
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {items.length}
                    </span>
                  </h2>
                </div>

                {/* Horizontal Scroll Container */}
                <div className="relative group">
                  <div 
                    ref={(el) => { if (el) scrollRefs.current[category] = el; }}
                    className="flex overflow-x-auto pb-4 gap-6 scrollbar-hide snap-x"
                  >
                    {items.map((item) => (
                      <div key={item.bookId} className="w-[280px] shrink-0 snap-start">
                        <PublicBookCard book={item} isMemberOfBookClub={!!club?.isMember} />
                      </div>
                    ))}
                  </div>
                  
                  {/* Scroll Left Button */}
                  {items.length > 3 && (
                    <button
                      onClick={() => scrollLeft(category)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white border border-gray-200 rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100"
                      aria-label="Scroll left"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  
                  {/* Scroll Right Button */}
                  {items.length > 3 && (
                    <button
                      onClick={() => scrollRight(category)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white border border-gray-200 rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100"
                    aria-label="Scroll right"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  )}
                  <div className="absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none opacity-100 transition-opacity" />
                  {/* Left fade indicator when scrolled */}
                  <div className="absolute top-0 left-0 h-full w-12 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none opacity-0 transition-opacity" />
                </div>
              </section>
            ))}

            {nextToken && (
              <div className="mt-12 flex justify-center pb-8 border-t border-gray-100 pt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-white border border-gray-300 rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-all shadow-sm hover:shadow"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-indigo-600" />
                      Loading…
                    </>
                  ) : (
                    <>
                      Explore More Items
                      <span className="text-gray-400">↓</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showInvite && club && (
        <InviteByEmailModal
          clubId={club.clubId}
          clubName={club.name}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
};


export default ClubBooks;
