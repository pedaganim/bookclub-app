import React, { useRef, useState } from 'react';
import { config } from '../config';
import { apiService } from '../services/api';
import { LostFoundItem, LostFoundItemType } from '../types';

interface UserClub {
  clubId: string;
  name: string;
}

interface Props {
  clubs: UserClub[];
  defaultClubId?: string;
  onCreated: (item: LostFoundItem) => void;
  onClose: () => void;
}

interface PhotoPreview {
  file: File;
  previewUrl: string;
}

const isLocal = config.apiBaseUrl.includes('localhost');

const MAX_PHOTOS = 4;

const PostLostFoundModal: React.FC<Props> = ({ clubs, defaultClubId, onCreated, onClose }) => {
  const [clubId, setClubId] = useState(defaultClubId || clubs[0]?.clubId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState<LostFoundItemType>('unknown');
  const [foundLocation, setFoundLocation] = useState('');
  const [foundDate, setFoundDate] = useState('');
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining);
    const newPreviews: PhotoPreview[] = toAdd.map(f => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setPhotos(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clubId) return;
    try {
      setUploading(true);
      setError('');

      let imageUrls: string[] = [];

      if (photos.length > 0) {
        if (isLocal) {
          imageUrls = photos.map(p => p.previewUrl);
        } else {
          const uploads = await Promise.all(
            photos.map(async p => {
              const { uploadUrl, fileUrl } = await apiService.generateUploadUrl(p.file.type, p.file.name);
              await apiService.uploadFile(uploadUrl, p.file);
              return fileUrl;
            })
          );
          imageUrls = uploads;
        }
      }

      const created = await apiService.createLostFoundItem({
        clubId,
        title: title.trim(),
        description: description.trim() || undefined,
        itemType,
        foundLocation: foundLocation.trim() || undefined,
        foundDate: foundDate || undefined,
        images: imageUrls,
      });

      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to post item');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Post Lost & Found</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">

          {/* Photo upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Photos <span className="text-gray-400 font-normal">(up to {MAX_PHOTOS})</span></label>
            <div className="flex gap-2 flex-wrap">
              {photos.map((p, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                  <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full text-xs flex items-center justify-center leading-none hover:bg-black/70"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-[10px] font-semibold">Add Photo</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          {/* Club selector */}
          {clubs.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Club *</label>
              <select
                value={clubId}
                onChange={e => setClubId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                {clubs.map(c => <option key={c.clubId} value={c.clubId}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Blue water bottle, knitting needles…"
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
              placeholder="Colour, size, markings — anything that helps identify it…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Item type + date */}
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
              <label className="block text-xs font-semibold text-gray-600 mb-1">Date Found</label>
              <input
                type="date"
                value={foundDate}
                onChange={e => setFoundDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Where Found</label>
            <input
              type="text"
              value={foundLocation}
              onChange={e => setFoundLocation(e.target.value)}
              placeholder="e.g. Reading corner, front table…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
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
              disabled={uploading || !title.trim() || !clubId}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Posting…
                </span>
              ) : 'Post Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostLostFoundModal;
