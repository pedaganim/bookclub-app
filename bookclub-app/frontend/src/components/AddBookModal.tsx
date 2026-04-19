import React, { useState } from 'react';
import { Book } from '../types';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import MultiImageUpload from './MultiImageUpload';
import { config } from '../config';

interface AddBookModalProps {
  onClose: () => void;
  onBookAdded: (book: Book) => void;
}

// Minimal local type matching MultiImageUpload's output
type SelectedImage = { file: File; preview?: string };

const AddBookModal: React.FC<AddBookModalProps> = ({ onClose, onBookAdded }) => {
  const [tab, setTab] = useState<'upload' | 'manual'>('upload');
  const [uploadedImages, setUploadedImages] = useState<SelectedImage[]>([]);
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
  const [manualImage, setManualImage] = useState<SelectedImage | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const { addNotification } = useNotification();
  const isLocal = config.apiBaseUrl.includes('localhost');

  const deriveTitle = (filename: string) => {
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[_\-.]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  };

  const handleManualImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (manualImage?.preview) URL.revokeObjectURL(manualImage.preview);
      setManualImage({
        file,
        preview: URL.createObjectURL(file)
      });
    }
    // Reset file input so same file can be selected again if removed
    e.target.value = '';
  };

  const removeManualImage = () => {
    if (manualImage?.preview) URL.revokeObjectURL(manualImage.preview);
    setManualImage(null);
  };

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

            let successCount = 0;
            let failedCount = 0;
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
                  
                  let uploadResult: { fileUrl?: string; key?: string; bucket?: string } = {};
                  
                  if (!isLocal) {
                    // Upload any size (multipart for large)
                    uploadResult = await withRetry(
                      () => apiService.uploadAnySize(image.file, { partConcurrency: 3, partSize: 5 * 1024 * 1024 }),
                      'uploadAnySize'
                    );
                  }

                  // Create the book
                  const book = await withRetry(
                    () => apiService.createBook({
                      coverImage: uploadResult.fileUrl,
                      status: 'available',
                      extractFromImage: !isLocal,
                      s3Bucket: uploadResult.bucket,
                      s3Key: uploadResult.key,
                      title: isLocal ? deriveTitle(image.file.name) : 'Processing...',
                      author: 'Processing...',
                    }),
                    'createBook'
                  );
                  successCount++;
                  setUploadProgress(p => ({ ...p, success: p.success + 1 }));
                  onBookAdded(book);
                } catch (imageError: any) {
                  // eslint-disable-next-line no-console
                  console.error(`Background upload failed for an image:`, imageError);
                  addNotification?.('error', imageError?.message || 'Failed to upload one of the images');
                  failedCount++;
                  setUploadProgress(p => ({ ...p, failed: p.failed + 1 }));
                }
              }
            };

            await Promise.all(Array.from({ length: concurrency }, () => worker()));

            addNotification?.('success', `Added ${successCount}/${imagesToUpload.length} book${imagesToUpload.length !== 1 ? 's' : ''}.`);
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
    if (!uploadingBatch && !manualSaving) onClose();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualAuthor.trim()) return;
    try {
      setManualSaving(true);
      setError('');
      
      let coverImage: string | undefined;
      let s3Bucket: string | undefined;
      let s3Key: string | undefined;

      if (manualImage && !isLocal) {
        const uploadResult = await apiService.uploadAnySize(manualImage.file);
        coverImage = uploadResult.fileUrl;
        s3Bucket = uploadResult.bucket;
        s3Key = uploadResult.key;
      }

      const book = await apiService.createBook({
        title: manualTitle.trim(),
        author: manualAuthor.trim(),
        description: manualDescription.trim() || undefined,
        isbn: manualIsbn.trim() || undefined,
        publisher: manualPublisher.trim() || undefined,
        status: manualStatus,
        enrichWithMetadata: !!manualIsbn.trim(),
        coverImage,
        s3Bucket,
        s3Key,
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start sm:items-center justify-center">
      <div className="relative w-full h-full sm:h-auto sm:max-w-4xl sm:my-8 mx-0 sm:mx-auto p-4 sm:p-6 border-0 sm:border shadow-none sm:shadow-lg rounded-none sm:rounded-md bg-white overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h3 className="text-xl font-bold text-gray-900">Add Books</h3>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 sm:hidden">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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
                  disabled={uploadingBatch || manualSaving}
                  maxImages={process.env.NODE_ENV === 'test' ? 10 : Infinity}
                  itemLabel="Book Cover"
                  itemLabelPlural="Book Covers"
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
                  <label htmlFor="manual-title" className="block text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
                  <input
                    id="manual-title"
                    type="text"
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="manual-author" className="block text-sm font-medium text-gray-700">Author <span className="text-red-500">*</span></label>
                  <input
                    id="manual-author"
                    type="text"
                    value={manualAuthor}
                    onChange={e => setManualAuthor(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="manual-isbn" className="block text-sm font-medium text-gray-700">ISBN</label>
                  <input
                    id="manual-isbn"
                    type="text"
                    value={manualIsbn}
                    onChange={e => setManualIsbn(e.target.value)}
                    placeholder="ISBN-10 or ISBN-13"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {manualIsbn && <p className="mt-1 text-xs text-gray-500">Metadata will be fetched automatically.</p>}
                </div>
                <div>
                  <label htmlFor="manual-publisher" className="block text-sm font-medium text-gray-700">Publisher</label>
                  <input
                    id="manual-publisher"
                    type="text"
                    value={manualPublisher}
                    onChange={e => setManualPublisher(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="manual-status" className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    id="manual-status"
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

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Cover Image</label>
                <div className="flex items-start space-x-4">
                  <div className="flex-1">
                    {!manualImage ? (
                      <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-400 transition-colors">
                        <div className="space-y-1 text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="manual-image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                              <span>Upload a cover image</span>
                              <input id="manual-image-upload" name="manual-image-upload" type="file" accept="image/*" className="sr-only" onChange={handleManualImageChange} />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative border rounded-md p-2 bg-gray-50 flex items-center">
                        <img
                          src={manualImage.preview}
                          alt="Manual cover preview"
                          className="h-20 w-16 object-cover rounded shadow-sm"
                        />
                        <div className="ml-4 flex-1 overflow-hidden">
                          <p className="text-sm font-medium text-gray-900 truncate">{manualImage.file.name}</p>
                          <p className="text-xs text-gray-500">{(manualImage.file.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={removeManualImage}
                          className="ml-2 p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="manual-description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  id="manual-description"
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
    );
};

export default AddBookModal;
