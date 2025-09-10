import React, { useState } from 'react';
import { Book } from '../types';
import { apiService } from '../services/api';
import { ProcessedImage } from '../services/imageProcessingService';
import MultiImageUpload from './MultiImageUpload';
import { parseS3Url } from '../utils/s3Utils';

interface AddBookModalProps {
  onClose: () => void;
  onBookAdded: (book: Book) => void;
}

const AddBookModal: React.FC<AddBookModalProps> = ({ onClose, onBookAdded }) => {
  const [uploadedImages, setUploadedImages] = useState<ProcessedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');
  const [processedBooks, setProcessedBooks] = useState<{ book: Book; imageIndex: number }[]>([]);

  const handleImagesProcessed = (images: ProcessedImage[]) => {
    setUploadedImages(images);
    setError('');
  };

  const handleImageError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const processImagesAndCreateBooks = async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one book image.');
      return;
    }

    setLoading(true);
    setError('');
    setProcessingStatus('Processing images and creating books...');

    try {
      const validImages = uploadedImages.filter(img => img.isValid && img.isBook);
      
      if (validImages.length === 0) {
        setError('No valid book images found. Please upload book cover images.');
        return;
      }

      const createdBooks: { book: Book; imageIndex: number }[] = [];
      let processed = 0;

      for (let i = 0; i < validImages.length; i++) {
        const image = validImages[i];
        const imageIndex = uploadedImages.indexOf(image);
        
        try {
          setProcessingStatus(`Uploading image ${i + 1} of ${validImages.length}...`);
          
          // Upload image to S3
          const uploadData = await apiService.generateUploadUrl(image.file.type, image.file.name);
          await apiService.uploadFile(uploadData.uploadUrl, image.file);
          
          // Extract S3 bucket and key from uploadData.fileUrl using utility function
          const { bucket: s3Bucket, key: s3Key } = parseS3Url(uploadData.fileUrl);
          
          setProcessingStatus(`Extracting metadata from image ${i + 1}...`);
          
          let extractedData = null;
          
          // First try to get pre-extracted metadata (from automatic processing)
          try {
            extractedData = await apiService.getPreExtractedMetadata(s3Bucket, s3Key);
          } catch (preExtractError) {
            // eslint-disable-next-line no-console
            console.warn(`Pre-extraction not available for image ${i + 1}, falling back to manual extraction`);
          }
          
          // If pre-extracted data not available, try manual extraction
          if (!extractedData) {
            try {
              extractedData = await apiService.extractImageMetadata(s3Bucket, s3Key);
            } catch (manualExtractError) {
              // eslint-disable-next-line no-console
              console.warn(`Manual extraction also failed for image ${i + 1}:`, manualExtractError);
            }
          }
          
          if (extractedData && extractedData.metadata && extractedData.metadata.title && extractedData.metadata.author) {
            // Create book with extracted metadata
            const bookData = {
              title: extractedData.metadata.title,
              author: extractedData.metadata.author,
              description: extractedData.metadata.description || extractedData.extractedText || '',
              coverImage: uploadData.fileUrl,
              status: 'available' as const,
              isbn: extractedData.metadata.isbn || undefined,
              enrichWithMetadata: true,
            };
            
            const newBook = await apiService.createBook(bookData);
            createdBooks.push({ book: newBook, imageIndex });
            processed++;
          } else {
            // If metadata extraction fails, skip this image
            // eslint-disable-next-line no-console
            console.warn(`Could not extract sufficient metadata from image ${i + 1}`);
          }
        } catch (imageError) {
          // eslint-disable-next-line no-console
          console.error(`Failed to process image ${i + 1}:`, imageError);
          // Continue with next image
        }
      }

      setProcessedBooks(createdBooks);
      
      if (processed > 0) {
        setProcessingStatus(`Successfully created ${processed} book${processed > 1 ? 's' : ''} from ${validImages.length} image${validImages.length > 1 ? 's' : ''}.`);
        
        // Notify parent component about the first book (for backwards compatibility)
        if (createdBooks.length > 0) {
          onBookAdded(createdBooks[0].book);
        }
      } else {
        setError('Could not create any books from the uploaded images. Please ensure the images contain clear book cover text with title and author information.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process images and create books');
    } finally {
      setLoading(false);
      setProcessingStatus('');
    }
  };

  const handleClose = () => {
    onClose();
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
            Upload multiple book cover images to automatically create book entries. Each image will be processed to extract book information.
          </p>
          
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {processingStatus && (
            <div className="mb-4 rounded-md bg-blue-50 p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" aria-hidden="true"></div>
                <div className="text-sm text-blue-700">{processingStatus}</div>
              </div>
            </div>
          )}

          {/* Success Summary */}
          {processedBooks.length > 0 && (
            <div className="mb-4 rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">
                <p className="font-medium mb-2">Successfully created {processedBooks.length} book{processedBooks.length > 1 ? 's' : ''}:</p>
                <ul className="list-disc list-inside space-y-1">
                  {processedBooks.map(({ book }, index) => (
                    <li key={index}>
                      <span className="font-medium">{book.title}</span> by {book.author}
                    </li>
                  ))}
                </ul>
              </div>
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
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={loading}
            >
              {processedBooks.length > 0 ? 'Done' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={processImagesAndCreateBooks}
              disabled={loading || validBookImagesCount === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {loading ? 'Processing...' : `Create ${validBookImagesCount} Book${validBookImagesCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBookModal;
