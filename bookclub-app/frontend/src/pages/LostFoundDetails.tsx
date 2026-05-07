import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { LostFoundItem, LostFoundStatus } from '../types';
import SEO from '../components/SEO';
import EditLostFoundModal from '../components/EditLostFoundModal';

const STATUS_CONFIG: Record<LostFoundStatus, { label: string; bg: string; text: string; dot: string }> = {
  available:  { label: 'Available',        bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  given_back: { label: 'Given Back',        bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400' },
  disposed:   { label: 'Disposed',          bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400' },
  lent:       { label: 'Lent Out',          bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
};

const ITEM_TYPE_EMOJI: Record<string, string> = {
  book: '📚', toy: '🧸', tool: '🔧', game: '🎲', other: '✨', unknown: '❓',
};

const LostFoundDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<LostFoundItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchItem = async () => {
      try {
        setLoading(true);
        const data = await apiService.getLostFoundItem(id);
        setItem(data);
      } catch (err: any) {
        setError(err.message || 'Item not found');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const handleDelete = async () => {
    if (!item) return;
    if (!window.confirm('Are you sure you want to delete this lost & found item?')) return;
    try {
      setDeleting(true);
      await apiService.deleteLostFoundItem(item.lostFoundId);
      navigate(-1);
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-4xl mb-4">🔍</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Item Not Found</h2>
        <p className="text-gray-500 mb-6">{error || "We couldn't find the item you're looking for."}</p>
        <button onClick={() => navigate(-1)} className="text-indigo-600 font-medium hover:underline">
          &larr; Go Back
        </button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.available;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <SEO title={`${item.title} | Lost & Found`} description={item.description || 'Lost and Found Item'} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <svg className="mr-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Image Section */}
            <div className="md:w-1/2 bg-gray-100 min-h-[300px] flex items-center justify-center">
              {item.images && item.images.length > 0 ? (
                <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-8xl">{ITEM_TYPE_EMOJI[item.itemType] || '❓'}</span>
              )}
            </div>

            {/* Content Section */}
            <div className="md:w-1/2 p-6 md:p-10 flex flex-col">
              <div className="mb-2">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </div>
              </div>

              <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">{item.title}</h1>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-8 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Item Type</p>
                  <p className="font-semibold text-gray-900 capitalize flex items-center gap-2">
                    {ITEM_TYPE_EMOJI[item.itemType]} {item.itemType}
                  </p>
                </div>
                {item.foundDate && (
                  <div>
                    <p className="text-gray-500 mb-1">Date Found</p>
                    <p className="font-semibold text-gray-900">{new Date(item.foundDate).toLocaleDateString()}</p>
                  </div>
                )}
                {item.foundLocation && (
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">Location Found</p>
                    <p className="font-semibold text-gray-900">{item.foundLocation}</p>
                  </div>
                )}
                {item.postedByName && (
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">Reported By</p>
                    <p className="font-semibold text-gray-900">{item.postedByName}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {item.description && (
                <div className="mb-8 flex-1">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Description</h3>
                  <div className="prose prose-sm text-gray-600 max-w-none whitespace-pre-wrap">
                    {item.description}
                  </div>
                </div>
              )}

              {/* Actions */}
              {item.isOwner && (
                <div className="mt-auto pt-6 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => setEditOpen(true)}
                    className="flex-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2.5 rounded-xl font-bold transition-colors text-center"
                  >
                    Edit Details
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <EditLostFoundModal
          item={item}
          onUpdated={(updated) => setItem(updated)}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
};

export default LostFoundDetails;
