import React, { useState, useRef } from 'react';
import { Book } from '../types';
import { apiService } from '../services/api';
import { createWorker } from 'tesseract.js';

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
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }
    
    setCoverImage(file);
    setError('');
    
    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Perform OCR to extract book details
    await performOCR(file);
  };

  const performOCR = async (file: File) => {
    setProcessingOCR(true);
    setError('');
    
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      
      // Extract book information from OCR text
      await extractBookDetailsFromText(text);
    } catch (error) {
      console.error('OCR failed:', error);
      setError('Could not extract text from image. You can still fill in details manually.');
    } finally {
      setProcessingOCR(false);
    }
  };

  const extractBookDetailsFromText = async (text: string) => {
    try {
      // Extract potential ISBN
      const isbnRegex = /(?:ISBN[-\s]?(?:13|10)?[-\s]?:?[-\s]?)?((?:97[89][-\s]?)?(?:\d[-\s]?){9}[\dx])/gi;
      const isbnMatch = text.match(isbnRegex);
      const isbn = isbnMatch ? isbnMatch[0].replace(/[^\dX]/gi, '') : '';
      
      // Extract lines that might be title/author
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
      
      let searchParams: any = {};
      
      if (isbn) {
        searchParams.isbn = isbn;
      } else {
        // Try to identify title and author from text
        // Usually title is in larger font (appears early) and author follows
        const potentialTitle = lines.find(line => line.length > 5 && line.length < 100);
        const potentialAuthor = lines.find(line => 
          line.toLowerCase().includes('by ') || 
          /^[A-Z][a-z]+ [A-Z][a-z]+/.test(line)
        );
        
        if (potentialTitle) searchParams.title = potentialTitle;
        if (potentialAuthor) searchParams.author = potentialAuthor.replace(/^by\s+/i, '');
      }
      
      if (Object.keys(searchParams).length > 0) {
        // Search for metadata using extracted information
        const metadata = await apiService.searchBookMetadata(searchParams);
        
        if (metadata) {
          // Auto-populate form with metadata
          setFormData(prev => ({
            ...prev,
            title: metadata.title || prev.title,
            author: metadata.authors?.[0] || prev.author,
            description: metadata.description || prev.description,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to extract book details:', error);
      setError('Could not find book details. Please fill in manually.');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera if available
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      setError('Could not access camera. Please use file upload instead.');
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
                  className="px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
                  disabled={loading || uploadingImage || processingOCR}
                >
                  📷 Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-50"
                  disabled={loading || uploadingImage || processingOCR}
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
              />
              
              {/* Camera view */}
              {showCamera && (
                <div className="mb-3 p-3 border rounded-lg bg-gray-50">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-h-64 rounded-md"
                  />
                  <div className="flex justify-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Capture
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Hidden canvas for photo capture */}
              <canvas ref={canvasRef} className="hidden" />
              
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
                    className="mt-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove image
                  </button>
                </div>
              )}
              
              {/* Processing status */}
              {processingOCR && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-700">Extracting book details from image...</span>
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
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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
