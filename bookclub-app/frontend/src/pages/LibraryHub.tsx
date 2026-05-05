import React, { useCallback, useEffect, useState } from 'react';
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

interface UserClub {
  clubId: string;
  name: string;
  userStatus: string;
}

const LibraryHub: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userClubs, setUserClubs] = useState<UserClub[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [clubsLoading, setClubsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setClubsLoading(true);
    apiService.getUserClubs()
      .then((res: any) => {
        const active: UserClub[] = (res.items || []).filter((c: any) => c.userStatus === 'active');
        setUserClubs(active);
        if (active.length > 0) setSelectedClubId(active[0].clubId);
      })
      .catch(() => setUserClubs([]))
      .finally(() => setClubsLoading(false));
  }, [isAuthenticated]);

  const fetchItems = useCallback(async () => {
    if (isAuthenticated && !selectedClubId) return;
    try {
      setLoading(true);
      setError('');
      let all: Book[];
      if (isAuthenticated && selectedClubId) {
        const response = await apiService.listBooks({ limit: 60, bare: true, clubId: selectedClubId });
        all = Array.isArray(response.items) ? response.items : [];
        all = all.filter((i: any) => i.userId !== user?.userId);
      } else {
        const response = await apiService.listBooksPublic({ limit: 60, bare: true });
        all = Array.isArray(response.items) ? response.items : [];
      }
      all = all.filter((i: any) => i.category !== 'lost_found');
      setItems(all);
    } catch (err: any) {
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedClubId, user?.userId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = items.filter((i: any) => {
    const matchType = activeFilter === 'all'
      || i.category === activeFilter
      || (!i.category && activeFilter === 'book');
    const matchSearch = !search
      || (i.title || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const selectedClub = userClubs.find(c => c.clubId === selectedClubId);
  const noClubs = isAuthenticated && !clubsLoading && userClubs.length === 0;

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
          <p className="text-sm text-gray-500 mt-1 font-medium">Items shared by your community — available to borrow</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {noClubs ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🏛️</p>
            <p className="font-bold text-gray-700 text-lg">You're not in any clubs yet</p>
            <p className="text-sm text-gray-400 mt-2">Join a club to browse its shared library</p>
          </div>
        ) : (
          <>
            {/* Search + Club selector */}
            <div className="flex items-center gap-2 mb-4">
              <SearchBar
                onSearch={setSearch}
                placeholder="Search items…"
                value={search}
                className="flex-1 min-w-0"
              />
              {isAuthenticated && (
                <div className="flex-shrink-0 flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap hidden sm:block">Club</span>
                  {clubsLoading ? (
                    <div className="h-[38px] w-36 bg-gray-100 animate-pulse rounded-md" />
                  ) : userClubs.length > 1 ? (
                    <select
                      value={selectedClubId}
                      onChange={e => setSelectedClubId(e.target.value)}
                      className="h-[38px] border border-gray-300 rounded-md px-3 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {userClubs.map(c => (
                        <option key={c.clubId} value={c.clubId}>{c.name}</option>
                      ))}
                    </select>
                  ) : selectedClub ? (
                    <span className="inline-flex items-center h-[38px] px-3 rounded-md bg-indigo-50 border border-indigo-100 text-sm font-semibold text-indigo-700 whitespace-nowrap">
                      🏛️ {selectedClub.name}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap md:flex-nowrap gap-2 pb-1 mb-6">
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
                <p className="text-4xl mb-3">{search || activeFilter !== 'all' ? '🔍' : '📚'}</p>
                <p className="font-bold text-gray-700">
                  {search || activeFilter !== 'all' ? 'No items found' : 'Nothing shared yet'}
                </p>
                {search || activeFilter !== 'all' ? (
                  <p className="text-sm text-gray-400 mt-1">Try a different filter or search term</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-400 mt-1">No one in {selectedClub?.name || 'this club'} has shared anything yet.</p>
                    <p className="text-sm text-indigo-500 font-medium mt-2">Invite more members to grow the library! 📬</p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map((item: any) => (
                  <PublicBookCard key={(item as any).bookId || (item as any).listingId} book={item} isMemberOfBookClub={true} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LibraryHub;
