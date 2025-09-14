import React, { useState } from 'react';
import { BookClub } from '../types';

interface EditClubModalProps {
  club: BookClub;
  onClose: () => void;
  onSave: (updates: Partial<BookClub>) => Promise<void> | void;
}

const EditClubModal: React.FC<EditClubModalProps> = ({ club, onClose, onSave }) => {
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description || '');
  const [location, setLocation] = useState(club.location || '');
  const [isPrivate, setIsPrivate] = useState(!!club.isPrivate);
  const [memberLimit, setMemberLimit] = useState<string>(
    typeof club.memberLimit === 'number' ? String(club.memberLimit) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Club name is required');
      return;
    }
    if (!location.trim()) {
      setError('Location is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        isPrivate,
        memberLimit: memberLimit ? parseInt(memberLimit, 10) : undefined,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Edit Club</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div className="flex items-center">
            <input
              id="isPrivate"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <label htmlFor="isPrivate" className="ml-2 text-sm text-gray-700">Private</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member limit</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Leave empty for no limit"
              min={2}
              max={1000}
              value={memberLimit}
              onChange={(e) => setMemberLimit(e.target.value)}
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClubModal;
