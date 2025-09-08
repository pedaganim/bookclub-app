const ocrService = require('../../../src/lib/ocr-service');

describe('OCR Service', () => {
  describe('parseBookDataFromText', () => {
    test('should extract ISBN, title, and author from clean text', () => {
      const text = `Clean Code
A Handbook of Agile Software Craftsmanship
Robert C. Martin
ISBN: 978-0-13-235088-4
Prentice Hall
2008`;

      const result = ocrService.parseBookDataFromText(text);
      
      expect(result.isbn).toBe('9780132350884');
      expect(result.title).toBe('Clean Code'); // Should pick the first line
      expect(result.author).toBe('Robert C. Martin');
      expect(result.confidence).toBe('high');
    });

    test('should handle noisy OCR text with artifacts', () => {
      const text = `C1ean C0de
A Handbook of Agile S0ftware Craftsmanshlp
By R0bert C. Mart|n
ISBN: 9780132350884`; // Clean ISBN format for testing

      const result = ocrService.parseBookDataFromText(text);
      
      expect(result.isbn).toBe('9780132350884');
      expect(result.title).toBe('C1ean C0de'); // The raw text isn't cleaned at extraction
      expect(result.author).toContain('R0bert'); // Raw OCR text
    });

    test('should extract ISBN from various formats', () => {
      const testCases = [
        'ISBN: 978-0-13-235088-4',
        'ISBN-13: 978 0 13 235088 4',
        'ISBN10: 0132350882',
        '978-0132350884',
        '0-13-235088-2'
      ];

      testCases.forEach(text => {
        const result = ocrService.parseBookDataFromText(text);
        expect(result.isbn).toBeTruthy();
        expect(result.isbn.length).toBeGreaterThanOrEqual(10);
      });
    });

    test('should handle text with author patterns', () => {
      const testCases = [
        'by Robert Martin',
        'Author: Jane Doe',
        'Written by John Smith',
        'Mary Johnson, author'
      ];

      testCases.forEach(text => {
        const result = ocrService.parseBookDataFromText(text);
        expect(result.author).toBeTruthy();
      });
    });

    test('should assign confidence levels correctly', () => {
      // High confidence: has ISBN + title + author
      const highConfidenceText = `The Great Book
By Famous Author
ISBN: 9781234567890`;
      
      const highResult = ocrService.parseBookDataFromText(highConfidenceText);
      expect(highResult.confidence).toBe('high');

      // Medium confidence: has some fields but not ISBN
      const mediumConfidenceText = `Some Book Title
Famous Author Name`;
      
      const mediumResult = ocrService.parseBookDataFromText(mediumConfidenceText);
      expect(mediumResult.confidence).toBe('medium');

      // Low confidence: minimal information
      const lowConfidenceText = `abc`;
      
      const lowResult = ocrService.parseBookDataFromText(lowConfidenceText);
      expect(lowResult.confidence).toBe('low');
    });
  });

  describe('extractISBN', () => {
    test('should extract ISBN-13', () => {
      const text = 'ISBN: 978-0-13-235088-4';
      const isbn = ocrService.extractISBN(text);
      expect(isbn).toBe('9780132350884');
    });

    test('should extract ISBN-10', () => {
      const text = 'ISBN: 0-13-235088-2';
      const isbn = ocrService.extractISBN(text);
      expect(isbn).toBe('0132350882');
    });

    test('should handle malformed ISBN', () => {
      const text = 'ISBN: 123-45';
      const isbn = ocrService.extractISBN(text);
      expect(isbn).toBeNull();
    });
  });

  describe('cleanText', () => {
    test('should clean OCR artifacts', () => {
      const dirtyText = 'C1ean  C0de:  A  Handbook';
      const cleaned = ocrService.cleanText(dirtyText);
      expect(cleaned).toBe('C1ean C0de A Handbook');
    });

    test('should handle empty or null text', () => {
      expect(ocrService.cleanText('')).toBe('');
      expect(ocrService.cleanText(null)).toBeNull();
      expect(ocrService.cleanText(undefined)).toBeUndefined();
    });
  });

  describe('extractTextFromImage', () => {
    test('should return mock data in test environment', async () => {
      // In test environment, should return mock data
      const result = await ocrService.extractTextFromImage('test-bucket', 'test-key');
      
      expect(result).toHaveProperty('isbn');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('author');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('rawText');
    });
  });

  describe('isExternalAccessAvailable', () => {
    test('should detect test environment', () => {
      // Should return false in test environment
      expect(ocrService.isExternalAccessAvailable()).toBe(false);
    });
  });

  describe('looksLikeName and looksLikeMetadata', () => {
    test('should identify name patterns', () => {
      expect(ocrService.looksLikeName('John Doe')).toBe(true);
      expect(ocrService.looksLikeName('John Smith')).toBe(true);
      expect(ocrService.looksLikeName('Robert C. Martin')).toBe(true);
      expect(ocrService.looksLikeName('Chapter 1')).toBe(false); // Contains a number
      expect(ocrService.looksLikeName('Page 45')).toBe(false); // Contains a number
    });

    test('should identify metadata patterns', () => {
      expect(ocrService.looksLikeMetadata('ISBN: 123456789')).toBe(true);
      expect(ocrService.looksLikeMetadata('Page 45')).toBe(true);
      expect(ocrService.looksLikeMetadata('Copyright 2023')).toBe(true);
      expect(ocrService.looksLikeMetadata('The Great Adventure')).toBe(false);
    });
  });
});