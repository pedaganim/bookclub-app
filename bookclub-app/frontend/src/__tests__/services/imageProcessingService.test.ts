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
    
    // Mock document.createElement for canvas elements
    const originalCreateElement = document.createElement;
    document.createElement = jest.fn((tagName: string) => {
      if (tagName === 'canvas') return mockCanvas as any;
      return originalCreateElement.call(document, tagName);
    }) as any;

    // Mock Image constructor
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const OriginalImage = global.Image;
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      width = 100;
      height = 100;
      
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    } as any;

    // Mock URL methods
    const originalURL = global.URL;
    global.URL = {
      ...originalURL,
      createObjectURL: jest.fn(() => 'blob:fake-url'),
      revokeObjectURL: jest.fn(),
    } as any;
  });

  afterEach(() => {
    imageProcessingService.cleanup([]);
    jest.restoreAllMocks();
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

  it('should accept non-book content (temporarily)', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    
    ocrService.extractText.mockResolvedValue({
      text: 'Grocery shopping list: milk, eggs, bread, apples, bananas',
      confidence: 80, // High confidence (>70) should have no message
    });

    const results = await imageProcessingService.processImages([mockFile]);

    expect(results).toHaveLength(1);
    // TEMPORARY: Should accept non-book content to unblock users
    expect(results[0].isValid).toBe(true);
    expect(results[0].isBook).toBe(true);
    expect(results[0].validationMessage).toBeUndefined(); // No warning for high confidence
  });

  it('should handle low confidence OCR results (temporarily accepting)', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    
    ocrService.extractText.mockResolvedValue({
      text: 'Book Title',
      confidence: 20, // Below minBookConfidence of 30
    });

    const results = await imageProcessingService.processImages([mockFile]);

    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(true); // Allow but warn
    expect(results[0].isBook).toBe(true); // TEMPORARY: accepting as book
    expect(results[0].validationMessage).toContain('Accepted with 20% text confidence');
  });

  it('should handle OCR failures gracefully (temporarily accepting)', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    
    ocrService.extractText.mockRejectedValue(new Error('OCR failed'));

    const results = await imageProcessingService.processImages([mockFile]);

    expect(results).toHaveLength(1);
    expect(results[0].isValid).toBe(true); // Allow but warn
    expect(results[0].isBook).toBe(true); // TEMPORARY: accepting even when OCR fails
    expect(results[0].validationMessage).toContain('Could not analyze image content, but accepting for upload');
  });

  it('should reject when processing too many images', async () => {
    const mockFiles = Array.from({ length: 26 }, (_, i) => 
      new File(['fake-image-data'], `test${i}.jpg`, { type: 'image/jpeg' })
    );

    await expect(imageProcessingService.processImages(mockFiles)).rejects.toThrow('Maximum 25 images allowed');
  });

  it('should detect ISBN patterns', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    
    ocrService.extractText.mockResolvedValue({
      text: 'ISBN 978-1234567890',
      confidence: 70,
    });

    const results = await imageProcessingService.processImages([mockFile]);
    
    expect(results[0].isBook).toBe(true);
    expect(results[0].isValid).toBe(true);
  });

  it('should detect author keywords', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    
    ocrService.extractText.mockResolvedValue({
      text: 'By Author: John Doe',
      confidence: 70,
    });

    const results = await imageProcessingService.processImages([mockFile]);
    
    expect(results[0].isBook).toBe(true);
    expect(results[0].isValid).toBe(true);
  });

  it('should detect chapter keywords', async () => {
    const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    
    ocrService.extractText.mockResolvedValue({
      text: 'Chapter 1: Introduction',
      confidence: 70,
    });

    const results = await imageProcessingService.processImages([mockFile]);
    
    expect(results[0].isBook).toBe(true);
    expect(results[0].isValid).toBe(true);
  });
});