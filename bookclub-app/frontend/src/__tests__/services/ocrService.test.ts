import { ocrService } from '../../services/ocrService';

// Mock Tesseract.js
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn()
}));

const mockCreateWorker = jest.mocked(require('tesseract.js').createWorker);

describe('OCRService', () => {
  let mockWorker: any;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockWorker = {
      recognize: jest.fn(),
      terminate: jest.fn(),
      setParameters: jest.fn()
    };
    mockCreateWorker.mockResolvedValue(mockWorker);
    jest.clearAllMocks();
    // Mock canvas getContext to avoid jsdom warnings and allow preprocessing paths
    Object.defineProperty(HTMLCanvasElement.prototype as any, 'getContext', {
      value: jest.fn().mockReturnValue({
        drawImage: jest.fn(),
        getImageData: jest.fn().mockReturnValue({ data: new Uint8ClampedArray(0), width: 0, height: 0 }),
        putImageData: jest.fn(),
      }),
      configurable: true,
      writable: true,
    });
    // Silence console.warn messages about preprocessing in test env
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await ocrService.cleanup();
    if (warnSpy) warnSpy.mockRestore();
  });

  describe('extractText', () => {
    test('successfully extracts text from image', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockOcrResult = {
        data: {
          text: 'Test Book Title\nBy John Doe\nISBN: 9781234567890',
          confidence: 85
        }
      };

      mockWorker.recognize.mockResolvedValue(mockOcrResult);

      const result = await ocrService.extractText(mockFile);

      expect(result.text).toBe('Test Book Title\nBy John Doe\nISBN: 9781234567890');
      expect(result.confidence).toBe(85);
      expect(mockCreateWorker).toHaveBeenCalledWith('eng');
      expect(mockWorker.recognize).toHaveBeenCalledWith(mockFile);
    });

    test('handles OCR failure gracefully', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockWorker.recognize.mockRejectedValue(new Error('OCR failed'));

      await expect(ocrService.extractText(mockFile)).rejects.toThrow(
        'Failed to extract text from image. Please ensure the image is clear and contains readable text.'
      );
    });

    test('handles worker initialization failure', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockCreateWorker.mockRejectedValue(new Error('Worker init failed'));

      await expect(ocrService.extractText(mockFile)).rejects.toThrow(
        'Failed to initialize OCR engine. Please try again.'
      );
    });
  });

  describe('extractBookDetails', () => {
    test('extracts book details from OCR text with ISBN', () => {
      const ocrText = `
        The Great Gatsby
        By F. Scott Fitzgerald
        ISBN: 9780743273565
        A classic American novel about the Jazz Age
      `;

      const details = ocrService.extractBookDetails(ocrText);

      expect(details.title).toBe('The Great Gatsby');
      expect(details.author).toBe('F. Scott Fitzgerald');
      expect(details.isbn).toBe('9780743273565');
    });

    test('extracts details without ISBN', () => {
      const ocrText = `
        To Kill a Mockingbird
        Harper Lee
        A gripping tale of racial injustice and childhood innocence
      `;

      const details = ocrService.extractBookDetails(ocrText);

      expect(details.title).toBe('To Kill a Mockingbird');
      expect(details.author).toBe('Harper Lee');
      expect(details.description).toBe('A gripping tale of racial injustice and childhood innocence');
    });

    test('handles author with "by" prefix', () => {
      const ocrText = `1984
by George Orwell`;

      const details = ocrService.extractBookDetails(ocrText);

      expect(details.title).toBe('1984');
      expect(details.author).toBe('George Orwell');
    });

    test('returns empty object for unclear text', () => {
      const ocrText = 'a\nb\nc';

      const details = ocrService.extractBookDetails(ocrText);

      expect(Object.keys(details)).toHaveLength(0);
    });
  });

  describe('cleanup', () => {
    test('terminates worker properly', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Initialize worker by calling extractText
      mockWorker.recognize.mockResolvedValue({
        data: { text: 'test', confidence: 50 }
      });
      
      await ocrService.extractText(mockFile);
      await ocrService.cleanup();

      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    test('handles cleanup without initialized worker', async () => {
      // Should not throw error
      await expect(ocrService.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('preprocessImage', () => {
    test('gracefully handles preprocessing failure in test environment', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockWorker.recognize.mockResolvedValue({
        data: { text: 'Test text', confidence: 75 }
      });

      // In test environment, preprocessing will fail due to canvas limitations
      // but extractText should still work with original image
      const result = await ocrService.extractText(mockFile, true);

      expect(result.text).toBe('Test text');
      expect(result.confidence).toBe(75);
      expect(mockWorker.recognize).toHaveBeenCalledWith(mockFile);
    });

    test('can disable preprocessing', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockWorker.recognize.mockResolvedValue({
        data: { text: 'Test text', confidence: 80 }
      });

      const result = await ocrService.extractText(mockFile, false);

      expect(result.text).toBe('Test text');
      expect(result.confidence).toBe(80);
      expect(mockWorker.recognize).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('enhanced error handling', () => {
    test('provides detailed error logging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockError = new Error('Detailed OCR error');
      mockWorker.recognize.mockRejectedValue(mockError);

      await expect(ocrService.extractText(mockFile)).rejects.toThrow(
        'Failed to extract text from image. Please ensure the image is clear and contains readable text.'
      );

      expect(consoleSpy).toHaveBeenCalledWith('OCR recognition failed:', mockError);
      consoleSpy.mockRestore();
    });
  });
});