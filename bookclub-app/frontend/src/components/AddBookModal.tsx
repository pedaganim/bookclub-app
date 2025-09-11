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
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingBooks, setProcessingBooks] = useState<Book[]>([]);
  const [processingComplete, setProcessingComplete] = useState(false);

  const handleImagesProcessed = (images: ProcessedImage[]) => {
    setUploadedImages(images);
    setError('');
  };

  const handleImageError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Check for newly created books and their processing status
  const checkProcessingStatus = async (uploadTimestamp: number) => {
    try {
      let allBooks: Book[] = [];
      let nextToken: string | undefined = undefined;
      let keepFetching = true;

      // Fetch all books using pagination to ensure we don't miss any
      while (keepFetching) {
        const response = await apiService.listBooks({ limit: 20, nextToken });
        if (response.items && response.items.length > 0) {
          // Filter books created after upload timestamp with pending metadata
          const filteredBooks = response.items.filter(book => {
            const bookCreated = new Date(book.createdAt).getTime();
            return bookCreated >= uploadTimestamp && 
                   (book.metadataSource === 'image-upload-pending' || 
                    book.metadataSource === 'textract-auto-processed');
          });
          allBooks = allBooks.concat(filteredBooks);
        }
        nextToken = response.nextToken;
        // Stop if no more pages
        if (!nextToken) {
          keepFetching = false;
        }
      }

      setProcessingBooks(allBooks);

      const pendingBooks = allBooks.filter(book => book.metadataSource === 'image-upload-pending');
      const completedBooks = allBooks.filter(book => book.metadataSource === 'textract-auto-processed');

      if (pendingBooks.length === 0 && completedBooks.length > 0) {
        // All processing complete
        setProcessingComplete(true);
        setProcessingStatus(`Processing complete! ${completedBooks.length} book${completedBooks.length > 1 ? 's' : ''} ready.`);
        
        // Notify parent of new books
        completedBooks.forEach(book => onBookAdded(book));
        
        return true; // Processing complete
      } else if (pendingBooks.length > 0) {
        // Still processing
        setProcessingStatus(`Processing ${pendingBooks.length} book${pendingBooks.length > 1 ? 's' : ''}... (${completedBooks.length} completed)`);
        return false; // Still processing
      }
      
      return false; // No books found yet, continue polling
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error checking processing status:', error);
      return true; // Stop polling on error
    }
  };

  // Start polling for processing status after upload
  const startProcessingStatusCheck = async (uploadTimestamp: number) => {
    const maxPolls = 30; // Max 30 polls (about 2 minutes)
    let pollCount = 0;
    
    const poll = async () => {
      pollCount++;
      const isComplete = await checkProcessingStatus(uploadTimestamp);
      
      if (isComplete || pollCount >= maxPolls) {
        if (pollCount >= maxPolls && !isComplete) {
          setProcessingStatus('Processing is taking longer than expected. Your books will appear in your library once ready.');
          setProcessingComplete(true);
        }
        return; // Stop polling
      }
      
      // Continue polling every 4 seconds
      setTimeout(poll, 4000);
    };
    
    // Start polling after a short delay to allow S3 trigger to process
    setTimeout(poll, 3000);
  };

  const uploadImagesOnly = async () => {
    if (uploadedImages.length === 0) {
      setError('Please upload at least one book image.');
      return;
    }

    setLoading(true);
    setError('');
    setProcessingStatus('Uploading images...');
    setProcessingBooks([]);
    setProcessingComplete(false);

    try {
      const validImages = uploadedImages.filter(img => img.isValid && img.isBook);
      
      if (validImages.length === 0) {
        setError('No valid book images found. Please upload book cover images.');
        return;
      }

      const uploadTimestamp = Date.now(); // Record upload time for filtering
      
      for (let i = 0; i < validImages.length; i++) {
        const image = validImages[i];
        
        try {
          setProcessingStatus(`Uploading image ${i + 1} of ${validImages.length}...`);
          
          // Upload image to S3 only
          const uploadData = await apiService.generateUploadUrl(image.file.type, image.file.name);
          await apiService.uploadFile(uploadData.uploadUrl, image.file);
          
        } catch (imageError) {
          // eslint-disable-next-line no-console
          console.error(`Failed to upload image ${i + 1}:`, imageError);
          // Continue with next image
        }
      }

      setProcessingStatus(`Images uploaded successfully. Creating books and processing metadata...`);
      
      // Start checking for book creation and processing status
      await startProcessingStatusCheck(uploadTimestamp);
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload images');
      setProcessingComplete(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Only allow closing when not actively processing
    if (!loading && (processingComplete || !processingStatus)) {
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
            Upload multiple book cover images to automatically create book entries. Each image will be processed to extract book information.
          </p>
          
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {processingStatus && (
            <div className={`mb-4 rounded-md p-4 ${processingComplete ? 'bg-green-50' : 'bg-blue-50'}`}>
              <div className="flex items-center">
                {!processingComplete && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" aria-hidden="true"></div>
                )}
                {processingComplete && (
                  <div className="text-green-600 mr-2">✓</div>
                )}
                <div className={`text-sm ${processingComplete ? 'text-green-700' : 'text-blue-700'}`}>
                  {processingStatus}
                </div>
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

          {/* Processing Status */}
          {processingBooks.length > 0 && (
            <div className="mb-6 p-4 bg-green-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Books Being Processed</h4>
              <div className="space-y-2">
                {processingBooks.map((book) => (
                  <div key={book.bookId} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center">
                      {book.coverImage && (
                        <img 
                          src={book.coverImage} 
                          alt={book.title}
                          className="w-8 h-8 object-cover rounded mr-3"
                        />
                      )}
                      <div>
                        <div className="font-medium text-sm text-gray-900">{book.title}</div>
                        <div className="text-xs text-gray-500">{book.author}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {book.metadataSource === 'textract-auto-processed' ? (
                        <span className="text-xs text-green-600 font-medium flex items-center">
                          ✓ Complete
                        </span>
                      ) : (
                        <span className="text-xs text-blue-600 font-medium flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                          Processing...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              disabled={loading && !processingComplete}
            >
              {processingComplete ? 'Done' : 'Cancel'}
            </button>
            {!processingComplete && (
              <button
                type="button"
                onClick={uploadImagesOnly}
                disabled={loading || validBookImagesCount === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {loading ? 'Processing...' : `Upload ${validBookImagesCount} Image${validBookImagesCount !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBookModal;
