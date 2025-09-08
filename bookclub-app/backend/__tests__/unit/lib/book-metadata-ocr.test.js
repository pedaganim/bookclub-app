const bookMetadataService = require('../../../src/lib/book-metadata');

describe('Book Metadata Service - OCR Enhancements', () => {
  describe('preprocessSearchParams', () => {
    test('should clean ISBN from OCR artifacts', () => {
      const params = {
        isbn: 'ISBN: 978-0-13-235088-4',
        title: 'Clean Code',
        author: 'Robert Martin'
      };

      const cleaned = bookMetadataService.preprocessSearchParams(params);
      expect(cleaned.isbn).toBe('9780132350884');
    });

    test('should clean title and author text', () => {
      const params = {
        title: 'C1ean C0de: A Handbook',
        author: 'R0bert C. Mart|n'
      };

      const cleaned = bookMetadataService.preprocessSearchParams(params);
      expect(cleaned.title).not.toContain('1');
      expect(cleaned.title).not.toContain('0');
      expect(cleaned.author).not.toContain('|');
      expect(cleaned.author).not.toContain('0');
    });
  });

  describe('cleanOCRText', () => {
    test('should replace common OCR misreadings', () => {
      const dirtyText = 'C1ean C0de by R0bert Mart|n';
      const cleaned = bookMetadataService.cleanOCRText(dirtyText);
      
      expect(cleaned).toBe('CIean COde by RObert MartIn');
    });

    test('should clean spacing and punctuation', () => {
      const dirtyText = 'Clean  Code:   A   Handbook!!!';
      const cleaned = bookMetadataService.cleanOCRText(dirtyText);
      
      expect(cleaned).toBe('Clean Code A Handbook');
    });

    test('should handle empty text', () => {
      expect(bookMetadataService.cleanOCRText('')).toBe('');
      expect(bookMetadataService.cleanOCRText(null)).toBeNull();
    });
  });

  describe('generateSearchVariations', () => {
    test('should generate title variations', () => {
      const params = {
        title: 'Clean Code A Handbook of Agile Software',
        author: 'Robert C. Martin'
      };

      const variations = bookMetadataService.generateSearchVariations(params);
      
      expect(variations.length).toBeGreaterThan(0);
      expect(variations.some(v => v.title === 'Clean Code')).toBe(true);
    });

    test('should generate author variations', () => {
      const params = {
        title: 'Clean Code',
        author: 'Robert C. Martin'
      };

      const variations = bookMetadataService.generateSearchVariations(params);
      
      expect(variations.some(v => v.author === 'Martin')).toBe(true);
    });

    test('should handle single word titles/authors', () => {
      const params = {
        title: 'Code',
        author: 'Martin'
      };

      const variations = bookMetadataService.generateSearchVariations(params);
      
      // Should still generate some variations
      expect(variations.length).toBeGreaterThan(0);
    });
  });

  describe('generateCacheKey', () => {
    test('should generate consistent cache keys for cleaned parameters', () => {
      const params1 = { isbn: '978-0-13-235088-4' };
      const params2 = { isbn: '9780132350884' };

      const key1 = bookMetadataService.generateCacheKey(params1);
      const key2 = bookMetadataService.generateCacheKey(params2);

      expect(key1).toBe(key2);
    });

    test('should generate cache keys for title/author combinations', () => {
      const params = {
        title: 'Clean Code',
        author: 'Robert Martin'
      };

      const key = bookMetadataService.generateCacheKey(params);
      expect(key).toContain('title:clean code');
      expect(key).toContain('author:robert martin');
    });
  });

  describe('searchBookMetadata with OCR enhancements', () => {
    // Mock the HTTP request to avoid actual API calls in tests
    beforeEach(() => {
      bookMetadataService.makeHttpRequest = jest.fn();
    });

    test('should handle successful metadata search', async () => {
      // Mock successful Google Books API response
      bookMetadataService.makeHttpRequest.mockResolvedValue(JSON.stringify({
        items: [{
          volumeInfo: {
            title: 'Clean Code',
            authors: ['Robert C. Martin'],
            description: 'A handbook of agile software craftsmanship',
            industryIdentifiers: [
              { type: 'ISBN_13', identifier: '9780132350884' }
            ]
          }
        }]
      }));

      const result = await bookMetadataService.searchBookMetadata({
        isbn: '978-0-13-235088-4'
      });

      expect(result).toBeTruthy();
      expect(result.title).toBe('Clean Code');
      expect(result.authors).toContain('Robert C. Martin');
    });

    test('should handle OCR text preprocessing', async () => {
      bookMetadataService.makeHttpRequest.mockResolvedValue(JSON.stringify({
        items: [{
          volumeInfo: {
            title: 'Clean Code',
            authors: ['Robert C. Martin']
          }
        }]
      }));

      // Test with dirty OCR text
      const result = await bookMetadataService.searchBookMetadata({
        title: 'C1ean C0de',
        author: 'R0bert Mart|n'
      });

      expect(result).toBeTruthy();
    });

    test('should return null for failed searches', async () => {
      bookMetadataService.makeHttpRequest.mockRejectedValue(new Error('API Error'));

      const result = await bookMetadataService.searchBookMetadata({
        title: 'Nonexistent Book'
      });

      expect(result).toBeNull();
    });
  });

  describe('integration with caching', () => {
    test('should use preprocessed parameters for cache keys', () => {
      const params1 = { isbn: 'ISBN: 978-0-13-235088-4' };
      const params2 = { isbn: '9780132350884' };

      const key1 = bookMetadataService.generateCacheKey(
        bookMetadataService.preprocessSearchParams(params1)
      );
      const key2 = bookMetadataService.generateCacheKey(
        bookMetadataService.preprocessSearchParams(params2)
      );

      expect(key1).toBe(key2);
    });
  });
});