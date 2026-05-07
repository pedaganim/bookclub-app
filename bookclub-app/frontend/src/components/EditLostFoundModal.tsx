import React, { useState } from 'react';
import { apiService } from '../services/api';
import { LostFoundItem, LostFoundItemType, LostFoundStatus } from '../types';

interface Props {
  item: LostFoundItem;
  onUpdated: (item: LostFoundItem) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: LostFoundStatus; label: string }[] = [
  { value: 'available', label: 'Available (Still Found)' },
  { value: 'given_back', label: 'Given Back to Owner' },
  { value: 'lent', label: 'Lent Out' },
  { value: 'disposed', label: 'Disposed / Removed' },
];

const EditLostFoundModal: React.FC<Props> = ({ item, onUpdated, onClose }) => {
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [itemType, setItemType] = useState<LostFoundItemType>(item.itemType || 'unknown');
  const [foundLocation, setFoundLocation] = useState(item.foundLocation || '');
  const [foundDate, setFoundDate] = useState(item.foundDate ? item.foundDate.split('T')[0] : '');
  const [status, setStatus] = useState<LostFoundStatus>(item.status || 'available');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const updated = await apiService.updateLostFoundItem(item.lostFoundId, {
        title: title.trim(),
        description: description.trim(),
        itemType,
        foundLocation: foundLocation.trim(),
        foundDate,
        status,
      });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Edit Lost & Found Item</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Item type + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Item Type</label>
              <select
                value={itemType}
                onChange={e => setItemType(e.target.value as LostFoundItemType)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
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
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as LostFoundStatus)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Where Found</label>
              <input
                type="text"
                value={foundLocation}
                onChange={e => setFoundLocation(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Date Found</label>
              <input
                type="date"
                value={foundDate}
                onChange={e => setFoundDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLostFoundModal;
