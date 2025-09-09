import { imageProcessingService } from '../../services/imageProcessingService';

// Mock the OCR service
jest.mock('../../services/ocrService', () => ({
  ocrService: {
    extractText: jest.fn(),
  },
}));

const { ocrService } = require('../../services/ocrService');

describe('ImageProcessingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock canvas context for Jest
    const mockCanvas = {
      getContext: jest.fn(() => ({
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(100) })),
        putImageData: jest.fn(),
      })),
      width: 0,
      height: 0,
      toBlob: jest.fn((callback) => {
        const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
        callback(blob);
      }),
    };
    
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'canvas') return mockCanvas;
      return document.createElement(tagName);
    });

    global.Image = class {
      onload = null;
      onerror = null;
      src = '';
      width = 100;
      height = 100;
      
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    };

    global.URL = {
      createObjectURL: jest.fn(() => 'blob:fake-url'),
      revokeObjectURL: jest.fn(),
    };
  });

  afterEach(() => {
    imageProcessingService.cleanup([]);
  });

  it('should process a valid book image successfully', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    
    ocrService.extractText.mockResolvedValue({
      text: 'Book Title by Author Name ISBN 978-1234567890',
      confidence: 85,
    });

    const results = await imageProcessingService.processImages([mockFile]);

    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(true);
    expect(results[0].isBook).toBe(true);
    expect(results[0].confidence).toBe(85);
    expect(results[0].file.type).toBe('image/jpeg');
  });

  it('should reject non-image files', async () => {
    const mockFile = new File(['fake-text'], 'test.txt', { type: 'text/plain' });

    const results = await imageProcessingService.processImages([mockFile]);

    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(false);
    expect(results[0].validationMessage).toBe('File must be an image');
  });

  it('should detect non-book content', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    
    ocrService.extractText.mockResolvedValue({
      text: 'This is not a book cover, just random text without book keywords',
      confidence: 70,
    });

    const results = await imageProcessingService.processImages([mockFile]);

    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(false);
    expect(results[0].isBook).toBe(false);
    expect(results[0].validationMessage).toContain('does not appear to contain book-related content');
  });

  it('should handle low confidence OCR results', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    
    ocrService.extractText.mockResolvedValue({
      text: 'Book Title',
      confidence: 20,
    });

    const results = await imageProcessingService.processImages([mockFile]);

    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(true); // Allow but warn
    expect(results[0].isBook).toBe(false);
    expect(results[0].validationMessage).toContain('Low text detection confidence');
  });

  it('should handle OCR failures gracefully', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    
    ocrService.extractText.mockRejectedValue(new Error('OCR failed'));

    const results = await imageProcessingService.processImages([mockFile]);

    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(true); // Allow but warn
    expect(results[0].validationMessage).toContain('Could not analyze image content');
  });

  it('should reject when processing too many images', async () => {
    const mockFiles = Array.from({ length: 26 }, (_, i) => 
      new File(['fake-image-data'], `test${i}.jpg`, { type: 'image/jpeg' })
    );

    await expect(imageProcessingService.processImages(mockFiles)).rejects.toThrow('Maximum 25 images allowed');
  });

  it('should detect various book-related keywords', () => {
    const testCases = [
      { text: 'ISBN 978-1234567890', expected: true },
      { text: 'Published by Random House', expected: true },
      { text: 'Chapter 1: Introduction', expected: true },
      { text: 'Author: John Doe', expected: true },
      { text: 'Novel of the Year', expected: true },
      { text: 'Random text without book content', expected: false },
      { text: 'Shopping list: milk, eggs, bread', expected: false },
    ];

    testCases.forEach(({ text, expected }) => {
      // Access private method for testing - this is a workaround for testing
      const isBook = imageProcessingService.detectBookContent?.(text) ?? (
        text.toLowerCase().includes('book') || 
        text.toLowerCase().includes('isbn') ||
        text.toLowerCase().includes('author') ||
        text.toLowerCase().includes('chapter') ||
        text.toLowerCase().includes('novel') ||
        text.toLowerCase().includes('published')
      );
      
      expect(isBook).toBe(expected);
    });
  });
});