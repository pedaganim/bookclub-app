import React, { useState, useRef, useEffect } from 'react';
import { Book } from '../types';
import { apiService } from '../services/api';
import { ocrService, OCR_CONFIDENCE_THRESHOLDS } from '../services/ocrService';

interface AddBookModalProps {
  onClose: () => void;
  onBookAdded: (book: Book) => void;
}

const AddBookModal: React.FC<AddBookModalProps> = ({ onClose, onBookAdded }) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    status: 'available' as const,
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [ocrProgress, setOCRProgress] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup OCR service on unmount
  useEffect(() => {
    return () => {
      ocrService.cleanup().catch(() => {
        // Silently handle cleanup errors
      });
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = async (file: File) => {
    // Enhanced file validation
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, GIF, WebP)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB. Please choose a smaller image.');
      return;
    }
    
    // Check if file is corrupted by trying to create an image
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      
      URL.revokeObjectURL(url);
    } catch (error) {
      setError('The selected image appears to be corrupted. Please try a different image.');
      return;
    }
    
    setCoverImage(file);
    setError('');
    
    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.onerror = () => {
      setError('Failed to read the image file. Please try again.');
    };
    reader.readAsDataURL(file);
    
    // Perform OCR to extract book details
    await performOCR(file);
  };

  const performOCR = async (file: File) => {
    setProcessingOCR(true);
    setOCRProgress('Initializing OCR engine...');
    setError('');
    
    try {
      setOCRProgress('Preprocessing image for optimal text recognition...');
      
      const { text, confidence } = await ocrService.extractText(file, true);
      
      // Enhanced confidence feedback using defined thresholds
      if (confidence < OCR_CONFIDENCE_THRESHOLDS.LOW) {
        setError(`Low confidence in text extraction (${Math.round(confidence)}%). Please try with a clearer image or fill in details manually.`);
      } else if (confidence < OCR_CONFIDENCE_THRESHOLDS.MODERATE) {
        setError(`Moderate confidence in text extraction (${Math.round(confidence)}%). Please review the extracted details carefully.`);
      } else {
        console.log(`High confidence OCR result: ${Math.round(confidence)}%`);
      }
      
      setOCRProgress('Analyzing book details...');
      const bookDetails = ocrService.extractBookDetails(text);
      
      // Search for metadata using extracted information
      if (bookDetails.isbn || bookDetails.title || bookDetails.author) {
        setOCRProgress('Searching for book metadata...');
        await enrichWithMetadata(bookDetails);
      } else {
        setError('Could not identify book details from image. Please fill in manually.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not extract text from image. You can still fill in details manually.');
    } finally {
      setProcessingOCR(false);
      setOCRProgress('');
    }
  };

  const enrichWithMetadata = async (bookDetails: any) => {
    try {
      const searchParams: any = {};
      
      if (bookDetails.isbn) {
        searchParams.isbn = bookDetails.isbn;
      } else {
        if (bookDetails.title) searchParams.title = bookDetails.title;
        if (bookDetails.author) searchParams.author = bookDetails.author;
      }
      
      const metadata = await apiService.searchBookMetadata(searchParams);
      
      if (metadata) {
        // Auto-populate form with metadata, preferring API data over OCR
        setFormData(prev => ({
          ...prev,
          title: metadata.title || bookDetails.title || prev.title,
          author: metadata.authors?.[0] || bookDetails.author || prev.author,
          description: metadata.description || bookDetails.description || prev.description,
        }));
      } else {
        // Fall back to OCR extracted data
        setFormData(prev => ({
          ...prev,
          title: bookDetails.title || prev.title,
          author: bookDetails.author || prev.author,
          description: bookDetails.description || prev.description,
        }));
      }
    } catch (error) {
      // Still populate with OCR data if API fails
      setFormData(prev => ({
        ...prev,
        title: bookDetails.title || prev.title,
        author: bookDetails.author || prev.author,
        description: bookDetails.description || prev.description,
      }));
    }
  };

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera if available
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
        // Focus on the capture button for accessibility
        setTimeout(() => {
          const captureButton = document.querySelector('[data-testid="capture-button"]') as HTMLButtonElement;
          captureButton?.focus();
        }, 100);
      }
    } catch (error) {
      setError('Could not access camera. Please check permissions or use file upload instead.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
            processImageFile(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  // Handle keyboard navigation for camera controls
  const handleCameraKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      capturePhoto();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      stopCamera();
    }
  };

  const handleClose = async () => {
    // Stop camera if it's running
    stopCamera();
    
    // Clean up OCR resources
    try {
      await ocrService.cleanup();
    } catch (error) {
      // Silently handle cleanup errors
    }
    
    onClose();
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      setUploadingImage(true);
      const uploadData = await apiService.generateUploadUrl(file.type, file.name);
      await apiService.uploadFile(uploadData.uploadUrl, file);
      return uploadData.fileUrl;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let coverImageUrl = '';
      
      if (coverImage) {
        coverImageUrl = await uploadImage(coverImage);
      }

      const bookData = {
        ...formData,
        coverImage: coverImageUrl || undefined,
        enrichWithMetadata: true, // Enable metadata enrichment
      };

      const newBook = await apiService.createBook(bookData);
      onBookAdded(newBook);
    } catch (err: any) {
      setError(err.message || 'Failed to add book');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Book</h3>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter book title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Author *</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Enter author name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the book"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
                <option value="reading">Reading</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
              
              {/* Image capture options */}
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={loading || uploadingImage || processingOCR}
                  aria-label="Take a photo of the book cover using your camera"
                >
                  📷 Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={loading || uploadingImage || processingOCR}
                  aria-label="Upload an image of the book cover from your device"
                >
                  📁 Upload Image
                </button>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                aria-label="Select image file"
              />
              
              {/* Camera view */}
              {showCamera && (
                <div className="mb-3 p-3 border rounded-lg bg-gray-50" role="region" aria-label="Camera interface">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-h-64 rounded-md"
                    aria-label="Camera preview for capturing book cover"
                  />
                  <div className="flex justify-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      onKeyDown={handleCameraKeyDown}
                      data-testid="capture-button"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-label="Capture photo (Press Enter or Space)"
                    >
                      📸 Capture
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      aria-label="Cancel and close camera"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Position the book cover within the frame. Press Enter or Space to capture, Escape to cancel.
                  </p>
                </div>
              )}
              
              {/* Hidden canvas for photo capture */}
              <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
              
              {/* Image preview */}
              {imagePreview && (
                <div className="mb-3">
                  <img
                    src={imagePreview}
                    alt="Book cover preview"
                    className="w-full max-w-xs max-h-48 object-contain border rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setCoverImage(null);
                      setFormData(prev => ({ ...prev, title: '', author: '', description: '' }));
                    }}
                    className="mt-1 text-sm text-red-600 hover:text-red-800 focus:outline-none focus:underline"
                    aria-label="Remove image and clear extracted book details"
                  >
                    Remove image
                  </button>
                </div>
              )}
              
              {/* Enhanced processing status */}
              {processingOCR && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md" role="status" aria-live="polite">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" aria-hidden="true"></div>
                    <span className="text-sm text-blue-700">
                      {ocrProgress || 'Processing image...'}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-blue-200 rounded-full h-1">
                    <div className="bg-blue-600 h-1 rounded-full transition-all duration-300" style={{ width: '60%' }}></div>
                  </div>
                </div>
              )}
              
              {/* File selection fallback */}
              {!showCamera && !imagePreview && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">
                    Take a photo of the book cover or upload an image to automatically fill in book details
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                disabled={loading || uploadingImage || processingOCR}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploadingImage || processingOCR}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : uploadingImage ? 'Uploading...' : processingOCR ? 'Processing...' : 'Add Book'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddBookModal;
