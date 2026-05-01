import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { LibraryItem } from '../types';
import { apiService } from '../services/api';
import ManagementItemCard from '../components/ManagementItemCard';
import Pagination from '../components/Pagination';
import AddBookModal from '../components/AddBookModal';
import CreateListingModal from '../components/CreateListingModal';
import { useAuth } from '../contexts/AuthContext';
import { getLibraryConfig, LIBRARY_CONFIGS } from '../config/libraryConfig';
import { 
  Squares2X2Icon, 
  ListBulletIcon,
  PlusIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import SEO from '../components/SEO';

const MyItemsPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { user } = useAuth();
  const location = useLocation();

  const isAllView = categorySlug === 'all';
  const config = isAllView ? null : getLibraryConfig(categorySlug || 'books');
  const label = isAllView ? 'All Items' : (config?.shortLabel || 'Items');
  const itemLabel = isAllView ? 'item' : (config?.itemLabel || 'item');
  
  const initialFilter = (location.state as any)?.filter;
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'owned' | 'lent' | 'borrowed'>(
    initialFilter === 'lent' || initialFilter === 'borrowed' ? initialFilter : 'owned'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [pageSize, setPageSize] = useState(12);
  const [myPageIndex, setMyPageIndex] = useState(0);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    if (!isAllView && !config) return;
    try {
      setLoading(true);

      if (isAllView) {
        // Fetch all categories in parallel and merge
        const allResults = await Promise.all(
          LIBRARY_CONFIGS.map(cfg =>
            apiService.listToyListings({ userId: user.userId, libraryType: cfg.libraryType, limit: 100 })
              .then(r => r.items || [])
              .catch(() => [] as LibraryItem[])
          )
        );
        setItems(allResults.flat());
        return;
      }

      const category = config!.libraryType;

      let response;
      if (filter === 'borrowed') {
        response = await apiService.listBooksBorrowedByMe({
          userId: user.userId,
          limit: 100,
        });
      } else {
        response = await apiService.listToyListings({
          userId: user.userId,
          libraryType: category,
          limit: 100,
        });
      }

      let fetchedItems: LibraryItem[] = Array.isArray(response.items) ? response.items : [];

      if (category === 'book') {
        if (filter === 'lent') {
           fetchedItems = fetchedItems.filter(i => (i as any).lentToUserId || (i as any).lentToUserName || (i as any).status === 'lent');
        } else if (filter === 'owned') {
           fetchedItems = fetchedItems.filter(i => !(i as any).lentToUserId && (i as any).status !== 'borrowed');
        }
      } else if (filter === 'borrowed') {
        fetchedItems = fetchedItems.filter(i => (i as any).category === category);
      }

      setItems(fetchedItems);
    } catch (err: any) {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [user, config, filter, isAllView]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleNextPage = () => {
    const maxIndex = Math.ceil(items.length / pageSize) - 1;
    setMyPageIndex((idx) => Math.min(idx + 1, Math.max(0, maxIndex)));
  };

  const handlePreviousPage = () => {
    setMyPageIndex((idx) => Math.max(0, idx - 1));
  };

  const handleItemAdded = (newItem: any) => {
    setItems(prev => [newItem, ...prev]);
    setShowAddModal(false);
    // Refresh to get any updated counts/statuses
    fetchItems();
  };

  const handleItemDeleted = async (id: string) => {
    try {
      await apiService.deleteBook(id);
      setItems(prev => prev.filter(i => ((i as any).bookId || (i as any).listingId) !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete item. Please try again.');
    }
  };

  const handleItemUpdated = (updated: any) => {
    setItems(prev => prev.map(i => ((i as any).bookId || (i as any).listingId) === updated.bookId ? updated : i));
  };

  if (!isAllView && !config) {
    return <div className="p-20 text-center">Category not found.</div>;
  }

  const displayedItems = items.slice(myPageIndex * pageSize, myPageIndex * pageSize + pageSize);
  const totalCount = items.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title={`My ${label} — Manage`} 
        description={`Manage your shared ${label.toLowerCase()} in the community library.`}
      />

      {/* Modern Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Link 
            to="/my-library"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors mb-4"
          >
            <ChevronLeftIcon className="h-4 w-4" /> Back to My Library
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="text-5xl" role="img" aria-label={label}>{isAllView ? '📦' : config!.emoji}</span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My {label}</h1>
                <p className="text-gray-500">{isAllView ? 'All items you are sharing across every category.' : `Manage the ${config!.itemLabelPlural} you're sharing.`}</p>
              </div>
            </div>

            {!isAllView && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                <PlusIcon className="h-5 w-5" /> Add {config!.shortLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          {!isAllView && (
          <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-full sm:w-auto">
            <button
              onClick={() => { setFilter('owned'); setMyPageIndex(0); }}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'owned' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Owned
            </button>
            <button
              onClick={() => { setFilter('lent'); setMyPageIndex(0); }}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'lent' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Lent
            </button>
            <button
              onClick={() => { setFilter('borrowed'); setMyPageIndex(0); }}
              className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'borrowed' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Borrowed
            </button>
          </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl border transition-all ${viewMode === 'grid' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-inner' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl border transition-all ${viewMode === 'list' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-inner' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading your {itemLabel}...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-20 text-center">
             <div className="text-5xl mb-6 opacity-20 grayscale">{isAllView ? '📦' : config!.emoji}</div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">No {itemLabel}s found</h3>
             <p className="text-gray-500 max-w-xs mx-auto mb-8">
               {isAllView
                 ? `You haven't listed any items yet.`
                 : filter === 'owned'
                 ? `You haven't listed any ${config!.itemLabelPlural} yet.`
                 : filter === 'lent'
                 ? `None of your ${config!.itemLabelPlural} are currently lent out.`
                 : `You aren't currently borrowing any ${config!.itemLabelPlural}.`}
             </p>
             {!isAllView && filter === 'owned' && (
               <button
                 onClick={() => setShowAddModal(true)}
                 className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
               >
                 Add your first {itemLabel}
               </button>
             )}
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
            }>
              {displayedItems.map((item) => (
                <ManagementItemCard
                  key={(item as any).bookId || (item as any).listingId}
                  item={item}
                  onDelete={handleItemDeleted}
                  onUpdate={handleItemUpdated}
                  listView={viewMode === 'list'}
                />
              ))}
            </div>

            <div className="mt-10">
              <Pagination
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                hasNextPage={(myPageIndex + 1) * pageSize < items.length}
                hasPreviousPage={myPageIndex > 0}
                onNextPage={handleNextPage}
                onPreviousPage={handlePreviousPage}
                currentItemsCount={displayedItems.length}
                isLoading={loading}
                totalCount={totalCount}
                startIndex={(myPageIndex * pageSize) + 1}
              />
            </div>
          </>
        )}
      </div>

      {showAddModal && !isAllView && (
        config!.libraryType === 'book' ? (
          <AddBookModal
            onClose={() => setShowAddModal(false)}
            onBookAdded={handleItemAdded}
          />
        ) : (
          <CreateListingModal
            config={config!}
            onClose={() => setShowAddModal(false)}
            onCreated={handleItemAdded}
          />
        )
      )}
    </div>
  );
};

export default MyItemsPage;
