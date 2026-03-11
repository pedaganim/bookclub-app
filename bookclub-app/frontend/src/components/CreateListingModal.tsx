import React, { useState } from 'react';
import { LibraryConfig } from '../config/libraryConfig';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface CreateListingModalProps {
  config: LibraryConfig;
  onClose: () => void;
  onCreated: (listing: any) => void;
}

const BLANK_FORM = {
  title: '',
  description: '',
  condition: 'good',
  category: '',
  location: '',
  wantInReturn: '',
};

const CreateListingModal: React.FC<CreateListingModalProps> = ({ config, onClose, onCreated }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.condition) e.condition = 'Condition is required';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      setSubmitting(true);
      setApiError('');
      const payload = {
        ...form,
        libraryType: config.libraryType,
        userName: user?.name || user?.email || 'Community Member',
      };
      const created = await apiService.createToyListing(payload);
      onCreated(created);
    } catch (err: any) {
      setApiError(err?.message || `Failed to post ${config.itemLabel}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {config.emoji} {config.postLabel}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {apiError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={`e.g. Wooden building blocks`}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.title ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {config.conditions.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('condition', c.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    form.condition === c.value
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {errors.condition && <p className="mt-1 text-xs text-red-600">{errors.condition}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {config.categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder={`Describe the ${config.itemLabel}...`}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location (suburb / area)</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="e.g. Newtown, Sydney"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Want in return */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Looking for in return (optional)</label>
            <input
              type="text"
              value={form.wantInReturn}
              onChange={(e) => set('wantInReturn', e.target.value)}
              placeholder={`e.g. Another ${config.itemLabel}, or just happy to share`}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Posting…' : config.postLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListingModal;
