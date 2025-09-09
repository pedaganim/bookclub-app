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
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageMetadata, setImageMetadata] = useState<any[]>([]);
  const [nonBookImages, setNonBookImages] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = 25; // Cost control limit

  // Cleanup OCR service on unmount
  useEffect(() => {
    return () => {
      ocrService.cleanup().catch(() => {
        // Silently handle cleanup errors
      });
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processImageFiles(files);
    }
  };

  const processImageFiles = async (newFiles: File[]) => {
    // Check total limit
    if (images.length + newFiles.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed. You can add ${MAX_IMAGES - images.length} more images.`);
      return;
    }

    setError('');
    setProcessingImages(true);
    setImageProgress('Validating images...');

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    // Validate and process each file
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      
      // Enhanced file validation
      if (!file.type.startsWith('image/')) {
        setError(`File ${file.name} is not an image. Please select image files only.`);
        continue;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(`Image ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`);
        continue;
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
        
        // Create preview
        newPreviews.push(url);
        validFiles.push(file);
      } catch (error) {
        setError(`Image ${file.name} appears to be corrupted. Please try a different image.`);
        continue;
      }
    }

    if (validFiles.length === 0) {
      setProcessingImages(false);
      setImageProgress('');
      return;
    }

    // Update state with new valid images
    setImages(prev => [...prev, ...validFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);

    // Process images for metadata extraction
    await processImagesForMetadata(validFiles, images.length);

    setProcessingImages(false);
    setImageProgress('');
  };

  const processImagesForMetadata = async (filesToProcess: File[], startIndex: number) => {
    setImageProgress('Processing images for book detection...');
    
    try {
      // Upload images first
      const uploadPromises = filesToProcess.map(async (file, index) => {
        try {
          const uploadData = await apiService.generateUploadUrl(file.type, file.name);
          await apiService.uploadFile(uploadData.uploadUrl, file);
          return {
            s3Bucket: uploadData.fileUrl.split('/')[2].split('.')[0], // Extract bucket from URL
            s3Key: uploadData.fileKey,
            localIndex: startIndex + index,
          };
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          return null;
        }
      });

      const uploadResults = (await Promise.all(uploadPromises)).filter(Boolean);

      if (uploadResults.length === 0) {
        setError('Failed to upload images for processing.');
        return;
      }

      // Extract metadata from uploaded images
      const metadataResult = await apiService.extractImageMetadata(uploadResults);

      // Process results
      const newNonBookImages: number[] = [];
      const newMetadata: any[] = [];

      metadataResult.results.forEach((result, index) => {
        if (result.success && !result.isBook) {
          newNonBookImages.push(uploadResults[index].localIndex);
        }
        newMetadata.push(result);
      });

      setNonBookImages(prev => [...prev, ...newNonBookImages]);
      setImageMetadata(prev => [...prev, ...newMetadata]);

      // Auto-populate form with best metadata if available
      if (metadataResult.summary.bestMetadata && !formData.title) {
        const bestMeta = metadataResult.summary.bestMetadata;
        setFormData(prev => ({
          ...prev,
          title: bestMeta.title || prev.title,
          author: bestMeta.author || prev.author,
          description: bestMeta.description || prev.description,
        }));
      }

      // Show warnings for non-book images
      if (newNonBookImages.length > 0) {
        setError(`${newNonBookImages.length} image(s) don't appear to be book covers. They are highlighted in red. Consider removing them.`);
      }

    } catch (error) {
      console.error('Metadata processing failed:', error);
      setError('Failed to analyze images. You can still continue manually.');
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    const newMetadata = imageMetadata.filter((_, i) => i !== index);
    const newNonBookImages = nonBookImages.filter(i => i !== index).map(i => i > index ? i - 1 : i);

    setImages(newImages);
    setImagePreviews(newPreviews);
    setImageMetadata(newMetadata);
    setNonBookImages(newNonBookImages);

    // Clean up preview URL
    if (imagePreviews[index]) {
      URL.revokeObjectURL(imagePreviews[index]);
    }

    setError('');
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
            const file = new File([blob], `captured-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            processImageFiles([file]);
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
    
    // Clean up image previews
    imagePreviews.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    
    // Clean up OCR resources
    try {
      await ocrService.cleanup();
    } catch (error) {
      // Silently handle cleanup errors
    }
    
    onClose();
  };

  const uploadImages = async (imagesToUpload: File[]): Promise<string[]> => {
    if (imagesToUpload.length === 0) return [];

    try {
      setUploadingImages(true);
      
      if (imagesToUpload.length === 1) {
        // Single image upload (backward compatibility)
        const uploadData = await apiService.generateUploadUrl(imagesToUpload[0].type, imagesToUpload[0].name);
        await apiService.uploadFile(uploadData.uploadUrl, imagesToUpload[0]);
        return [uploadData.fileUrl];
      } else {
        // Bulk image upload
        const files = imagesToUpload.map(file => ({
          fileType: file.type,
          fileName: file.name,
        }));
        
        const bulkUploadData = await apiService.generateBulkUploadUrls(files);
        
        // Upload all images in parallel
        const uploadPromises = imagesToUpload.map(async (file, index) => {
          const uploadInfo = bulkUploadData.uploads[index];
          await apiService.uploadFile(uploadInfo.uploadUrl, file);
          return uploadInfo.fileUrl;
        });
        
        return await Promise.all(uploadPromises);
      }
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Filter out non-book images if user hasn't manually approved them
      const imagesToUpload = images.filter((_, index) => !nonBookImages.includes(index));
      
      if (imagesToUpload.length === 0 && images.length > 0) {
        setError('All selected images appear to be non-book images. Please add at least one book cover image or proceed anyway.');
        setLoading(false);
        return;
      }

      let imageUrls: string[] = [];
      
      if (imagesToUpload.length > 0) {
        imageUrls = await uploadImages(imagesToUpload);
      }

      const bookData = {
        ...formData,
        images: imageUrls,
        // Maintain backward compatibility with coverImage
        coverImage: imageUrls[0] || undefined,
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Book Images ({images.length}/{MAX_IMAGES})
              </label>
              
              {/* Image capture options */}
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={loading || uploadingImages || processingImages || images.length >= MAX_IMAGES}
                  aria-label="Take a photo of the book cover using your camera"
                >
                  📷 Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={loading || uploadingImages || processingImages || images.length >= MAX_IMAGES}
                  aria-label="Upload images of the book cover from your device"
                >
                  📁 Upload Images
                </button>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
                aria-label="Select image files"
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
              
              {/* Image grid */}
              {imagePreviews.length > 0 && (
                <div className="mb-3">
                  <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                    {imagePreviews.map((preview, index) => (
                      <div 
                        key={index} 
                        className={`relative group ${
                          nonBookImages.includes(index) 
                            ? 'ring-2 ring-red-500 bg-red-50 rounded-md' 
                            : ''
                        }`}
                      >
                        <img
                          src={preview}
                          alt={`Book cover ${index + 1}`}
                          className="w-full h-20 object-cover border rounded-md"
                        />
                        {nonBookImages.includes(index) && (
                          <div className="absolute top-0 left-0 bg-red-500 text-white text-xs px-1 rounded-br-md">
                            ⚠️ Not a book
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove image ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Red-bordered images appear to not be book covers. Review and remove if needed.
                  </p>
                </div>
              )}
              
              {/* Enhanced processing status */}
              {processingImages && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md" role="status" aria-live="polite">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" aria-hidden="true"></div>
                    <span className="text-sm text-blue-700">
                      {imageProgress || 'Processing images...'}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-blue-200 rounded-full h-1">
                    <div className="bg-blue-600 h-1 rounded-full transition-all duration-300" style={{ width: '60%' }}></div>
                  </div>
                </div>
              )}
              
              {/* Upload prompt */}
              {!showCamera && imagePreviews.length === 0 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">
                    Take photos or upload images of the book covers to automatically fill in book details
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Up to {MAX_IMAGES} images • JPG, PNG, GIF, WebP • Max 5MB each
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                disabled={loading || uploadingImages || processingImages}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploadingImages || processingImages}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading 
                  ? 'Adding...' 
                  : uploadingImages 
                  ? 'Uploading...' 
                  : processingImages 
                  ? 'Processing...' 
                  : 'Add Book'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddBookModal;
