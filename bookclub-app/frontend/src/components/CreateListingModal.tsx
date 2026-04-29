import React, { useState } from 'react';
import { LibraryConfig } from '../config/libraryConfig';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import MultiImageUpload from './MultiImageUpload';
import { config as appConfig } from '../config';

interface CreateListingModalProps {
  config: LibraryConfig;
  onClose: () => void;
  onCreated: (listing: any) => void;
}

// Minimal local type matching MultiImageUpload's output
type SelectedImage = { file: File; preview?: string };

const CreateListingModal: React.FC<CreateListingModalProps> = ({ config, onClose, onCreated }) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [uploadedImages, setUploadedImages] = useState<SelectedImage[]>([]);
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ index: 0, total: 0, success: 0, failed: 0, currentName: '' });
  const [error, setError] = useState('');
  const [clubId, setClubId] = useState('');
  const [managedClubs, setManagedClubs] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const isLocal = appConfig.apiBaseUrl.includes('localhost');

  React.useEffect(() => {
    if (config.libraryType !== 'lost_found') return;
    apiService.getUserClubs().then((res: any) => {
      const allowed = (res.items || []).filter((c: any) => ['admin', 'moderator'].includes(c.userRole));
      setManagedClubs(allowed);
      if (allowed.length === 1) setClubId(allowed[0].clubId);
    }).catch(() => setManagedClubs([]));
  }, [config.libraryType]);

  const handleImagesProcessed = (images: SelectedImage[]) => {
    setUploadedImages(images);
    setError('');
  };

  const handleImageError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const uploadImagesOnly = async () => {
    if (uploadedImages.length === 0) {
      setError(`Please upload at least one ${config.itemLabel} image.`);
      return;
    }
    if (config.libraryType === 'lost_found' && !clubId) {
      setError('Please select a club for this Lost & Found post.');
      return;
    }

    setError('');
    setStatusMessage('Uploading ... ');
    setUploadingBatch(true);

    try {
      const imagesToUpload = [...uploadedImages];
      setUploadedImages([]); // Clear selection to allow more immediately if they want

      (async () => {
        const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
        const withRetry = async <T,>(fn: () => Promise<T>, label: string, maxAttempts = 3) => {
          let attempt = 0;
          let lastErr: any;
          while (attempt < maxAttempts) {
            try { return await fn(); } catch (e: any) {
              lastErr = e; attempt += 1; if (attempt >= maxAttempts) break;
              const backoff = Math.min(2000, 300 * Math.pow(2, attempt - 1));
              console.warn(`[Create${config.label}] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${backoff}ms`, e?.response?.status || e?.message);
              await sleep(backoff);
            }
          }
          throw lastErr || new Error(`${label} failed`);
        };

        let successCount = 0;
        let failedCount = 0;
        setUploadProgress({ index: 0, total: imagesToUpload.length, success: 0, failed: 0, currentName: '' });

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
                uploadResult = await withRetry(
                  () => apiService.uploadAnySize(image.file, { partConcurrency: 3, partSize: 5 * 1024 * 1024 }),
                  'uploadAnySize'
                );
              }

              const listing = await withRetry(
                () => apiService.createToyListing({
                  coverImage: uploadResult.fileUrl,
                  status: 'available',
                  extractFromImage: !isLocal,
                  s3Bucket: uploadResult.bucket,
                  s3Key: uploadResult.key,
                  title: isLocal ? image.file.name.replace(/\.[^/.]+$/, '').replace(/[_\-.]/g, ' ') : 'Processing...',
                  libraryType: config.libraryType === 'all' ? 'toy' : config.libraryType,
                  userName: user?.name || user?.email || 'Community Member',
                  clubId: config.libraryType === 'lost_found' ? clubId : undefined,
                }),
                'createToyListing'
              );
              successCount++;
              setUploadProgress(p => ({ ...p, success: p.success + 1 }));
              onCreated(listing);
            } catch (imageError: any) {
              console.error(`Background upload failed for an image:`, imageError);
              addNotification('error', imageError?.message || 'Failed to upload one of the images');
              failedCount++;
              setUploadProgress(p => ({ ...p, failed: p.failed + 1 }));
            }
          }
        };

        await Promise.all(Array.from({ length: concurrency }, () => worker()));

        addNotification('success', `Added ${successCount}/${imagesToUpload.length} ${config.itemLabel}${imagesToUpload.length !== 1 ? 's' : ''}.`);
        setStatusMessage('');
        setUploadingBatch(false);
        // If all succeeded, we can close the modal automatically
        if (successCount === imagesToUpload.length) {
          onClose();
        }
      })();
    } catch (err: any) {
      setError(err.message || 'Failed to upload images');
      setUploadingBatch(false);
    }
  };

  const handleClose = () => {
    if (!uploadingBatch) onClose();
  };

  const selectedCount = uploadedImages.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {config.emoji} {config.postLabel}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-gray-500 mb-6 font-medium">
            Upload images of your {config.itemLabelPlural} — AI will fill in the details for you in the background.
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {(statusMessage || uploadingBatch) && (
            <div className="mb-6 rounded-2xl p-5 bg-indigo-50/50 border border-indigo-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-indigo-700">{statusMessage || 'Processing batch...'}</div>
                {uploadingBatch && (
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    {uploadProgress.index}/{uploadProgress.total}
                  </div>
                )}
              </div>
              <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                  style={{ width: `${((uploadProgress.success + uploadProgress.failed) / Math.max(uploadProgress.total, 1)) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Success: <span className="text-indigo-600">{uploadProgress.success}</span> · Failed: <span className="text-red-500">{uploadProgress.failed}</span>
                </div>
                {uploadProgress.currentName && (
                  <div className="text-[10px] font-medium text-gray-500 italic truncate ml-4">
                    Uploading: {uploadProgress.currentName}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-6">
            {config.libraryType === 'lost_found' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Club</label>
                <select
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  disabled={uploadingBatch}
                >
                  <option value="">Select a club</option>
                  {managedClubs.map((c) => (
                    <option key={c.clubId} value={c.clubId}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <MultiImageUpload
              onImagesProcessed={handleImagesProcessed}
              onError={handleImageError}
              disabled={uploadingBatch}
              maxImages={Infinity}
              itemLabel={config.itemLabel}
              itemLabelPlural={config.itemLabelPlural}
            />
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploadingBatch}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadImagesOnly}
              disabled={uploadingBatch || selectedCount === 0}
              className="flex-3 py-3 px-8 rounded-xl bg-indigo-600 text-white text-sm font-black uppercase tracking-tight hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 italic"
            >
              {uploadingBatch ? 'Uploading...' : `Post ${selectedCount} ${config.itemLabel}${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListingModal;
