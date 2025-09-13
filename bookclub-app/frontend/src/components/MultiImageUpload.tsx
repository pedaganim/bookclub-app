import React, { useState, useRef, useCallback } from 'react';
import type { ProcessedImage } from '../services/imageProcessingService';

interface MultiImageUploadProps {
  onImagesProcessed: (images: ProcessedImage[]) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  maxImages?: number;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  onImagesProcessed,
  onError,
  disabled = false,
  maxImages = 25,
}) => {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const totalFiles = processedImages.length + fileArray.length;

    if (totalFiles > maxImages) {
      onError(`Maximum ${maxImages} images allowed. You can add ${maxImages - processedImages.length} more.`);
      return;
    }

    try {
      // No client-side processing: create lightweight entries with preview URLs
      const results: ProcessedImage[] = fileArray.map((file) => ({
        file,
        originalFile: file,
        preview: URL.createObjectURL(file),
        isValid: true,
        isBook: true,
        confidence: undefined,
        validationMessage: '',
      } as unknown as ProcessedImage));

      const newImages = [...processedImages, ...results];
      setProcessedImages(newImages);
      onImagesProcessed(newImages);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to add images');
    }
  }, [processedImages, maxImages, onImagesProcessed, onError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(e.target.files);
  };

  const removeImage = (index: number) => {
    const newImages = processedImages.filter((_, i) => i !== index);
    
    // Clean up the removed image's blob URL
    if (processedImages[index].preview) {
      URL.revokeObjectURL(processedImages[index].preview);
    }
    
    setProcessedImages(newImages);
    onImagesProcessed(newImages);
  };

  // Removed retry logic; no client-side processing

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Revoke any created object URLs on unmount
      processedImages.forEach((img) => {
        if (img.preview) URL.revokeObjectURL(img.preview);
      });
    };
  }, [processedImages]);

  return (
    <div className="space-y-4">
      {/* Upload Controls */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          disabled={disabled || isProcessing || processedImages.length >= maxImages}
          aria-label="Upload multiple book images"
        >
          📁 Add Images ({processedImages.length}/{maxImages})
        </button>
        
        {processedImages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              imageProcessingService.cleanup(processedImages);
              setProcessedImages([]);
              onImagesProcessed([]);
            }}
            className="px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={disabled || isProcessing}
          >
            🗑️ Clear All
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-label="Select multiple image files"
      />

      {/* Processing Progress */}
      {/* No client-side processing status */}

      {/* Image Grid */}
      {processedImages.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {processedImages.map((image, index) => (
            <div
              key={index}
              className={`relative border-2 rounded-lg p-2 ${
                image.isValid
                  ? image.isBook
                    ? 'border-green-200 bg-green-50'
                    : 'border-yellow-200 bg-yellow-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              {/* Image Preview */}
              {image.preview && (
                <img
                  src={image.preview}
                  alt={`Book ${index + 1}`}
                  className="w-full h-24 object-cover rounded-md"
                />
              )}

              {/* Status Indicator */}
              <div className="absolute top-1 right-1 flex gap-1">
                {image.isValid ? (
                  image.isBook ? (
                    <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      ✓
                    </span>
                  ) : (
                    <span className="bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      ⚠
                    </span>
                  )
                ) : (
                  <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    ✗
                  </span>
                )}
                
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-900"
                  aria-label={`Remove image ${index + 1}`}
                >
                  ×
                </button>
              </div>

              {/* Validation Message */}
              {image.validationMessage && (
                <p className={`text-xs mt-1 ${
                  image.isValid ? 'text-yellow-700' : 'text-red-700'
                }`}>
                  {image.validationMessage}
                </p>
              )}

              {/* File Info */}
              <p className="text-xs text-gray-600 mt-1 truncate">
                {(image.file.size / 1024).toFixed(0)}KB
                {image.confidence !== undefined && ` • ${Math.round(image.confidence)}% confidence`}
              </p>

              {/* No retry button since we removed client-side processing */}
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      {processedImages.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">
            Upload up to {maxImages} book images. We'll upload them as-is and process details in the background.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Supported formats: JPG, PNG, GIF • Large files may take longer to upload
          </p>
        </div>
      )}

      {/* Summary */}
      {processedImages.length > 0 && (
        <div className="text-xs text-gray-600 pt-2 border-t">
          <div className="flex justify-between">
            <span>
              Valid: {processedImages.filter(img => img.isValid).length} • 
              Book content: {processedImages.filter(img => img.isBook).length} • 
              Invalid: {processedImages.filter(img => !img.isValid).length}
            </span>
            <span>
              Total size: {(processedImages.reduce((sum, img) => sum + img.file.size, 0) / 1024).toFixed(0)}KB
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiImageUpload;