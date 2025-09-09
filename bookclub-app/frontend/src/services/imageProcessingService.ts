import { ocrService } from './ocrService';

export interface ProcessedImage {
  file: File;
  originalFile: File;
  preview: string;
  isValid: boolean;
  validationMessage?: string;
  confidence?: number;
  isBook?: boolean;
}

export interface ImageValidationOptions {
  maxSizeBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  minBookConfidence?: number;
}

class ImageProcessingService {
  private readonly defaultOptions: Required<ImageValidationOptions> = {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB after processing
    maxWidth: 800, // Smaller than OCR processing to save costs
    maxHeight: 1000,
    quality: 0.8,
    minBookConfidence: 30, // Lower threshold for book detection
  };

  /**
   * Process multiple images with downsizing and validation
   */
  async processImages(
    files: File[],
    options: ImageValidationOptions = {}
  ): Promise<ProcessedImage[]> {
    const config = { ...this.defaultOptions, ...options };
    
    if (files.length > 25) {
      throw new Error('Maximum 25 images allowed');
    }

    const results = await Promise.allSettled(
      files.map(file => this.processImage(file, config))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          file: files[index],
          originalFile: files[index],
          preview: '',
          isValid: false,
          validationMessage: result.reason?.message || 'Failed to process image',
        };
      }
    });
  }

  /**
   * Process a single image
   */
  private async processImage(
    file: File,
    config: Required<ImageValidationOptions>
  ): Promise<ProcessedImage> {
    // Basic file validation
    if (!file.type.startsWith('image/')) {
      return {
        file,
        originalFile: file,
        preview: '',
        isValid: false,
        validationMessage: 'File must be an image',
      };
    }

    try {
      // Create preview URL for original image
      const originalPreview = URL.createObjectURL(file);

      // Downsize the image
      const downsizedFile = await this.downsizeImage(file, config);
      
      // Create preview for downsized image
      const preview = URL.createObjectURL(downsizedFile);

      // Check if downsized file meets size requirements
      if (downsizedFile.size > config.maxSizeBytes) {
        URL.revokeObjectURL(originalPreview);
        URL.revokeObjectURL(preview);
        return {
          file: downsizedFile,
          originalFile: file,
          preview: '',
          isValid: false,
          validationMessage: `Image still too large after processing (${(downsizedFile.size / 1024 / 1024).toFixed(1)}MB). Please use a smaller image.`,
        };
      }

      // Validate that image contains book-related content
      const validation = await this.validateBookContent(downsizedFile, config);

      // Clean up original preview URL
      URL.revokeObjectURL(originalPreview);

      return {
        file: downsizedFile,
        originalFile: file,
        preview,
        isValid: validation.isValid,
        validationMessage: validation.message,
        confidence: validation.confidence,
        isBook: validation.isBook,
      };
    } catch (error) {
      return {
        file,
        originalFile: file,
        preview: '',
        isValid: false,
        validationMessage: error instanceof Error ? error.message : 'Failed to process image',
      };
    }
  }

  /**
   * Downsize image to reduce file size and optimize for storage
   */
  private async downsizeImage(
    file: File,
    config: Required<ImageValidationOptions>
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > config.maxWidth || height > config.maxHeight) {
            const ratio = Math.min(config.maxWidth / width, config.maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const downsizedFile = new File([blob], file.name, {
                  type: 'image/jpeg', // Convert all to JPEG for consistency
                  lastModified: file.lastModified,
                });
                resolve(downsizedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            config.quality
          );

          URL.revokeObjectURL(img.src);
        } catch (error) {
          URL.revokeObjectURL(img.src);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Validate that image contains book-related content using OCR
   */
  private async validateBookContent(
    file: File,
    config: Required<ImageValidationOptions>
  ): Promise<{ isValid: boolean; message?: string; confidence?: number; isBook?: boolean }> {
    try {
      // Use OCR to analyze image content
      const { text, confidence } = await ocrService.extractText(file, false); // Skip preprocessing as we've already downsized

      // Check if text contains book-like content
      const isBook = this.detectBookContent(text);
      
      if (confidence < config.minBookConfidence) {
        return {
          isValid: true, // Allow upload but warn user
          message: `Low text detection confidence (${Math.round(confidence)}%). Image may not be a book cover.`,
          confidence,
          isBook: false,
        };
      }

      if (!isBook) {
        return {
          isValid: false,
          message: 'Image does not appear to contain book-related content. Please upload a book cover or page.',
          confidence,
          isBook: false,
        };
      }

      return {
        isValid: true,
        message: confidence > 70 ? undefined : `Book detected with ${Math.round(confidence)}% confidence`,
        confidence,
        isBook: true,
      };
    } catch (error) {
      // If OCR fails, allow upload but warn user
      return {
        isValid: true,
        message: 'Could not analyze image content. Please ensure this is a book-related image.',
        confidence: 0,
        isBook: undefined,
      };
    }
  }

  /**
   * Detect if text content appears to be from a book
   */
  private detectBookContent(text: string): boolean {
    const normalizedText = text.toLowerCase();
    
    // Common book-related keywords and patterns
    const bookKeywords = [
      'isbn', 'author', 'publisher', 'edition', 'copyright',
      'chapter', 'page', 'novel', 'story', 'book', 'press',
      'publication', 'printed', 'library', 'volume', 'series'
    ];

    const titlePatterns = [
      /^[A-Z][a-z\s]+$/, // Title case
      /\b(the|a|an)\s+[A-Z]/i, // Articles followed by title case
    ];

    // Check for book-related keywords
    const hasBookKeywords = bookKeywords.some(keyword => 
      normalizedText.includes(keyword)
    );

    // Check for title-like patterns
    const hasTitlePatterns = titlePatterns.some(pattern => 
      pattern.test(text.trim())
    );

    // Check for ISBN patterns
    const hasISBN = /isbn[-:\s]*\d{9,13}|978[-\s]*\d{10}|979[-\s]*\d{10}/i.test(normalizedText);

    // Must have either book keywords, title patterns, or ISBN
    return hasBookKeywords || hasTitlePatterns || hasISBN;
  }

  /**
   * Clean up blob URLs to prevent memory leaks
   */
  cleanup(processedImages: ProcessedImage[]): void {
    processedImages.forEach(image => {
      if (image.preview) {
        URL.revokeObjectURL(image.preview);
      }
    });
  }
}

export const imageProcessingService = new ImageProcessingService();