import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { ToyListing } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ToyListingCard from '../components/ToyListingCard';
import CreateToyListingModal from '../components/CreateToyListingModal';

type TabId = 'browse' | 'mine';

const EMPTY_BROWSE = (
  <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-gray-500">
    <span className="text-5xl mb-4">🧸</span>
    <p className="text-lg font-medium text-gray-700">No toys listed yet</p>
    <p className="text-sm mt-1">Be the first to post a toy and start swapping!</p>
  </div>
);

const EMPTY_MINE = (
  <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-gray-500">
    <span className="text-5xl mb-4">🎁</span>
    <p className="text-lg font-medium text-gray-700">You haven't posted any toys yet</p>
    <p className="text-sm mt-1">Click <strong>"Post a Toy"</strong> to list a toy you'd like to swap.</p>
  </div>
);

const SwapToys: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabId>('browse');
  const [listings, setListings] = useState<ToyListing[]>([]);
  const [myListings, setMyListings] = useState<ToyListing[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // SEO
  useEffect(() => {
    document.title = 'Toy Library — BookClub';
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'Browse the Toy Library and swap toys with families in your local community. Post a toy you no longer need and find a new favourite.');
  }, []);

  // Load all listings
  const loadListings = useCallback(async (token?: string) => {
    try {
      if (!token) setIsLoading(true); else setIsLoadingMore(true);
      setError('');
      const res = await apiService.listToyListings({ limit: 24, nextToken: token });
      setListings((prev) => token ? [...prev, ...res.items] : res.items);
      setNextToken(res.nextToken);
    } catch (e: any) {
      setError(e?.message || 'Failed to load listings. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Load user's own listings
  const loadMyListings = useCallback(async () => {
    if (!user?.userId) return;
    try {
      setIsLoading(true);
      setError('');
      const res = await apiService.listToyListings({ userId: user.userId, limit: 50 });
      setMyListings(res.items);
    } catch (e: any) {
      setError(e?.message || 'Failed to load your listings.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (tab === 'browse') {
      loadListings();
    } else if (tab === 'mine') {
      loadMyListings();
    }
  }, [tab, loadListings, loadMyListings]);

  const handleCreated = (listing: ToyListing) => {
    setShowModal(false);
    setListings((prev) => [listing, ...prev]);
    setMyListings((prev) => [listing, ...prev]);
  };

  const handleDelete = async (listingId: string) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    setDeletingId(listingId);
    try {
      await apiService.deleteToyListing(listingId);
      setMyListings((prev) => prev.filter((l) => l.listingId !== listingId));
      setListings((prev) => prev.filter((l) => l.listingId !== listingId));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete listing.');
    } finally {
      setDeletingId(null);
    }
  };

  const activeListings = tab === 'browse' ? listings : myListings;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📚 Toy Library</h1>
            <p className="mt-1 text-gray-600 text-sm">
              Give toys a second life — swap with families in your community.
            </p>
          </div>
          {isAuthenticated ? (
            <button
              id="post-toy-btn"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Post a Toy
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-300 text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              Sign in to post
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button
            id="tab-browse"
            onClick={() => setTab('browse')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'browse'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Browse All
          </button>
          {isAuthenticated && (
            <button
              id="tab-mine"
              onClick={() => setTab('mine')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'mine'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Listings
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-5 bg-gray-200 rounded w-4/5 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full mb-1" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Listings grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeListings.length === 0
              ? (tab === 'browse' ? EMPTY_BROWSE : EMPTY_MINE)
              : activeListings.map((listing) => (
                  <ToyListingCard
                    key={listing.listingId}
                    listing={listing}
                    onDelete={tab === 'mine' ? handleDelete : undefined}
                    isDeleting={deletingId === listing.listingId}
                  />
                ))}
          </div>
        )}

        {/* Load more */}
        {!isLoading && tab === 'browse' && nextToken && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => loadListings(nextToken)}
              disabled={isLoadingMore}
              className="px-6 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <CreateToyListingModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};

export default SwapToys;
