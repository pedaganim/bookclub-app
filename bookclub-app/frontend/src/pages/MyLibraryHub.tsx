import React, { useEffect, useState, useCallback } from 'react';
import { LIBRARY_CONFIGS } from '../config/libraryConfig';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useUploadModal } from '../contexts/UploadModalContext';
import ManagementItemCard from '../components/ManagementItemCard';
import SearchBar from '../components/SearchBar';
import { LibraryItem } from '../types';
import SEO from '../components/SEO';

const DISPLAY_CONFIGS = LIBRARY_CONFIGS.filter(c => c.libraryType !== 'lost_found');

const FILTER_CHIPS = [
  { key: 'all', label: 'All', emoji: '📦' },
  ...DISPLAY_CONFIGS.map(c => ({ key: c.libraryType, label: c.shortLabel, emoji: c.emoji })),
];

const MyLibraryHub: React.FC = () => {
  const { user } = useAuth();
  const { openModal } = useUploadModal();
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const allResults = await Promise.all(
        LIBRARY_CONFIGS.map(cfg =>
          apiService.listToyListings({ userId: user.userId, libraryType: cfg.libraryType, limit: 100 })
            .then((r: any) => r.items || [])
            .catch(() => [] as LibraryItem[])
        )
      );
      setItems(allResults.flat());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter((i: any) => (i.bookId || i.listingId) !== id));
  };
  const handleUpdate = (updated: LibraryItem) => {
    setItems(prev => prev.map((i: any) => {
      const id = i.bookId || i.listingId;
      const updId = (updated as any).bookId || (updated as any).listingId;
      return id === updId ? updated : i;
    }));
  };

  const counts: Record<string, number> = { all: items.length };
  LIBRARY_CONFIGS.forEach(cfg => {
    counts[cfg.libraryType] = items.filter((i: any) =>
      i.libraryType === cfg.libraryType || i.category === cfg.libraryType
    ).length;
  });

  const filtered = items.filter((i: any) => {
    const matchType = activeFilter === 'all' || i.libraryType === activeFilter || i.category === activeFilter;
    const matchSearch = !search || (i.title || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="My Library — Manage My Items"
        description="Manage your books, toys, tools, and other shared items in one place."
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">My Library</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Everything you're sharing with the community</p>
            </div>
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add to Library
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stat tiles */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 mb-6">
          {[{ key: 'all', label: 'All', emoji: '📦' }, ...DISPLAY_CONFIGS.map(c => ({ key: c.libraryType, label: c.shortLabel, emoji: c.emoji }))].map(tile => (
            <button
              key={tile.key}
              onClick={() => setActiveFilter(tile.key)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                activeFilter === tile.key
                  ? 'bg-indigo-600 text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-700 border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="text-xl mb-0.5">{tile.emoji}</span>
              <span className={`text-lg font-black leading-none ${activeFilter === tile.key ? 'text-white' : 'text-gray-900'}`}>
                {counts[tile.key] ?? 0}
              </span>
              <span className={`text-[10px] font-semibold mt-0.5 ${activeFilter === tile.key ? 'text-indigo-200' : 'text-gray-400'}`}>
                {tile.label}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <SearchBar
            onSearch={setSearch}
            placeholder="Search my items…"
            value={search}
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5" style={{ scrollbarWidth: 'none' }}>
          {FILTER_CHIPS.map(t => (
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">�</p>
            <p className="font-bold text-gray-700">
              {activeFilter === 'all' ? 'No items yet' : `No ${FILTER_CHIPS.find(f => f.key === activeFilter)?.label?.toLowerCase() || ''} items`}
            </p>
            <p className="text-sm text-gray-400 mt-1 mb-6">Start sharing with your community</p>
            <button
              onClick={openModal}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Add to Library
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((item: any) => (
              <ManagementItemCard
                key={(item as any).bookId || (item as any).listingId}
                item={item}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLibraryHub;
