import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import { LibraryConfig, getLibraryConfig } from '../config/libraryConfig';
import { apiService } from '../services/api';
import { Book } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useSubdomain } from '../hooks/useSubdomain';
import PublicBookCard from '../components/PublicBookCard';
import CreateListingModal from '../components/CreateListingModal';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import SEO from '../components/SEO';

interface LibraryPageProps {
  config?: LibraryConfig;
}

const PAGE_SIZE = 25;

const LibraryPage: React.FC<LibraryPageProps> = ({ config: propConfig }) => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { isSubdomain, club } = useSubdomain();

  const location = useLocation();
  const config = propConfig || getLibraryConfig(categorySlug || 'books');
  
  const [items, setItems] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(location.state?.openAddModal || false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [previousTokens, setPreviousTokens] = useState<(string | null)[]>([]);
  const [currentPageToken, setCurrentPageToken] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount] = useState<number | undefined>(undefined);
  
  const [userClubIdSet, setUserClubIdSet] = useState<Set<string>>(new Set());
  const [accessibleOwnerIdSet, setAccessibleOwnerIdSet] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async (search?: string, currentPageSize?: number, token?: string | null) => {
    if (!config) return;
    try {
      setLoading(true);
      setError('');
      
      const browseParams = {
        limit: currentPageSize || PAGE_SIZE,
        nextToken: token || undefined,
        search: search || undefined,
        // If it's a subdomain, filter by club
        clubId: (isSubdomain && club) ? club.clubId : undefined,
        // Filter by category
        bare: true as const,
      };
      const response = isAuthenticated
        ? await apiService.listBooks(browseParams)
        : await apiService.listBooksPublic(browseParams);

      let items = Array.isArray(response.items) ? response.items : [];
      
      // Category filtering (the backend might already do this via 'bare' or specific params, but we ensure it here)
      if (config.libraryType !== 'all') {
        items = items.filter(i => i.category === config.libraryType || (!i.category && config.libraryType === 'book'));
      }

      // Client side filter: don't show user's own items in public browse
      if (isAuthenticated && user?.userId) {
        items = items.filter(i => i.userId !== user.userId);
      }

      setItems(items);
      setHasNextPage(!!response.nextToken);
      setNextToken(response.nextToken || null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [config, isSubdomain, club, isAuthenticated, user?.userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Load user's clubs + all member IDs from those clubs for borrow-gating
  useEffect(() => {
    if (!isAuthenticated) {
      setUserClubIdSet(new Set());
      setAccessibleOwnerIdSet(new Set());
      return;
    }
    apiService.getUserClubs().then(async (res) => {
      const active = (res.items || []).filter((c: any) => (c?.userStatus || 'active') === 'active');
      setUserClubIdSet(new Set(active.map((c: any) => c.clubId)));
      // Load member IDs from all active clubs so we can gate items with no clubId
      const memberLists = await Promise.all(
        active.map((c: any) => apiService.listMembers(c.clubId).catch(() => ({ items: [] })))
      );
      const allMemberIds = new Set<string>(
        memberLists.flatMap((r: any) => (r.items || []).map((m: any) => m.userId))
      );
      setAccessibleOwnerIdSet(allMemberIds);
    }).catch(() => {});
  }, [isAuthenticated]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setPreviousTokens([]);
    setNextToken(null);
    setCurrentPageToken(null);
    fetchItems(q || undefined, PAGE_SIZE, null);
  };



  const handleNextPage = () => {
    if (hasNextPage && nextToken) {
      setPreviousTokens(prev => [...prev, currentPageToken]);
      setCurrentPageToken(nextToken);
      fetchItems(searchQuery || undefined, PAGE_SIZE, nextToken);
    }
  };

  const handlePreviousPage = () => {
    if (previousTokens.length > 0) {
      const newPreviousTokens = [...previousTokens];
      const previousPageToken = newPreviousTokens.pop() || null;
      setPreviousTokens(newPreviousTokens);
      setCurrentPageToken(previousPageToken);
      fetchItems(searchQuery || undefined, PAGE_SIZE, previousPageToken);
    }
  };

  const handleCreated = (item: any) => {
    setShowModal(false);
    addNotification('success', `${config?.itemLabel} posted!`);
    // Navigate to manage page to see their new item
    navigate(`/my-library/${config?.slug}`);
  };

  // Only show club items if the user is an active member of that club
  const displayedItems = items.filter(item => {
    if ((item as any).clubId) {
      return isAuthenticated && userClubIdSet.has((item as any).clubId);
    }
    return true;
  });

  if (!config) return <div className="p-20 text-center text-gray-500 font-medium tracking-tight">Library not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEO 
        title={config.pageTitle}
        description={config.metaDescription}
      />
      
      {/* Premium Hero with Breadcrumbs */}
      <div className="bg-white border-b border-gray-100 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                <Link to="/library" className="hover:text-indigo-600 transition-colors">All Libraries</Link>
                <span>/</span>
                <span className="text-gray-900">{config.shortLabel}</span>
              </nav>
              
              <div className="flex items-center flex-wrap gap-4 mb-4">
                <span className="text-5xl sm:text-6xl flex-shrink-0" role="img" aria-label={config.label}>{config.emoji}</span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-none uppercase italic break-words">
                  {config.label}
                </h1>
              </div>
              <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
                {config.description}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {isAuthenticated ? (
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-tight hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {config.postLabel}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-tight hover:bg-black transition-all shadow-xl shadow-gray-200"
                >
                  Sign in to post
                </button>
              )}
              <Link
                to={`/my-library/${config.slug}`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
              >
                My {config.shortLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Search and Filters Bar */}
        <div className="flex flex-col gap-6 mb-10">
          <div className="w-full">
            <SearchBar
              onSearch={handleSearch}
              placeholder={config.searchPlaceholder}
              value={searchQuery}
            />
          </div>
          
          <div className="w-full">
              <Pagination
                pageSize={PAGE_SIZE}
                onPageSizeChange={() => {}} // Fixed for simplicity
                hasNextPage={hasNextPage}
                hasPreviousPage={previousTokens.length > 0}
                onNextPage={handleNextPage}
                onPreviousPage={handlePreviousPage}
                currentItemsCount={items.length}
                isLoading={loading}
                totalCount={totalCount}
                startIndex={(previousTokens.length * PAGE_SIZE) + (items.length ? 1 : 0)}
              />
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" role="status" aria-label="Loading library items">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-pulse aspect-[4/5]" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-3xl p-10 text-center">
             <span className="text-4xl mb-4 block">⚠️</span>
             <h3 className="text-lg font-bold text-red-900 mb-2">Something went wrong</h3>
             <p className="text-red-700">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-gray-100/50 rounded-3xl border-2 border-dashed border-gray-200 py-32 text-center">
             <span className="text-6xl mb-6 block opacity-20">{config.emoji}</span>
             <h3 className="text-2xl font-bold text-gray-900 mb-2">No {config.itemLabelPlural} found</h3>
             <p className="text-gray-500 max-w-sm mx-auto">
                {searchQuery 
                  ? `We couldn't find any ${config.itemLabelPlural} matching "${searchQuery}".`
                  : config.emptyBrowseText}
             </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
            {displayedItems.map((item) => (
               <PublicBookCard
                 key={item.bookId}
                 book={item}
                 isMemberOfBookClub={true}
               />
            ))}
          </div>
        )}
        
        {/* Bottom Pagination */}
        {!loading && items.length > 0 && (
          <div className="mt-16 flex justify-center">
            <Pagination
                pageSize={PAGE_SIZE}
                onPageSizeChange={() => {}} 
                hasNextPage={hasNextPage}
                hasPreviousPage={previousTokens.length > 0}
                onNextPage={handleNextPage}
                onPreviousPage={handlePreviousPage}
                currentItemsCount={items.length}
                isLoading={loading}
                totalCount={totalCount}
                startIndex={(previousTokens.length * PAGE_SIZE) + 1}
              />
          </div>
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
