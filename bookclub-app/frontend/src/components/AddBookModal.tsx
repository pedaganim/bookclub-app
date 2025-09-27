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
  const [uploadedImages, setUploadedImages] = useState<SelectedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ index: 0, total: 0, success: 0, failed: 0, currentName: '' });
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
            try {
              return await fn();
            } catch (e: any) {
              lastErr = e;
              attempt += 1;
              // Network-ish errors or 429/5xx
              const status = e?.response?.status;
              if (attempt >= maxAttempts) break;
              const backoff = Math.min(2000, 300 * Math.pow(2, attempt - 1));
              // eslint-disable-next-line no-console
              console.warn(`[AddBook] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${backoff}ms`, status || e?.message);
              await sleep(backoff);
            }
          }
          throw lastErr || new Error(`${label} failed`);
        };

        setUploadProgress({ index: 0, total: imagesToUpload.length, success: 0, failed: 0, currentName: '' });
        // Adaptive stagger to reduce bursts
        const batchSize = imagesToUpload.length;
        const staggerMs = batchSize <= 3 ? 200 : batchSize <= 7 ? 600 : 1000;
        for (let i = 0; i < imagesToUpload.length; i++) {
          const image = imagesToUpload[i];
          try {
            // Slight stagger between images to avoid burst limits
            if (i > 0) await sleep(staggerMs);
            setUploadProgress(p => ({ ...p, index: i + 1, currentName: image.file.name }));

            // 1) Get upload URL (retry)
            const uploadData = await withRetry(
              () => apiService.generateUploadUrl(image.file.type, image.file.name),
              'generateUploadUrl'
            );

            // 2) Upload file to S3 (retry)
            await withRetry(
              () => apiService.uploadFile(uploadData.uploadUrl, image.file),
              'uploadFile'
            );

            // Parse bucket and key from returned fileUrl (https://{bucket}.s3.amazonaws.com/{key})
            let s3Bucket: string | undefined;
            let s3Key: string | undefined;
            try {
              const url = new URL(uploadData.fileUrl);
              const host = url.hostname; // e.g., my-bucket.s3.amazonaws.com
              s3Bucket = host.split('.s3.amazonaws.com')[0];
              s3Key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
            } catch {
              // Fallback to fileKey if parsing fails
              s3Key = uploadData.fileKey;
            }

            // 3) Create the book (retry)
            const book = await withRetry(
              () => apiService.createBook({
                coverImage: uploadData.fileUrl,
                status: 'available',
                extractFromImage: true,
                s3Bucket,
                s3Key,
              }),
              'createBook'
            );
            setUploadProgress(p => ({ ...p, success: p.success + 1 }));
            onBookAdded(book);
          } catch (imageError: any) {
            // eslint-disable-next-line no-console
            console.error(`Background upload failed for an image:`, imageError);
            addNotification?.('error', imageError?.message || 'Failed to upload one of the images');
            setUploadProgress(p => ({ ...p, failed: p.failed + 1 }));
          }
        }
        // Get final count from state to display in notification
        setUploadProgress(p => {
          const finalSuccess = p.success;
          const totalBooks = imagesToUpload.length;
          addNotification?.('success', `Added ${finalSuccess}/${totalBooks} book${totalBooks !== 1 ? 's' : ''}.`);
          return p;
        });
        setStatusMessage('');
        setUploadingBatch(false);
      })();
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload images');
    } finally {
      // Keep UI interactive: do not set loading while background uploads continue
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) onClose();
  };

  const selectedCount = uploadedImages.length;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Books</h3>
          <p className="text-sm text-gray-600 mb-6">
            Upload multiple book cover images to create entries quickly. We skip image processing; you can edit details later.
          </p>
          
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

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

          {/* Main Upload Interface */}
          <div className="mb-6">
            <MultiImageUpload
              onImagesProcessed={handleImagesProcessed}
              onError={handleImageError}
              disabled={loading}
              maxImages={10}
            />
          </div>

          {/* Upload Summary */}
          {uploadedImages.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Summary</h4>
              <div className="text-xs text-gray-600">
                <span className="font-medium">Selected images:</span> {selectedCount}
              </div>
            </div>
          )}

          {/* No background processing list */}
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={false}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadImagesOnly}
              disabled={selectedCount === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {`Upload ${selectedCount} Image${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBookModal;
