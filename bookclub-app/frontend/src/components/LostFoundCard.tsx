import React, { useState } from 'react';
import { LostFoundItem, LostFoundStatus } from '../types';
import { apiService } from '../services/api';
import EditLostFoundModal from './EditLostFoundModal';

interface Props {
  item: LostFoundItem;
  isMember?: boolean;
  onUpdated?: (updated: LostFoundItem) => void;
  onDeleted?: (id: string) => void;
}

const STATUS_CONFIG: Record<LostFoundStatus, { label: string; bg: string; text: string; dot: string }> = {
  available:  { label: 'Available',        bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  given_back: { label: 'Given Back',        bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-400' },
  disposed:   { label: 'Disposed',          bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400' },
  lent:       { label: 'Lent Out',          bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
};

const ITEM_TYPE_EMOJI: Record<string, string> = {
  book: '📚', toy: '🧸', tool: '🔧', game: '🎲', other: '✨', unknown: '❓',
};

const STATUS_OPTIONS: LostFoundStatus[] = ['available', 'given_back', 'disposed', 'lent'];

const LostFoundCard: React.FC<Props> = ({ item, isMember, onUpdated, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.available;
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Delete this lost & found item?')) return;
    try {
      setDeleting(true);
      await apiService.deleteLostFoundItem(item.lostFoundId);
      onDeleted?.(item.lostFoundId);
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* Image or placeholder */}
      {item.images && item.images.length > 0 ? (
        <div className="h-36 overflow-hidden flex-shrink-0">
          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-36 flex-shrink-0 flex items-center justify-center bg-amber-50">
          <span className="text-5xl">{ITEM_TYPE_EMOJI[item.itemType] || '❓'}</span>
        </div>
      )}

      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Status badge */}
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold self-start ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>

        {/* Title */}
        <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{item.title}</p>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
        )}

        {/* Meta */}
        <div className="mt-auto pt-1 space-y-1">
          {item.foundLocation && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span>📍</span> {item.foundLocation}
            </p>
          )}
          {item.foundDate && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span>📅</span> {new Date(item.foundDate).toLocaleDateString()}
            </p>
          )}
          {item.postedByName && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span>👤</span> {item.postedByName}
            </p>
          )}
        </div>

        {/* Actions */}
        {error && <p className="text-xs text-red-500">{error}</p>}
        {item.isOwner && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setEditOpen(true)}
              className="flex-1 text-xs font-semibold px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
            >
              <span>Edit</span>
            </button>

            {/* Delete (owner only) */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-2 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
              title="Delete"
            >
              🗑
            </button>
          </div>
        )}
      </div>
      
      {editOpen && (
        <EditLostFoundModal
          item={item}
          onUpdated={onUpdated || (() => {})}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
};

export default LostFoundCard;
