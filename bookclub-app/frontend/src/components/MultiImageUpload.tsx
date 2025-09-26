import React, { useState, useRef, useCallback } from 'react';

// Minimal local type for selected images
interface SelectedImage {
  file: File;
  preview?: string;
}

interface MultiImageUploadProps {
  onImagesProcessed: (images: SelectedImage[]) => void;
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
  const [processedImages, setProcessedImages] = useState<SelectedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  const handleFileSelection = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const totalFiles = processedImages.length + fileArray.length;

    if (totalFiles > maxImages) {
      onError(`Maximum ${maxImages} images allowed. You can add ${maxImages - processedImages.length} more.`);
      return;
    }

    // Basic size validations
    const MAX_PER_FILE = 10 * 1024 * 1024; // 10MB per file
    const MAX_TOTAL = 50 * 1024 * 1024; // 50MB total
    const oversize = fileArray.filter(f => f.size > MAX_PER_FILE);
    if (oversize.length > 0) {
      onError(`Some files exceed 10MB and were skipped: ${oversize.map(f => f.name).join(', ')}`);
    }
    // Skip unsupported HEIC/HEIF which often fails on web upload
    const unsupported = fileArray.filter(f => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name));
    if (unsupported.length > 0) {
      onError(`Some files are in HEIC/HEIF format and were skipped: ${unsupported.map(f => f.name).join(', ')}`);
    }
    const accepted = fileArray.filter(f => f.size <= MAX_PER_FILE && !unsupported.includes(f));
    const totalSize = accepted.reduce((s, f) => s + f.size, 0) + processedImages.reduce((s, img) => s + (img.file?.size || 0), 0);
    if (totalSize > MAX_TOTAL) {
      onError(`Total selected size exceeds 50MB. Please add fewer or smaller images.`);
      return;
    }

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: accepted.length });

    try {
      const compressImage = async (file: File): Promise<File> => {
        // Keep GIFs as-is; compress others to JPEG
        if (/gif$/i.test(file.type)) return file;
        // In test or non-supporting envs, skip compression to avoid hangs
        const hasCreateImageBitmap = typeof (globalThis as any).createImageBitmap === 'function';
        if (!hasCreateImageBitmap) return file;
        const maxDim = 1600;
        const drawToCanvasAndMakeFile = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): Promise<File> => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return Promise.resolve(file);
          const scale = Math.min(1, maxDim / Math.max(width, height));
          const w = Math.max(1, Math.round(width * scale));
          const h = Math.max(1, Math.round(height * scale));
          canvas.width = w;
          canvas.height = h;
          draw(ctx, w, h);
          return new Promise<File>((resolve) => {
            canvas.toBlob((blob) => {
              if (!blob) return resolve(file);
              const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
              resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
            }, 'image/jpeg', 0.8);
          });
        };

        try {
          const bitmap = await createImageBitmap(file);
          return await drawToCanvasAndMakeFile(bitmap.width, bitmap.height, (ctx, w, h) => {
            ctx.drawImage(bitmap, 0, 0, w, h);
          });
        } catch {
          // Fallback to HTMLImageElement path
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            let resolved = false;
            const cleanup = () => { if (i.src) URL.revokeObjectURL(i.src); };
            i.onload = () => { resolved = true; cleanup(); resolve(i); };
            i.onerror = () => { cleanup(); reject(new Error('image load failed')); };
            i.src = URL.createObjectURL(file);
            // If running under jsdom (no image decode), resolve quickly with original file
            setTimeout(() => { if (!resolved) { cleanup(); resolve(i); } }, 30);
          }).catch(() => null as unknown as HTMLImageElement);
          if (!img || (!img.naturalWidth && !img.width)) {
            // Could not decode image (likely test env); skip compression
            return file;
          }
          const result = await drawToCanvasAndMakeFile(img.naturalWidth || img.width, img.naturalHeight || img.height, (ctx, w, h) => {
            ctx.drawImage(img, 0, 0, w, h);
          });
          // img.src blob already revoked in cleanup
          return result;
        }
      };

      const compressedFiles: File[] = [];
      for (let i = 0; i < accepted.length; i++) {
        const f = accepted[i];
        try {
          const cf = await compressImage(f);
          compressedFiles.push(cf);
        } catch {
          compressedFiles.push(f);
        }
        setProcessingProgress({ current: i + 1, total: accepted.length });
      }

      const results: SelectedImage[] = compressedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      const newImages = [...processedImages, ...results];
      setProcessedImages(newImages);
      onImagesProcessed(newImages);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to process images');
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
  }, [processedImages, maxImages, onImagesProcessed, onError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(e.target.files);
  };

  const removeImage = (index: number) => {
    const newImages = processedImages.filter((_, i) => i !== index);

    // Clean up the removed image's blob URL
    const prevUrl = processedImages[index]?.preview;
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
    }

    setProcessedImages(newImages);
    onImagesProcessed(newImages);
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      processedImages.forEach((image) => {
        if (image.preview) URL.revokeObjectURL(image.preview);
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
          📁 Add Book Cover Image ({processedImages.length}/{maxImages})
        </button>

        {processedImages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              processedImages.forEach((image) => {
                if (image.preview) URL.revokeObjectURL(image.preview);
              });
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
      {isProcessing && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md" role="status" aria-live="polite">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" aria-hidden="true"></div>
            <span className="text-sm text-blue-700">
              Processing images... ({processingProgress.current}/{processingProgress.total})
            </span>
          </div>
          <div className="mt-2 w-full bg-blue-200 rounded-full h-1">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${(processingProgress.current / Math.max(processingProgress.total, 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Image Grid */}
      {processedImages.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {processedImages.map((image, index) => (
            <div key={index} className="relative border rounded-lg p-2 bg-gray-50">
              {image.preview && (
                <img
                  src={image.preview}
                  alt={`Selected ${index + 1}`}
                  className="w-full h-24 object-cover rounded-md"
                />
              )}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-gray-900"
                aria-label={`Remove image ${index + 1}`}
              >
                ×
              </button>
              <p className="text-xs text-gray-600 mt-1 truncate">{(image.file.size / 1024).toFixed(0)}KB</p>
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
            <span>Selected: {processedImages.length}</span>
            <span>Total size: {(processedImages.reduce((s, img) => s + img.file.size, 0) / 1024).toFixed(0)}KB</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiImageUpload;