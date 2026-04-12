import React, { useState } from 'react';
import { Book } from '../types';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import MultiImageUpload from './MultiImageUpload';

interface AddBookModalProps {
  onClose: () => void;
  onBookAdded: (book: Book) => void;
}

// Minimal local type matching MultiImageUpload's output
type SelectedImage = { file: File; preview?: string };

const AddBookModal: React.FC<AddBookModalProps> = ({ onClose, onBookAdded }) => {
  const [tab, setTab] = useState<'upload' | 'manual'>('manual');
  const [uploadedImages, setUploadedImages] = useState<SelectedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ index: 0, total: 0, success: 0, failed: 0, currentName: '' });
  // Manual entry form state
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualIsbn, setManualIsbn] = useState('');
  const [manualPublisher, setManualPublisher] = useState('');
  const [manualStatus, setManualStatus] = useState<'available' | 'reading' | 'borrowed'>('available');
  const [manualSaving, setManualSaving] = useState(false);
  const { addNotification } = useNotification();

  const handleImagesProcessed = (images: SelectedImage[]) => {
    setUploadedImages(images);
    setError('');
  };

  const handleImageError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // No background processing/polling

  const uploadImagesOnly = async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one book image.');
      return;
    }

    // Make non-blocking: kick off background uploads and immediately free the UI
    setError('');
    setStatusMessage('Uploading ... ');
    setUploadingBatch(true);

    try {
      const validImages = uploadedImages; // no validation client-side

      if (validImages.length === 0) {
        setError('No valid book images found. Please upload book cover images.');
        setUploadingBatch(false);
        return;
      }

      // Start background upload without blocking
      const imagesToUpload = [...validImages];
      // Clear the current selection so user can add more immediately
      setUploadedImages([]);

      (async () => {
            const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
            const withRetry = async <T,>(fn: () => Promise<T>, label: string, maxAttempts = 3) => {
              let attempt = 0;
              let lastErr: any;
              while (attempt < maxAttempts) {
                try { return await fn(); } catch (e: any) {
                  lastErr = e; attempt += 1; if (attempt >= maxAttempts) break;
                  const backoff = Math.min(2000, 300 * Math.pow(2, attempt - 1));
                  // eslint-disable-next-line no-console
                  console.warn(`[AddBook] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${backoff}ms`, e?.response?.status || e?.message);
                  await sleep(backoff);
                }
              }
              throw lastErr || new Error(`${label} failed`);
            };

            let success = 0;
            let failed = 0;
            setUploadProgress({ index: 0, total: imagesToUpload.length, success: 0, failed: 0, currentName: '' });

            // Worker pool for concurrent image uploads
            const concurrency = Math.min(5, imagesToUpload.length);
            let nextIndex = 0;

            const worker = async () => {
              while (true) {
                const i = nextIndex++;
                if (i >= imagesToUpload.length) return;
                const image = imagesToUpload[i];
                try {
                  setUploadProgress(p => ({ ...p, index: i + 1, currentName: image.file.name }));
                  // Upload any size (multipart for large)
                  const { fileUrl, key, bucket } = await withRetry(
                    () => apiService.uploadAnySize(image.file, { partConcurrency: 5, partSize: 8 * 1024 * 1024 }),
                    'uploadAnySize'
                  );
                  // Create the book
                  const book = await withRetry(
                    () => apiService.createBook({
                      coverImage: fileUrl,
                      status: 'available',
                      extractFromImage: true,
                      s3Bucket: bucket,
                      s3Key: key,
                    }),
                    'createBook'
                  );
                  success += 1;
                  setUploadProgress(p => ({ ...p, success }));
                  onBookAdded(book);
                } catch (imageError: any) {
                  // eslint-disable-next-line no-console
                  console.error(`Background upload failed for an image:`, imageError);
                  addNotification?.('error', imageError?.message || 'Failed to upload one of the images');
                  failed += 1;
                  setUploadProgress(p => ({ ...p, failed }));
                }
              }
            };

            await Promise.all(Array.from({ length: concurrency }, () => worker()));

            addNotification?.('success', `Added ${success}/${imagesToUpload.length} book${imagesToUpload.length !== 1 ? 's' : ''}.`);
            setStatusMessage('');
            setUploadingBatch(false);
          })();
    } catch (err: any) {
      setError(err.message || 'Failed to upload images');
      setUploadingBatch(false);
    } finally {
      // Keep UI interactive: do not set loading while background uploads continue
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualAuthor.trim()) return;
    try {
      setManualSaving(true);
      setError('');
      const book = await apiService.createBook({
        title: manualTitle.trim(),
        author: manualAuthor.trim(),
        description: manualDescription.trim() || undefined,
        isbn: manualIsbn.trim() || undefined,
        publisher: manualPublisher.trim() || undefined,
        status: manualStatus,
        enrichWithMetadata: !!manualIsbn.trim(),
      });
      addNotification('success', 'Book added');
      onBookAdded(book);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add book');
    } finally {
      setManualSaving(false);
    }
  };

  const selectedCount = uploadedImages.length;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Books</h3>

          {/* Tabs */}
          <div className="mb-5 border-b border-gray-200">
            <nav className="-mb-px flex space-x-6">
              <button
                type="button"
                onClick={() => { setTab('upload'); setError(''); }}
                className={`whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${tab === 'upload' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Upload Images
              </button>
              <button
                type="button"
                onClick={() => { setTab('manual'); setError(''); }}
                className={`whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${tab === 'manual' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Enter Manually
              </button>
            </nav>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Upload tab */}
          {tab === 'upload' && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Upload multiple book cover images to create entries quickly. We skip image processing; you can edit details later.
              </p>
              {(statusMessage || uploadingBatch) && (
                <div className="mb-4 rounded-md p-4 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-blue-700">{statusMessage || 'Uploading...'}</div>
                    {uploadingBatch && (
                      <div className="text-xs text-blue-700">
                        {uploadProgress.index}/{uploadProgress.total} • Success {uploadProgress.success} · Failed {uploadProgress.failed}
                      </div>
                    )}
                  </div>
                  {uploadingBatch && (
                    <>
                      <div className="mt-2 w-full bg-blue-200 rounded-full h-1">
                        <div
                          className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${(uploadProgress.success + uploadProgress.failed) / Math.max(uploadProgress.total, 1) * 100}%` }}
                        ></div>
                      </div>
                      {uploadProgress.currentName && (
                        <div className="mt-2 text-xs text-blue-700 truncate">Current: {uploadProgress.currentName}</div>
                      )}
                    </>
                  )}
                </div>
              )}
              <div className="mb-6">
                <MultiImageUpload
                  onImagesProcessed={handleImagesProcessed}
                  onError={handleImageError}
                  disabled={loading}
                  maxImages={process.env.NODE_ENV === 'test' ? 10 : Infinity}
                />
              </div>
              {uploadedImages.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-md">
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Selected images:</span> {selectedCount}
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={handleClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={uploadImagesOnly}
                  disabled={selectedCount === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {`Upload ${selectedCount} Image${selectedCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}

          {/* Manual entry tab */}
          {tab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Author <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={manualAuthor}
                    onChange={e => setManualAuthor(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ISBN</label>
                  <input
                    type="text"
                    value={manualIsbn}
                    onChange={e => setManualIsbn(e.target.value)}
                    placeholder="ISBN-10 or ISBN-13"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {manualIsbn && <p className="mt-1 text-xs text-gray-500">Metadata will be fetched automatically.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Publisher</label>
                  <input
                    type="text"
                    value={manualPublisher}
                    onChange={e => setManualPublisher(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={manualStatus}
                    onChange={e => setManualStatus(e.target.value as any)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="available">Available</option>
                    <option value="reading">Reading</option>
                    <option value="borrowed">Borrowed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  value={manualDescription}
                  onChange={e => setManualDescription(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={handleClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualSaving || !manualTitle.trim() || !manualAuthor.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {manualSaving ? 'Adding…' : 'Add Book'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddBookModal;
