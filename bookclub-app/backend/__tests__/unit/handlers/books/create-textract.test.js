const { handler } = require('../../../../src/handlers/books/create');
const BookService = require('../../../../src/services/book-service');

// Mock dependencies
jest.mock('../../../../src/services/book-service');

describe('Create Book Handler', () => {
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
    userId,
    body: JSON.stringify(body)
  });

  it('should create book successfully via Service', async () => {
    const mockCreatedBook = {
      id: 'book-123',
      title: 'Clean Code',
      author: 'Robert C. Martin',
    };

    BookService.create.mockResolvedValue(mockCreatedBook);

    const event = mockEvent({
      title: 'Clean Code',
      author: 'Robert C. Martin',
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockCreatedBook);
    expect(BookService.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Clean Code', author: 'Robert C. Martin' }),
      'test-user-123'
    );
  });

  it('should handle service-level validation errors', async () => {
    BookService.create.mockRejectedValue(new Error('VALIDATION_ERROR:Missing required fields: title, author'));

    const event = mockEvent({
      extractFromImage: true,
      s3Bucket: 'test-bucket',
      s3Key: 'test-key'
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.errors.message).toContain('Missing required fields: title, author');
  });

  it('should handle zod validation errors', async () => {
    const event = mockEvent({
      title: 123, // Should be string
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.errors.title).toBeDefined();
  });
});