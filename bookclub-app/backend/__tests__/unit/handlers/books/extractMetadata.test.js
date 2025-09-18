const { handler } = require('../../../../src/handlers/books/extractMetadata');
const Book = require('../../../../src/models/book');
const { publishEvent } = require('../../../../src/lib/event-bus');

// Mock the dependencies
jest.mock('../../../../src/models/book');
jest.mock('../../../../src/lib/event-bus');

describe('extractMetadata API handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock event bus
    publishEvent.mockResolvedValue({});
  });

  it('should trigger metadata extraction for valid book', async () => {
    // Mock book lookup
    Book.getById = jest.fn().mockResolvedValue({
      bookId: 'test-book-id',
      userId: 'user123',
      title: 'Test Book',
      s3Bucket: 'test-bucket',
      s3Key: 'book-covers/user123/test-image.jpg'
    });

    const event = {
      pathParameters: { bookId: 'test-book-id' },
      requestContext: {
        authorizer: {
          claims: { sub: 'user123' }
        }
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data.bookId).toBe('test-book-id');
    expect(body.data.status).toBe('processing');

    // Should publish EventBridge event
    expect(publishEvent).toHaveBeenCalledWith('S3.ObjectCreated', {
      bucket: 'test-bucket',
      key: 'book-covers/user123/test-image.jpg',
      userId: 'user123',
      bookId: 'test-book-id',
      eventType: 'manual-metadata-extraction'
    });
  });

  it('should return 404 for non-existent book', async () => {
    Book.getById = jest.fn().mockResolvedValue(null);

    const event = {
      pathParameters: { bookId: 'non-existent-book' },
      requestContext: {
        authorizer: {
          claims: { sub: 'user123' }
        }
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Book not found');
  });

  it('should return 403 for unauthorized user', async () => {
    Book.getById = jest.fn().mockResolvedValue({
      bookId: 'test-book-id',
      userId: 'other-user',
      title: 'Test Book',
      s3Bucket: 'test-bucket',
      s3Key: 'book-covers/other-user/test-image.jpg'
    });

    const event = {
      pathParameters: { bookId: 'test-book-id' },
      requestContext: {
        authorizer: {
          claims: { sub: 'user123' }
        }
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(403);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Not authorized to modify this book');
  });

  it('should return 400 for book without S3 image', async () => {
    Book.getById = jest.fn().mockResolvedValue({
      bookId: 'test-book-id',
      userId: 'user123',
      title: 'Test Book',
      s3Bucket: null,
      s3Key: null
    });

    const event = {
      pathParameters: { bookId: 'test-book-id' },
      requestContext: {
        authorizer: {
          claims: { sub: 'user123' }
        }
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Book does not have associated S3 image');
  });

  it('should return 400 for missing bookId', async () => {
    const event = {
      pathParameters: {},
      requestContext: {
        authorizer: {
          claims: { sub: 'user123' }
        }
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Missing bookId parameter');
  });

  it('should return 401 for unauthenticated user', async () => {
    const event = {
      pathParameters: { bookId: 'test-book-id' },
      requestContext: {
        authorizer: {
          claims: {}
        }
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('User not authenticated');
  });
});