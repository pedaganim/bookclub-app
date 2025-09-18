const { handler } = require('../../../../src/handlers/images/extractBookMetadata');
const Book = require('../../../../src/models/book');
const textractService = require('../../../../src/lib/textract-service');
const bookMetadataService = require('../../../../src/lib/book-metadata');
const imagePreprocessingService = require('../../../../src/lib/image-preprocessing');
const barcodeDetectionService = require('../../../../src/lib/barcode-detection');
const visionLLMService = require('../../../../src/lib/vision-llm');
const { publishEvent } = require('../../../../src/lib/event-bus');

// Mock the dependencies
jest.mock('../../../../src/models/book');
jest.mock('../../../../src/lib/textract-service');
jest.mock('../../../../src/lib/book-metadata');
jest.mock('../../../../src/lib/image-preprocessing');
jest.mock('../../../../src/lib/barcode-detection');
jest.mock('../../../../src/lib/vision-llm');
jest.mock('../../../../src/lib/event-bus');

describe('extractBookMetadata handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Book model
    Book.update = jest.fn().mockResolvedValue({
      bookId: 'test-book-id',
      title: 'Extracted Book Title',
      author: 'Extracted Author',
      userId: 'user123'
    });

    // Mock image preprocessing service
    imagePreprocessingService.preprocessImage = jest.fn().mockResolvedValue({
      success: true,
      processedImages: [],
      ocrVariants: [],
      recommendations: []
    });

    // Mock barcode detection service
    barcodeDetectionService.detectBarcodes = jest.fn().mockResolvedValue({
      success: true,
      barcodes: [{
        format: 'EAN-13',
        data: '9780132350884',
        confidence: 0.95
      }],
      isbns: [{
        isbn13: '9780132350884',
        isbn10: '0132350882',
        confidence: 0.95,
        format: 'EAN-13',
        position: { x: 150, y: 800, width: 200, height: 40 }
      }]
    });

    // Mock vision LLM service
    visionLLMService.analyzeBookCover = jest.fn().mockResolvedValue({
      success: false, // Disabled for this test
      reason: 'vision_llm_not_available',
      metadata: {}
    });

    // Mock textract service
    textractService.extractTextFromImage = jest.fn().mockResolvedValue({
      extractedText: {
        fullText: 'Clean Code: A Handbook of Agile Software Craftsmanship by Robert C. Martin',
        lines: [],
        words: [],
        blocks: [{}, {}]
      },
      bookMetadata: {
        title: 'Clean Code',
        author: 'Robert C. Martin',
        isbn: '9780132350884',
        publisher: 'Prentice Hall',
        publishedDate: '2008',
        description: 'A handbook of agile software craftsmanship',
        extractionSource: 'textract'
      },
      confidence: 92
    });

    // Mock book metadata service
    bookMetadataService.searchBookMetadata = jest.fn().mockResolvedValue({
      source: 'google-books',
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      authors: ['Robert C. Martin'],
      isbn10: '0132350882',
      isbn13: '9780132350884',
      publisher: 'Prentice Hall',
      publishedDate: '2008-08-01'
    });

    // Mock event bus
    publishEvent.mockResolvedValue({});
  });

  it('should process EventBridge event and extract advanced metadata', async () => {
    const event = {
      detail: {
        bucket: 'test-bucket',
        key: 'book-covers/user123/test-image.jpg',
        userId: 'user123',
        bookId: 'test-book-id',
        eventType: 'book-cover-uploaded'
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.bookId).toBe('test-book-id');
    expect(body.confidence).toBeGreaterThan(0);

    // Should extract metadata using multiple techniques
    expect(imagePreprocessingService.preprocessImage).toHaveBeenCalledWith('test-bucket', 'book-covers/user123/test-image.jpg', expect.any(Object));
    expect(barcodeDetectionService.detectBarcodes).toHaveBeenCalledWith('test-bucket', 'book-covers/user123/test-image.jpg', expect.any(Object));
    expect(textractService.extractTextFromImage).toHaveBeenCalledWith('test-bucket', 'book-covers/user123/test-image.jpg');
    expect(visionLLMService.analyzeBookCover).toHaveBeenCalledWith('test-bucket', 'book-covers/user123/test-image.jpg', expect.any(Object));

    // Should lookup catalog metadata using ISBN from barcode
    expect(bookMetadataService.searchBookMetadata).toHaveBeenCalledWith({ isbn: '9780132350884' });

    // Should update book with advanced metadata
    expect(Book.update).toHaveBeenCalledWith(
      'test-book-id',
      'user123',
      expect.objectContaining({
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship', // Enhanced from catalog
        author: 'Robert C. Martin',
        isbn10: '0132350882', // From catalog
        isbn13: '9780132350884',
        publisher: 'Prentice Hall',
        publishedDate: '2008-08-01', // Enhanced from catalog
        metadataSource: 'advanced-extraction-pipeline',
        advancedMetadata: expect.objectContaining({
          metadata: expect.objectContaining({
            title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
            author: 'Robert C. Martin',
            isbn13: '9780132350884',
            isbn10: '0132350882'
          }),
          confidence: expect.objectContaining({
            title: 0.95, // High confidence from catalog
            author: 0.95,
            isbn: 0.95
          }),
          provenance: expect.objectContaining({
            barcode: expect.objectContaining({
              type: 'isbn_barcode',
              confidence: 0.95
            }),
            textract: expect.any(Object),
            catalog: expect.objectContaining({
              source: 'google-books',
              confidence: 0.95
            })
          }),
          overallConfidence: expect.any(Number)
        })
      })
    );

    // Should publish completion event
    expect(publishEvent).toHaveBeenCalledWith('Book.MetadataExtracted', {
      bookId: 'test-book-id',
      userId: 'user123',
      s3Bucket: 'test-bucket',
      s3Key: 'book-covers/user123/test-image.jpg',
      confidence: expect.any(Number),
      hasTitle: true,
      hasAuthor: true,
      hasISBN: true
    });
  });

  it('should handle manual metadata extraction events', async () => {
    const event = {
      detail: {
        bucket: 'test-bucket',
        key: 'book-covers/user123/test-image.jpg',
        userId: 'user123',
        bookId: 'test-book-id',
        eventType: 'manual-metadata-extraction'
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(textractService.extractTextFromImage).toHaveBeenCalled();
    expect(Book.update).toHaveBeenCalled();
  });

  it('should handle missing event detail gracefully', async () => {
    const event = {};

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Invalid event format');
  });

  it('should skip unsupported event types', async () => {
    const event = {
      detail: {
        bucket: 'test-bucket',
        key: 'book-covers/user123/test-image.jpg',
        userId: 'user123',
        bookId: 'test-book-id',
        eventType: 'unsupported-event'
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Event type not handled');
    expect(textractService.extractTextFromImage).not.toHaveBeenCalled();
  });

  it('should handle metadata extraction failures gracefully', async () => {
    textractService.extractTextFromImage.mockRejectedValue(new Error('Textract failed'));

    const event = {
      detail: {
        bucket: 'test-bucket',
        key: 'book-covers/user123/test-image.jpg',
        userId: 'user123',
        bookId: 'test-book-id',
        eventType: 'book-cover-uploaded'
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });
});