import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LibraryConfig } from '../config/libraryConfig';
import { apiService } from '../services/api';
import { ToyListing } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import LibraryItemCard from '../components/LibraryItemCard';
import CreateListingModal from '../components/CreateListingModal';
import SearchBar from '../components/SearchBar';
import SEO from '../components/SEO';

interface LibraryPageProps {
  config: LibraryConfig;
}

type TabId = 'browse' | 'mine';

const PAGE_SIZE = 24;

const LibraryPage: React.FC<LibraryPageProps> = ({ config }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [tab, setTab] = useState<TabId>('browse');
  const [listings, setListings] = useState<ToyListing[]>([]);
  const [myListings, setMyListings] = useState<ToyListing[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // SEO logic moved to SEO component in render

  const loadListings = useCallback(async (token?: string, search?: string) => {
    try {
      if (!token) setIsLoading(true);
      else setIsLoadingMore(true);
      setError('');
      const res = await apiService.listToyListings({
        libraryType: config.libraryType,
        limit: PAGE_SIZE,
        nextToken: token,
      });
      setListings((prev) => token ? [...prev, ...res.items] : res.items);
      setNextToken(res.nextToken);
    } catch (e: any) {
      setError(e?.message || 'Failed to load listings.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [config.libraryType]);

  const loadMyListings = useCallback(async () => {
    if (!user?.userId) return;
    try {
      setIsLoading(true);
      setError('');
      const res = await apiService.listToyListings({
        userId: user.userId,
        libraryType: config.libraryType,
        limit: 50,
      });
      setMyListings(res.items);
    } catch (e: any) {
      setError(e?.message || 'Failed to load your listings.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId, config.libraryType]);

  useEffect(() => {
    if (tab === 'browse') loadListings(undefined, searchQuery || undefined);
    else loadMyListings();
  }, [tab, loadListings, loadMyListings]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    loadListings(undefined, q || undefined);
  };

  const handleCreated = (listing: ToyListing) => {
    setShowModal(false);
    setListings((prev) => [listing, ...prev]);
    setMyListings((prev) => [listing, ...prev]);
    addNotification('success', `${config.postLabel.replace('Post', '').trim()} posted!`);
  };

  const handleDelete = async (listingId: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${config.itemLabel}?`)) return;
    setDeletingId(listingId);
    try {
      await apiService.deleteToyListing(listingId);
      setMyListings((prev) => prev.filter((l) => l.listingId !== listingId));
      setListings((prev) => prev.filter((l) => l.listingId !== listingId));
      addNotification('success', 'Listing deleted.');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete listing.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleContact = async (listing: ToyListing) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (listing.userId === user?.userId) {
      addNotification('info', 'This is your own listing.');
      return;
    }
    setContactingId(listing.listingId);
    try {
      const conversation = await apiService.dmCreateConversation(listing.userId);
      const message = `Hi! I'm interested in your ${config.itemLabel} "${listing.title}". Is it still available?`;
      await apiService.dmSendMessage(conversation.conversationId, listing.userId, message);
      addNotification('success', 'Message sent! Opening chat…');
      navigate(`/messages/${conversation.conversationId}`);
    } catch {
      addNotification('error', 'Could not start a chat. Try again.');
    } finally {
      setContactingId(null);
    }
  };

  const activeListings = tab === 'browse' ? listings : myListings;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title={config.pageTitle}
        description={config.metaDescription}
      />
      {/* Hero */}
      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Link to="/library" className="hover:text-indigo-600 transition-colors">All Libraries</Link>
                <span>/</span>
                <span className="text-gray-700 font-medium">{config.label}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{config.emoji} {config.label}</h1>
              <p className="mt-1 text-gray-600 text-sm">{config.description}</p>
            </div>
            {isAuthenticated ? (
              <button
                id={`post-${config.libraryType}-btn`}
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {config.postLabel}
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-300 text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition-colors whitespace-nowrap"
              >
                Sign in to post
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
            <button
              id={`tab-browse-${config.libraryType}`}
              onClick={() => setTab('browse')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'browse' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Browse All
            </button>
            {isAuthenticated && (
              <button
                id={`tab-mine-${config.libraryType}`}
                onClick={() => setTab('mine')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'mine' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                My Listings
              </button>
            )}
          </div>

          {tab === 'browse' && (
            <div className="flex-1 max-w-sm">
              <SearchBar
                onSearch={handleSearch}
                placeholder={config.searchPlaceholder}
                value={searchQuery}
              />
            </div>
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
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
                <div className="bg-gray-200" style={{ aspectRatio: '4/3' }} />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-4/5" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!isLoading && (
          <>
            {activeListings.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                <span className="text-5xl mb-4">{config.emoji}</span>
                <p className="text-lg font-medium text-gray-700">
                  {tab === 'browse' ? `No ${config.itemLabelPlural} listed yet` : `No ${config.itemLabelPlural} posted`}
                </p>
                <p className="text-sm text-gray-500 mt-1 max-w-xs">
                  {tab === 'browse' ? config.emptyBrowseText : config.emptyMineText}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeListings.map((listing) => (
                  <LibraryItemCard
                    key={listing.listingId}
                    listing={listing}
                    emoji={config.emoji}
                    onDelete={tab === 'mine' ? handleDelete : undefined}
                    onContact={tab === 'browse' ? handleContact : undefined}
                    isDeleting={deletingId === listing.listingId}
                    isContacting={contactingId === listing.listingId}
                  />
                ))}
              </div>
            )}

            {/* Load more */}
            {tab === 'browse' && nextToken && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => loadListings(nextToken, searchQuery || undefined)}
                  disabled={isLoadingMore}
                  className="px-6 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  {isLoadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <CreateListingModal
          config={config}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};

export default LibraryPage;
