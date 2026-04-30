import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Book } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PublicBookCard from '../components/PublicBookCard';
import SearchBar from '../components/SearchBar';
import SEO from '../components/SEO';

const FILTER_TYPES = [
  { key: 'all',   label: 'All Items', emoji: '🏛️' },
  { key: 'book',  label: 'Books',     emoji: '📚' },
  { key: 'toy',   label: 'Toys',      emoji: '🧸' },
  { key: 'tool',  label: 'Tools',     emoji: '🔧' },
  { key: 'game',  label: 'Games',     emoji: '🎮' },
  { key: 'event', label: 'Events',    emoji: '🎉' },
  { key: 'other', label: 'Misc',      emoji: '📦' },
];

const LibraryHub: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Book[]>([]);
  const [userClubIds, setUserClubIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { setUserClubIds(new Set()); return; }
    apiService.getUserClubs()
      .then(res => {
        const active = (res.items || []).filter((c: any) => (c?.userStatus || 'active') === 'active');
        setUserClubIds(new Set(active.map((c: any) => c.clubId)));
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.listBooksPublic({ limit: 60, bare: true });
      let all: Book[] = Array.isArray(response.items) ? response.items : [];

      if (isAuthenticated && user?.userId) {
        all = all.filter((i: any) => i.userId !== user.userId);
      }
      all = all.filter((i: any) => i.category !== 'lost_found');

      setItems(all);
    } catch (err: any) {
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.userId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = items.filter((i: any) => {
    // Only show club items if user is a member of that club
    if (i.clubId) {
      if (!isAuthenticated || !userClubIds.has(i.clubId)) return false;
    }
    const matchType = activeFilter === 'all'
      || i.category === activeFilter
      || (!i.category && activeFilter === 'book');
    const matchSearch = !search
      || (i.title || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Browse Library — Community Library"
        description="Browse books, toys, tools, games and more shared by your community."
      />

      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">Browse Library</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Items shared by your community — available to borrow
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="mb-4">
          <SearchBar
            onSearch={setSearch}
            placeholder="Search items…"
            value={search}
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6" style={{ scrollbarWidth: 'none' }}>
          {FILTER_TYPES.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveFilter(t.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                activeFilter === t.key
                  ? 'bg-indigo-600 text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Count */}
        {!loading && (
          <p className="text-xs text-gray-400 mb-3">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* States */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-600 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-bold text-gray-700">No items found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different filter or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((item: any) => (
              <PublicBookCard key={(item as any).bookId || (item as any).listingId} book={item} isMemberOfBookClub={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryHub;
