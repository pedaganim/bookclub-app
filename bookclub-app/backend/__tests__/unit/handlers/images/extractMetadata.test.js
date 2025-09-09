const handler = require('../../../../src/handlers/images/extractMetadata').handler;

// Mock dependencies
jest.mock('../../../../src/lib/textract-service');
const mockTextractService = require('../../../../src/lib/textract-service');

describe('Extract Image Metadata Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should extract metadata from image successfully', async () => {
    const mockExtractionResult = {
      extractedText: {
        fullText: 'Clean Code by Robert Martin ISBN: 9780132350884',
        blocks: 4
      },
      bookMetadata: {
        title: 'Clean Code',
        author: 'Robert Martin',
        isbn: '9780132350884',
        publisher: 'Prentice Hall',
        publishedDate: '2008',
        description: 'Clean Code by Robert Martin ISBN: 9780132350884',
        extractionSource: 'textract'
      },
      confidence: 92
    };

    mockTextractService.extractTextFromImage.mockResolvedValue(mockExtractionResult);

    const event = mockEvent({
      s3Bucket: 'test-bucket',
      s3Key: 'book-covers/test-user-123/test-image.jpg'
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    
    const responseBody = JSON.parse(result.body);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.metadata.title).toBe('Clean Code');
    expect(responseBody.data.metadata.author).toBe('Robert Martin');
    expect(responseBody.data.metadata.isbn).toBe('9780132350884');
    expect(responseBody.data.confidence).toBe(92);
    expect(responseBody.data.summary.hasTitle).toBe(true);
    expect(responseBody.data.summary.hasAuthor).toBe(true);
    expect(responseBody.data.summary.hasISBN).toBe(true);

    expect(mockTextractService.extractTextFromImage).toHaveBeenCalledWith(
      'test-bucket',
      'book-covers/test-user-123/test-image.jpg'
    );
  });

  it('should require authentication', async () => {
    const event = {
      requestContext: {
        authorizer: {
          claims: {} // No sub claim
        }
      },
      body: JSON.stringify({
        s3Bucket: 'test-bucket',
        s3Key: 'test-key'
      })
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error.message).toBe('Missing or invalid authentication');
  });

  it('should validate required fields', async () => {
    const event = mockEvent({
      s3Bucket: 'test-bucket'
      // Missing s3Key
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error.errors.s3Key).toBe('S3 key is required');
  });

  it('should handle Textract extraction failure', async () => {
    mockTextractService.extractTextFromImage.mockResolvedValue(null);

    const event = mockEvent({
      s3Bucket: 'test-bucket',
      s3Key: 'test-key'
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error.message).toBe('Failed to extract text from image. Please try again or upload a different image.');
  });

  it('should handle Textract service errors', async () => {
    mockTextractService.extractTextFromImage.mockRejectedValue(new Error('Textract service error'));

    const event = mockEvent({
      s3Bucket: 'test-bucket',
      s3Key: 'test-key'
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error.message).toBe('Textract service error');
  });

  it('should return correct summary for partial metadata', async () => {
    const mockExtractionResult = {
      extractedText: {
        fullText: 'Some book text without clear metadata',
        blocks: 2
      },
      bookMetadata: {
        title: 'Some Book',
        author: null, // No author found
        isbn: null,   // No ISBN found
        publisher: null,
        publishedDate: null,
        description: 'Some book text without clear metadata',
        extractionSource: 'textract'
      },
      confidence: 75
    };

    mockTextractService.extractTextFromImage.mockResolvedValue(mockExtractionResult);

    const event = mockEvent({
      s3Bucket: 'test-bucket',
      s3Key: 'test-key'
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    
    const responseBody = JSON.parse(result.body);
    expect(responseBody.data.summary.hasTitle).toBe(true);
    expect(responseBody.data.summary.hasAuthor).toBe(false);
    expect(responseBody.data.summary.hasISBN).toBe(false);
    expect(responseBody.data.summary.hasPublisher).toBe(false);
    expect(responseBody.data.summary.hasPublishedDate).toBe(false);
  });
});