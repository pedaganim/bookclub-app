import React, { useState } from 'react';
import MultiImageUpload from '../components/MultiImageUpload';

type SelectedImage = { file: File; preview?: string };

const MultiImageUploadDemo: React.FC = () => {
  const [processedImages, setProcessedImages] = useState<SelectedImage[]>([]);
  const [error, setError] = useState<string>('');

  const handleImagesProcessed = (images: SelectedImage[]) => {
    setProcessedImages(images);
    // eslint-disable-next-line no-console
    console.log('Processed images:', images);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // eslint-disable-next-line no-console
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