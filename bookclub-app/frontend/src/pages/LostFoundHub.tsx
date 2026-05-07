import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LostFoundItem, LostFoundStatus } from '../types';
import LostFoundCard from '../components/LostFoundCard';
import SearchBar from '../components/SearchBar';
import SEO from '../components/SEO';

const STATUS_FILTERS: { key: LostFoundStatus | 'all'; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'given_back',label: 'Given Back' },
  { key: 'lent',      label: 'Lent Out' },
  { key: 'disposed',  label: 'Disposed' },
];

interface UserClub { clubId: string; name: string; userStatus: string; }

const LostFoundHub: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [userClubs, setUserClubs] = useState<UserClub[]>([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [clubsLoading, setClubsLoading] = useState(false);

  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<LostFoundStatus | 'all'>('all');

  const [showPost, setShowPost] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', itemType: 'unknown', foundLocation: '', foundDate: '' });

  useEffect(() => {
    if (!isAuthenticated) return;
    setClubsLoading(true);
    apiService.getUserClubs()
      .then((res: any) => {
        const active: UserClub[] = (res.items || []).filter((c: any) => c.userStatus === 'active' || c.userRole === 'admin');
        setUserClubs(active);
        if (active.length > 0) setSelectedClubId(active[0].clubId);
      })
      .catch(() => setUserClubs([]))
      .finally(() => setClubsLoading(false));
  }, [isAuthenticated]);

  const fetchItems = useCallback(async () => {
    if (!selectedClubId) return;
    try {
      setLoading(true);
      setError('');
      const res = await apiService.listLostFound({
        clubId: selectedClubId,
        status: activeStatus !== 'all' ? activeStatus : undefined,
        search: search || undefined,
        limit: 60,
      });
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [selectedClubId, activeStatus, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      setPosting(true);
      setPostError('');
      const created = await apiService.createLostFoundItem({ ...form, clubId: selectedClubId, itemType: form.itemType as any });
      setItems(prev => [created, ...prev]);
      setShowPost(false);
      setForm({ title: '', description: '', itemType: 'unknown', foundLocation: '', foundDate: '' });
    } catch (e: any) {
      setPostError(e.message || 'Failed to post item');
    } finally {
      setPosting(false);
    }
  };

  const selectedClub = userClubs.find(c => c.clubId === selectedClubId);
  const noClubs = isAuthenticated && !clubsLoading && userClubs.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO title="Lost & Found — Community Library" description="Report and reclaim lost items within your club." />

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">🧾 Lost & Found</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Items found within your club — help return them to their owners</p>
            </div>
            {isAuthenticated && selectedClubId && !noClubs && (
              <button
                onClick={() => setShowPost(true)}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Post Item
              </button>
            )}
            {!isAuthenticated && (
              <button
                onClick={() => navigate('/login', { state: { from: '/library/lost-found' } })}
                className="flex-shrink-0 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Sign In to Post
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isAuthenticated ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🧾</p>
            <p className="font-bold text-gray-700 text-lg">Sign in to view Lost & Found</p>
            <p className="text-sm text-gray-400 mt-2">Lost & Found is specific to your club</p>
          </div>
        ) : noClubs ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🏛️</p>
            <p className="font-bold text-gray-700 text-lg">You're not in any clubs yet</p>
            <p className="text-sm text-gray-400 mt-2">Join a club to see its Lost & Found</p>
          </div>
        ) : (
          <>
            {/* Search + Club selector */}
            <div className="flex items-center gap-2 mb-4">
              <SearchBar onSearch={setSearch} placeholder="Search lost items…" value={search} className="flex-1 min-w-0" />
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
                      {userClubs.map(c => <option key={c.clubId} value={c.clubId}>{c.name}</option>)}
                    </select>
                  ) : selectedClub ? (
                    <span className="inline-flex items-center h-[38px] px-3 rounded-md bg-indigo-50 border border-indigo-100 text-sm font-semibold text-indigo-700 whitespace-nowrap">
                      🏛️ {selectedClub.name}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Status filter chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setActiveStatus(f.key)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    activeStatus === f.key
                      ? 'bg-indigo-600 text-white border-transparent shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Count */}
            {!loading && <p className="text-xs text-gray-400 mb-3">{items.length} item{items.length !== 1 ? 's' : ''}</p>}

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
              </div>
            ) : error ? (
              <div className="text-center py-16 text-red-500 text-sm">{error}</div>
            ) : items.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">🧾</p>
                <p className="font-bold text-gray-700">{search || activeStatus !== 'all' ? 'No items found' : 'Nothing reported yet'}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {search || activeStatus !== 'all' ? 'Try a different filter or search term' : 'Found something? Post it so the owner can claim it.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.map(item => (
                  <LostFoundCard
                    key={item.lostFoundId}
                    item={item}
                    isMember={true}
                    onUpdated={updated => setItems(prev => prev.map(i => i.lostFoundId === updated.lostFoundId ? updated : i))}
                    onDeleted={id => setItems(prev => prev.filter(i => i.lostFoundId !== id))}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Post Item Modal */}
      {showPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Post Lost & Found Item</h2>
              <button onClick={() => setShowPost(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handlePost} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Blue water bottle"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Any identifying details…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Item Type</label>
                  <select
                    value={form.itemType}
                    onChange={e => setForm(f => ({ ...f, itemType: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="book">Book</option>
                    <option value="toy">Toy</option>
                    <option value="tool">Tool</option>
                    <option value="game">Game</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date Found</label>
                  <input
                    type="date"
                    value={form.foundDate}
                    onChange={e => setForm(f => ({ ...f, foundDate: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Where Found</label>
                <input
                  type="text"
                  value={form.foundLocation}
                  onChange={e => setForm(f => ({ ...f, foundLocation: e.target.value }))}
                  placeholder="e.g. Reading corner, front table"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              {postError && <p className="text-xs text-red-500">{postError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPost(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting || !form.title.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {posting ? 'Posting…' : 'Post Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LostFoundHub;
