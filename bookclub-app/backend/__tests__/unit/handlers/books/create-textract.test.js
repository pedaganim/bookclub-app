const handler = require('../../../../src/handlers/books/create').handler;

// Mock dependencies
jest.mock('../../../../src/models/book');
jest.mock('../../../../src/lib/book-metadata');
jest.mock('../../../../src/lib/textract-service');

const mockBook = require('../../../../src/models/book');
const mockBookMetadataService = require('../../../../src/lib/book-metadata');
const mockTextractService = require('../../../../src/lib/textract-service');

describe('Create Book Handler with Textract Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockEvent = (body, userId = 'test-user-123') => ({
    requestContext: {
      authorizer: {
        claims: {
          sub: userId
        }
      }
    },
    body: JSON.stringify(body)
  });

  it('should create book with Textract metadata extraction', async () => {
    const mockTextractResult = {
      extractedText: {
        fullText: 'Clean Code: A Handbook of Agile Software Craftsmanship by Robert C. Martin ISBN: 9780132350884 Prentice Hall 2008'
      },
      bookMetadata: {
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        author: 'Robert C. Martin',
        isbn: '9780132350884',
        publisher: 'Prentice Hall',
        publishedDate: '2008',
        description: 'Clean Code: A Handbook of Agile Software Craftsmanship by Robert C. Martin ISBN: 9780132350884 Prentice Hall 2008',
        extractionSource: 'textract'
      },
      confidence: 95
    };

    const mockCreatedBook = {
      id: 'book-123',
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      author: 'Robert C. Martin',
      description: 'Clean Code: A Handbook of Agile Software Craftsmanship by Robert C. Martin ISBN: 9780132350884 Prentice Hall 2008'
    };

    mockTextractService.extractTextFromImage.mockResolvedValue(mockTextractResult);
    mockBook.create.mockResolvedValue(mockCreatedBook);

    const event = mockEvent({
      extractFromImage: true,
      s3Bucket: 'test-bucket',
      s3Key: 'book-covers/test-user/image.jpg'
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    
    const responseBody = JSON.parse(result.body);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.title).toBe('Clean Code: A Handbook of Agile Software Craftsmanship');
    expect(responseBody.data.author).toBe('Robert C. Martin');

    expect(mockTextractService.extractTextFromImage).toHaveBeenCalledWith('test-bucket', 'book-covers/test-user/image.jpg');
    expect(mockBook.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        author: 'Robert C. Martin',
        description: expect.stringContaining('Clean Code'),
        textractExtractedText: expect.any(String),
        textractConfidence: 95,
        textractSource: 'textract'
      }),
      'test-user-123'
    );
  });

  it('should create book with manual input when provided along with Textract', async () => {
    const mockTextractResult = {
      extractedText: {
        fullText: 'Some extracted text'
      },
      bookMetadata: {
        title: 'Extracted Title',
        author: 'Extracted Author',
        description: 'Some extracted text',
        extractionSource: 'textract'
      },
      confidence: 85
    };

    const mockCreatedBook = {
      id: 'book-123',
      title: 'Manual Title',
      author: 'Manual Author'
    };

    mockTextractService.extractTextFromImage.mockResolvedValue(mockTextractResult);
    mockBook.create.mockResolvedValue(mockCreatedBook);

    const event = mockEvent({
      title: 'Manual Title',        // User provided
      author: 'Manual Author',      // User provided
      extractFromImage: true,
      s3Bucket: 'test-bucket',
      s3Key: 'test-key'
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    
    // Should prioritize user input over Textract
    expect(mockBook.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Manual Title',      // User input preserved
        author: 'Manual Author',    // User input preserved
        textractExtractedText: 'Some extracted text'
      }),
      'test-user-123'
    );
  });

  it('should fail gracefully when Textract extraction fails', async () => {
    mockTextractService.extractTextFromImage.mockResolvedValue(null);

    const event = mockEvent({
      extractFromImage: true,
      s3Bucket: 'test-bucket',
      s3Key: 'test-key'
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error.errors.extraction).toContain('Could not extract required fields');
  });

  it('should handle Textract extraction partial success', async () => {
    const mockTextractResult = {
      extractedText: {
        fullText: 'Some Book Title - partial extraction'
      },
      bookMetadata: {
        title: 'Some Book Title',
        author: null, // No author extracted
        description: 'Some Book Title - partial extraction',
        extractionSource: 'textract'
      },
      confidence: 70
    };

    mockTextractService.extractTextFromImage.mockResolvedValue(mockTextractResult);

    const event = mockEvent({
      author: 'Manually Provided Author', // Provide missing field manually
      extractFromImage: true,
      s3Bucket: 'test-bucket',
      s3Key: 'test-key'
    });

    const mockCreatedBook = { id: 'book-123', title: 'Some Book Title', author: 'Manually Provided Author' };
    mockBook.create.mockResolvedValue(mockCreatedBook);

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    
    expect(mockBook.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Some Book Title',                    // From Textract
        author: 'Manually Provided Author',         // User provided
        textractExtractedText: expect.any(String),
        textractConfidence: 70
      }),
      'test-user-123'
    );
  });

  it('should work with traditional metadata enrichment when not using Textract', async () => {
    const mockMetadata = {
      title: 'Enhanced Title',
      description: 'Enhanced description',
      isbn10: '0123456789',
      source: 'google_books'
    };

    mockBookMetadataService.searchBookMetadata.mockResolvedValue(mockMetadata);
    mockBook.create.mockResolvedValue({ id: 'book-123', title: 'Test Book' });

    const event = mockEvent({
      title: 'Test Book',
      author: 'Test Author',
      enrichWithMetadata: true
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    expect(mockBookMetadataService.searchBookMetadata).toHaveBeenCalled();
    expect(mockTextractService.extractTextFromImage).not.toHaveBeenCalled();
  });

  it('should require title and author when not extracting from image', async () => {
    const event = mockEvent({
      // Missing title and author, and not extracting from image
      description: 'Some description'
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error.errors.title).toBe('Title is required');
    expect(responseBody.error.errors.author).toBe('Author is required');
  });

  it('should continue with book creation when Textract throws an error', async () => {
    mockTextractService.extractTextFromImage.mockRejectedValue(new Error('Textract error'));
    
    const mockCreatedBook = { id: 'book-123', title: 'Manual Title', author: 'Manual Author' };
    mockBook.create.mockResolvedValue(mockCreatedBook);

    const event = mockEvent({
      title: 'Manual Title',
      author: 'Manual Author',
      extractFromImage: true,
      s3Bucket: 'test-bucket',
      s3Key: 'test-key'
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    
    // Should still create the book with manual data
    expect(mockBook.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Manual Title',
        author: 'Manual Author'
      }),
      'test-user-123'
    );
  });
});