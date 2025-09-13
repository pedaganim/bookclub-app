import React, { useState } from 'react';
import { Book } from '../types';
import { apiService } from '../services/api';
import { ProcessedImage } from '../services/imageProcessingService';
import MultiImageUpload from './MultiImageUpload';

interface AddBookModalProps {
  onClose: () => void;
  onBookAdded: (book: Book) => void;
}

const AddBookModal: React.FC<AddBookModalProps> = ({ onClose, onBookAdded }) => {
  const [uploadedImages, setUploadedImages] = useState<ProcessedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [completedBooks, setCompletedBooks] = useState<Book[]>([]);

  const handleImagesProcessed = (images: ProcessedImage[]) => {
    setUploadedImages(images);
    setError('');
  };

  const handleImageError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Removed background processing/polling

  const uploadImagesOnly = async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one book image.');
      return;
    }

    setLoading(true);
    setError('');
    setStatusMessage('Uploading images...');
    setCompletedBooks([]);

    try {
      const validImages = uploadedImages.filter(img => img.isValid);
      
      if (validImages.length === 0) {
        setError('No valid book images found. Please upload book cover images.');
        return;
      }

      const created: Book[] = [];

      for (let i = 0; i < validImages.length; i++) {
        const image = validImages[i];
        
        try {
          setStatusMessage(`Uploading image ${i + 1} of ${validImages.length}...`);
          
          // Upload image to S3 only
          const uploadData = await apiService.generateUploadUrl(image.file.type, image.file.name);
          await apiService.uploadFile(uploadData.uploadUrl, image.file);
          // Create a minimal book with empty title/description and uploaded cover
          const book = await apiService.createBook({
            title: '',
            author: '',
            description: '',
            coverImage: uploadData.fileUrl,
            status: 'available',
            enrichWithMetadata: false,
          });
          created.push(book);
          onBookAdded(book);
        } catch (imageError) {
          // eslint-disable-next-line no-console
          console.error(`Failed to upload image ${i + 1}:`, imageError);
          // Continue with next image
        }
      }
      setCompletedBooks(created);
      setStatusMessage(`Uploaded ${created.length} book${created.length !== 1 ? 's' : ''}.`);
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload images');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Close when not loading
    if (!loading) {
      onClose();
    }
  };

  // Compute filter counts once to avoid redundant operations
  const validBookImagesCount = uploadedImages.filter(img => img.isValid && img.isBook).length;
  const invalidImagesCount = uploadedImages.filter(img => !img.isValid).length;
  const nonBookImagesCount = uploadedImages.filter(img => img.isValid && !img.isBook).length;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Books</h3>
          <p className="text-sm text-gray-600 mb-6">
            Upload multiple book cover images to create book entries quickly. We'll skip image processing; you can edit details later.
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
              <div className="text-xs text-gray-600 grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Total images:</span> {uploadedImages.length}
                </div>
                <div>
                  <span className="font-medium">Valid book images:</span> {validBookImagesCount}
                </div>
                <div>
                  <span className="font-medium">Invalid images:</span> {invalidImagesCount}
                </div>
                <div>
                  <span className="font-medium">Non-book images:</span> {nonBookImagesCount}
                </div>
              </div>
            </div>
          )}

          {/* No background processing list */}
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadImagesOnly}
              disabled={loading || validBookImagesCount === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {loading ? 'Uploading...' : `Upload ${validBookImagesCount} Image${validBookImagesCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBookModal;
