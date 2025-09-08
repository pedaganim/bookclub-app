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

class OCRService {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;

  /**
   * Lazy load and initialize the OCR worker
   */
  private async initializeWorker(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      // Lazy load Tesseract.js only when needed
      this.worker = await createWorker('eng');
      this.isInitialized = true;
    } catch (error) {
      throw new Error('Failed to initialize OCR engine. Please try again.');
    }
  }

  /**
   * Extract text from an image file using OCR
   */
  async extractText(file: File): Promise<OCRResult> {
    await this.initializeWorker();

    if (!this.worker) {
      throw new Error('OCR engine not available');
    }

    try {
      const { data: { text, confidence } } = await this.worker.recognize(file);
      return { text, confidence };
    } catch (error) {
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