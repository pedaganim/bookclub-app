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
        let success = 0;
        for (let i = 0; i < imagesToUpload.length; i++) {
          const image = imagesToUpload[i];
          try {
            // Upload image to S3 only
            const uploadData = await apiService.generateUploadUrl(image.file.type, image.file.name);
            await apiService.uploadFile(uploadData.uploadUrl, image.file);
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

            // Create a book using Textract flow (allowing missing title/author initially)
            const book = await apiService.createBook({
              coverImage: uploadData.fileUrl,
              status: 'available',
              extractFromImage: true,
              s3Bucket,
              s3Key,
            });
            success += 1;
            onBookAdded(book);
          } catch (imageError: any) {
            // eslint-disable-next-line no-console
            console.error(`Background upload failed for an image:`, imageError);
            addNotification?.('error', imageError?.message || 'Failed to upload one of the images');
          }
        }
        addNotification?.('success', `Added ${success}/${imagesToUpload.length} book${imagesToUpload.length !== 1 ? 's' : ''}.`);
        setStatusMessage('');
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

          {statusMessage && (
            <div className="mb-4 rounded-md p-4 bg-blue-50">
              <div className="text-sm text-blue-700">{statusMessage}</div>
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
