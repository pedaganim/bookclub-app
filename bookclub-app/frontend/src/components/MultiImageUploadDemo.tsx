import React, { useState } from 'react';
import MultiImageUpload from '../components/MultiImageUpload';
import { ProcessedImage } from '../services/imageProcessingService';

const MultiImageUploadDemo: React.FC = () => {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [error, setError] = useState<string>('');

  const handleImagesProcessed = (images: ProcessedImage[]) => {
    setProcessedImages(images);
    console.log('Processed images:', images);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    console.error('Upload error:', errorMessage);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Multi-Image Upload Demo</h1>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <MultiImageUpload
        onImagesProcessed={handleImagesProcessed}
        onError={handleError}
        maxImages={25}
      />

      {processedImages.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Results</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>Total Images: {processedImages.length}</div>
              <div>Valid Images: {processedImages.filter(img => img.isValid).length}</div>
              <div>Book Content Detected: {processedImages.filter(img => img.isBook).length}</div>
              <div>Invalid Images: {processedImages.filter(img => !img.isValid).length}</div>
              <div>
                Total Size: {(processedImages.reduce((sum, img) => sum + img.file.size, 0) / 1024).toFixed(0)}KB
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiImageUploadDemo;