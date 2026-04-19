import React, { useState, useRef, useCallback } from 'react';
import { LibraryConfig } from '../config/libraryConfig';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface CreateListingModalProps {
  config: LibraryConfig;
  onClose: () => void;
  onCreated: (listing: any) => void;
}

type Step = 'upload' | 'analysing' | 'review' | 'done';

const BLANK_FORM = {
  title: '',
  description: '',
  condition: 'good',
  category: '',
  location: '',
  wantInReturn: '',
};

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 35000;

const CreateListingModal: React.FC<CreateListingModalProps> = ({ config, onClose, onCreated }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [listingId, setListingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [apiError, setApiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setUploadError('Please select an image file.'); return; }
    setUploadError('');
    setPreviewUrl(URL.createObjectURL(file));
    setStep('analysing');

    try {
      // 1. Get presigned URL + pre-created draft listingId
      const { uploadUrl, listingId: id } = await apiService.getLibraryUploadUrl(config.libraryType, file.type);
      setListingId(id);

      // 2. Upload image directly to S3
      await apiService.uploadToS3(uploadUrl, file);

      // 3. Poll for status to change from 'draft' (Bedrock analyzing)
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      pollRef.current = setInterval(async () => {
        try {
          const listing = await apiService.getToyListing(id);
          if (listing.status !== 'draft') {
            stopPolling();
            // Pre-fill review form with AI results
            setForm({
              title: listing.title && listing.title !== 'Processing…' ? listing.title : '',
              description: listing.description || '',
              condition: listing.condition || 'good',
              category: listing.category || '',
              location: '',
              wantInReturn: '',
            });
            setStep('review');
          } else if (Date.now() > deadline) {
            stopPolling();
            // Timeout — show empty form
            setForm({ ...BLANK_FORM });
            setStep('review');
          }
        } catch (_) {
          // Ignore transient errors during polling
        }
      }, POLL_INTERVAL_MS);
    } catch (err: any) {
      stopPolling();
      setUploadError(err?.message || 'Upload failed. Please try again.');
      setStep('upload');
      setPreviewUrl(null);
    }
  }, [config.libraryType]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.condition) errs.condition = 'Condition is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      setPublishing(true); setApiError('');
      const updated = await apiService.updateToyListing(listingId!, {
        ...form,
        condition: form.condition as 'new' | 'like_new' | 'good' | 'fair',
        status: 'available',
        userName: user?.name || user?.email || 'Community Member',
      });
      onCreated(updated);
      setStep('done');
    } catch (err: any) {
      setApiError(err?.message || `Failed to publish ${config.itemLabel}. Please try again.`);
    } finally {
      setPublishing(false);
    }
  };

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) { stopPolling(); onClose(); } }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {config.emoji} {config.postLabel}
          </h2>
          <button
            onClick={() => { stopPolling(); onClose(); }}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">

          {/* ── Step 1: Upload ─────────────────────────────────────────── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Drop a photo of your {config.itemLabel} — AI will fill in the details for you.
              </p>
              {uploadError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{uploadError}</div>
              )}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer py-14 px-6 transition-colors ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
              >
                <div className="text-5xl mb-3 select-none">{config.emoji}</div>
                <p className="text-sm font-semibold text-gray-700">Drop your photo here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse — JPG, PNG, HEIC accepted</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Analysing (AI spinner) ─────────────────────────── */}
          {step === 'analysing' && (
            <div className="flex flex-col items-center py-10 space-y-5">
              {previewUrl && (
                <div className="w-36 h-36 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-col items-center gap-3">
                <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm font-semibold text-gray-700">Analysing your {config.itemLabel}…</p>
                <p className="text-xs text-gray-400">Our AI is reading the image. This takes 5–15 seconds.</p>
              </div>
            </div>
          )}

          {/* ── Step 3: Review & Edit ──────────────────────────────────── */}
          {step === 'review' && (
            <form onSubmit={handlePublish} className="space-y-4">
              {previewUrl && (
                <div className="w-full rounded-xl overflow-hidden border border-gray-100 shadow-sm" style={{ aspectRatio: '4/3', maxHeight: 180 }}>
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              {!form.title && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-700">
                  AI couldn't auto-fill all fields — please describe your {config.itemLabel} below.
                </div>
              )}
              {apiError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{apiError}</div>
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
                  onClick={() => { stopPolling(); onClose(); }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {publishing ? 'Publishing…' : 'Publish'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 4: Done ──────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="flex flex-col items-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-bold text-gray-900">Posted!</p>
              <p className="text-sm text-gray-500 text-center">Your {config.itemLabel} is now visible in the {config.label}.</p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CreateListingModal;
