import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LostFoundItem, LostFoundStatus } from '../types';
import LostFoundCard from '../components/LostFoundCard';
import SEO from '../components/SEO';

const STATUS_CONFIG: Record<LostFoundStatus, { label: string; bg: string; text: string }> = {
  available:  { label: 'Available',  bg: 'bg-amber-50',  text: 'text-amber-700' },
  given_back: { label: 'Given Back', bg: 'bg-green-50',  text: 'text-green-700' },
  disposed:   { label: 'Disposed',   bg: 'bg-gray-100',  text: 'text-gray-500'  },
  lent:       { label: 'Lent Out',   bg: 'bg-indigo-50', text: 'text-indigo-700'},
};

const MyLostFound: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<LostFoundStatus | 'all'>('all');

  const [showPost, setShowPost] = useState(false);
  const [userClubs, setUserClubs] = useState<{ clubId: string; name: string }[]>([]);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [form, setForm] = useState({ clubId: '', title: '', description: '', itemType: 'unknown', foundLocation: '', foundDate: '' });

  const fetchItems = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError('');
      const res = await apiService.getMyLostFoundItems();
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    apiService.getUserClubs()
      .then((res: any) => {
        const active = (res.items || []).filter((c: any) => c.userStatus === 'active' || c.userRole === 'admin');
        setUserClubs(active);
        if (active.length > 0) setForm(f => ({ ...f, clubId: active[0].clubId }));
      })
      .catch(() => {});
  }, []);

  const filtered = items.filter(i => {
    const matchStatus = activeStatus === 'all' || i.status === activeStatus;
    const matchSearch = !search || (i.title || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts: Record<string, number> = { all: items.length };
  (['available', 'given_back', 'lent', 'disposed'] as LostFoundStatus[]).forEach(s => {
    counts[s] = items.filter(i => i.status === s).length;
  });

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.clubId) return;
    try {
      setPosting(true);
      setPostError('');
      const created = await apiService.createLostFoundItem({ ...form, itemType: form.itemType as any });
      setItems(prev => [created, ...prev]);
      setShowPost(false);
      setForm(f => ({ ...f, title: '', description: '', foundLocation: '', foundDate: '', itemType: 'unknown' }));
    } catch (e: any) {
      setPostError(e.message || 'Failed to post item');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO title="My Lost & Found" description="Manage the lost and found items you have reported." />

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">My Lost & Found</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Items you have reported across your clubs</p>
            </div>
            <button
              onClick={() => setShowPost(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Post Item
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stat tiles */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
          {[
            { key: 'all',       label: 'All',        emoji: '🧾' },
            { key: 'available', label: 'Available',  emoji: '🟡' },
            { key: 'given_back',label: 'Given Back', emoji: '✅' },
            { key: 'lent',      label: 'Lent Out',   emoji: '🔄' },
            { key: 'disposed',  label: 'Disposed',   emoji: '🗑️' },
          ].map(tile => (
            <button
              key={tile.key}
              onClick={() => setActiveStatus(tile.key as any)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                activeStatus === tile.key
                  ? 'bg-indigo-600 text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-700 border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="text-xl mb-0.5">{tile.emoji}</span>
              <span className={`text-lg font-black leading-none ${activeStatus === tile.key ? 'text-white' : 'text-gray-900'}`}>
                {counts[tile.key] ?? 0}
              </span>
              <span className={`text-[10px] font-semibold mt-0.5 ${activeStatus === tile.key ? 'text-indigo-200' : 'text-gray-400'}`}>
                {tile.label}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search my items…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🧾</p>
            <p className="font-bold text-gray-700">{search || activeStatus !== 'all' ? 'No items found' : 'Nothing reported yet'}</p>
            <p className="text-sm text-gray-400 mt-1 mb-6">
              {search || activeStatus !== 'all' ? 'Try a different filter or search term' : 'Found something at your club? Post it here.'}
            </p>
            {activeStatus === 'all' && !search && (
              <button
                onClick={() => setShowPost(true)}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Post an Item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(item => (
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
              {userClubs.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Club *</label>
                  <select
                    value={form.clubId}
                    onChange={e => setForm(f => ({ ...f, clubId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {userClubs.map(c => <option key={c.clubId} value={c.clubId}>{c.name}</option>)}
                  </select>
                </div>
              )}
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
                  disabled={posting || !form.title.trim() || !form.clubId}
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

export default MyLostFound;
