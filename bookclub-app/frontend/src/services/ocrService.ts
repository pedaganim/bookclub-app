import { createWorker } from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface BookDetails {
  title?: string;
  author?: string;
  isbn?: string;
  description?: string;
}

// Confidence thresholds for OCR results
export const OCR_CONFIDENCE_THRESHOLDS = {
  LOW: 30,
  MODERATE: 60,
  HIGH: 70
} as const;

// Tesseract worker configuration interface
interface TesseractWorkerParameters {
  tessedit_pageseg_mode: string;
  tessedit_ocr_engine_mode: string;
  tesseract_char_whitelist: string;
  preserve_interword_spaces: string;
  user_defined_dpi: string;
}

interface PreprocessingOptions {
  resize?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  grayscale?: boolean;
  binarize?: boolean;
  denoise?: boolean;
  sharpen?: boolean;
}

class OCRService {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;

  /**
   * Lazy load and initialize the OCR worker with optimized settings
   */
  private async initializeWorker(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      // Lazy load Tesseract.js only when needed
      this.worker = await createWorker('eng');
      
      // Configure Tesseract for optimal book cover text recognition
      const tesseractParams: TesseractWorkerParameters = {
        tessedit_pageseg_mode: '6', // Uniform block of text
        tessedit_ocr_engine_mode: '1', // Neural network LSTM
        tesseract_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:-()&',
        preserve_interword_spaces: '1',
        user_defined_dpi: '300', // High DPI for better text recognition
      };
      
      // Type assertion for Tesseract worker setParameters method
      await this.worker.setParameters(tesseractParams as any);
      
      this.isInitialized = true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('OCR worker initialization failed:', error);
      throw new Error('Failed to initialize OCR engine. Please try again.');
    }
  }

  /**
   * Preprocess image to improve OCR accuracy
   */
  private async preprocessImage(file: File, options: PreprocessingOptions = {}): Promise<File> {
    const {
      resize = true,
      maxWidth = 1200,
      maxHeight = 1600,
      grayscale = true,
      binarize = false,
      denoise = true,
      sharpen = true
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        const objectUrl = img.src;
        try {
          let { width, height } = img;

          // Resize if needed while maintaining aspect ratio
          if (resize && (width > maxWidth || height > maxHeight)) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          // Draw original image
          ctx.drawImage(img, 0, 0, width, height);

          // Get image data for processing
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          // Apply preprocessing filters using optimized algorithm
          this.applyImageFilters(data, { grayscale, denoise, sharpen, binarize });

          // Put processed image data back to canvas
          ctx.putImageData(imageData, 0, 0);

          // Convert canvas to blob and then to File
          canvas.toBlob((blob) => {
            // Clean up object URL
            URL.revokeObjectURL(objectUrl);
            
            if (blob) {
              const processedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(processedFile);
            } else {
              reject(new Error('Failed to process image'));
            }
          }, file.type, 0.9);

        } catch (error) {
          // Clean up object URL on error
          URL.revokeObjectURL(objectUrl);
          reject(new Error(`Image preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      img.onerror = () => {
        // Clean up object URL on error
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image for preprocessing'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Optimized image filtering using efficient algorithms
   */
  private applyImageFilters(data: Uint8ClampedArray, options: {
    grayscale?: boolean;
    denoise?: boolean;
    sharpen?: boolean;
    binarize?: boolean;
  }): void {
    const { grayscale, denoise, sharpen, binarize } = options;
    const length = data.length;

    // Process image data in chunks for better performance
    const chunkSize = 1024; // Process 256 pixels at a time
    
    for (let start = 0; start < length; start += chunkSize) {
      const end = Math.min(start + chunkSize, length);
      
      for (let i = start; i < end; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Convert to grayscale using luminance formula
        if (grayscale) {
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          r = g = b = gray;
        }

        // Simple denoising by reducing noise in dark areas
        if (denoise) {
          const avg = (r + g + b) / 3;
          if (avg < 50) {
            const factor = 0.8;
            r = Math.round(r * factor);
            g = Math.round(g * factor);
            b = Math.round(b * factor);
          }
        }

        // Increase contrast for better text recognition
        if (sharpen) {
          const factor = 1.2;
          const offset = -20;
          r = Math.max(0, Math.min(255, r * factor + offset));
          g = Math.max(0, Math.min(255, g * factor + offset));
          b = Math.max(0, Math.min(255, b * factor + offset));
        }

        // Apply binarization (black and white) if requested
        if (binarize) {
          const threshold = 128;
          const gray = (r + g + b) / 3;
          r = g = b = gray > threshold ? 255 : 0;
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
    }
  }

  /**
   * Extract text from an image file using OCR with preprocessing
   */
  async extractText(file: File, enablePreprocessing: boolean = true): Promise<OCRResult> {
    await this.initializeWorker();

    if (!this.worker) {
      throw new Error('OCR engine not available');
    }

    try {
      let processedFile = file;
      
      // Apply preprocessing if enabled
      if (enablePreprocessing) {
        try {
          processedFile = await this.preprocessImage(file);
        } catch (preprocessError) {
          // eslint-disable-next-line no-console
          console.warn('Image preprocessing failed, using original image:', preprocessError);
          // Continue with original file if preprocessing fails
        }
      }

      
      const { data: { text, confidence } } = await this.worker.recognize(processedFile);
      
      return { text: text.trim(), confidence };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('OCR recognition failed:', error);
      throw new Error('Failed to extract text from image. Please ensure the image is clear and contains readable text.');
    }
  }

  /**
   * Parse OCR text to extract book details
   */
  extractBookDetails(text: string): BookDetails {
    const details: BookDetails = {};
    
    // Split text into lines and clean them
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 2);

    // Extract potential ISBN
    const isbnRegex = /(?:ISBN[-\s]?(?:13|10)?[-\s]?:?[-\s]?)?((?:97[89][-\s]?)?(?:\d[-\s]?){9}[\dx])/gi;
    const isbnMatch = text.match(isbnRegex);
    if (isbnMatch) {
      details.isbn = isbnMatch[0].replace(/[^\dX]/gi, '');
    }

    // Extract potential title (usually one of the first meaningful lines, exclude ISBN lines and "by" lines)
    const potentialTitle = lines.find(line => 
      line.length >= 3 && // Allow shorter titles like "1984"
      line.length < 100 && 
      !line.toLowerCase().includes('isbn') &&
      !/^by\s+/i.test(line) &&
      !line.match(/^\d{10,}$/) // Only exclude very long number strings (like ISBNs), not titles like "1984"
    );
    if (potentialTitle) {
      details.title = potentialTitle;
    }

    // Extract potential author (lines that start with "by" or match name patterns, but not the title)
    const potentialAuthor = lines.find(line => {
      const lowerLine = line.toLowerCase();
      const hasByPrefix = lowerLine.startsWith('by ');
      const isNamePattern = /^[A-Z][a-z]+ [A-Z][a-z]+/.test(line);
      const isNotTitle = line !== potentialTitle;
      const isNotTooLong = line.length < 50;
      const hasNoISBN = !lowerLine.includes('isbn');
      
      return isNotTitle && hasNoISBN && isNotTooLong && (hasByPrefix || isNamePattern);
    });
    
    if (potentialAuthor) {
      details.author = potentialAuthor.replace(/^by\s+/i, '').trim();
    }

    // Extract potential description (longer text blocks that are not title or author)
    const potentialDescription = lines.find(line => 
      line.length > 50 && 
      !line.toLowerCase().includes('isbn') &&
      line !== details.title &&
      line !== details.author &&
      !details.author?.includes(line) &&
      !line.match(/^by\s+/i)
    );
    if (potentialDescription) {
      details.description = potentialDescription;
    }

    return details;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// Export a singleton instance
export const ocrService = new OCRService();