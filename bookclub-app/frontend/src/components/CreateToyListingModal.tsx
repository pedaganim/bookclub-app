import React, { useState } from 'react';
import { apiService } from '../services/api';
import { ToyListing } from '../types';

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

const CATEGORIES = [
  { value: '', label: 'None' },
  { value: 'books', label: '📚 Books' },
  { value: 'outdoor', label: '🌳 Outdoor' },
  { value: 'educational', label: '🎓 Educational' },
  { value: 'dolls', label: '🧸 Dolls' },
  { value: 'vehicles', label: '🚗 Vehicles' },
  { value: 'other', label: '🎁 Other' },
];

interface Props {
  onClose: () => void;
  onCreated: (listing: ToyListing) => void;
}

const CreateToyListingModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('good');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [wantInReturn, setWantInReturn] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!condition) e.condition = 'Condition is required';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setServerError('');
    setIsSubmitting(true);
    try {
      const listing = await apiService.createToyListing({
        title: title.trim(),
        description: description.trim() || undefined,
        condition,
        category: category || undefined,
        location: location.trim() || undefined,
        wantInReturn: wantInReturn.trim() || undefined,
      });
      onCreated(listing);
    } catch (err: any) {
      setServerError(err?.message || 'Failed to create listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close when clicking backdrop
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const inputClass = (field: string) =>
    `mt-1 block w-full rounded-lg border ${errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'} px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Post a Toy</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="ct-title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="ct-title"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors((p) => { const n = {...p}; delete n.title; return n; }); }}
              placeholder="e.g. Wooden train set, 50 pieces"
              className={inputClass('title')}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="ct-description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="ct-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the toy, any missing pieces, age range, etc."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Condition + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ct-condition" className="block text-sm font-medium text-gray-700">
                Condition <span className="text-red-500">*</span>
              </label>
              <select
                id="ct-condition"
                value={condition}
                onChange={(e) => { setCondition(e.target.value); setErrors((p) => { const n = {...p}; delete n.condition; return n; }); }}
                className={inputClass('condition')}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {errors.condition && <p className="mt-1 text-xs text-red-600">{errors.condition}</p>}
            </div>
            <div>
              <label htmlFor="ct-category" className="block text-sm font-medium text-gray-700">Category</label>
              <select
                id="ct-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="ct-location" className="block text-sm font-medium text-gray-700">Location</label>
            <input
              id="ct-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Melbourne, VIC"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Want in return */}
          <div>
            <label htmlFor="ct-want" className="block text-sm font-medium text-gray-700">Looking for in return</label>
            <input
              id="ct-want"
              type="text"
              value={wantInReturn}
              onChange={(e) => setWantInReturn(e.target.value)}
              placeholder="e.g. LEGO sets, board games, books"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {isSubmitting ? 'Posting…' : 'Post Toy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateToyListingModal;
