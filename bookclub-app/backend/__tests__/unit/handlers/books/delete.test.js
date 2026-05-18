const { handler } = require('../../../../src/handlers/books/delete');
const BookService = require('../../../../src/services/book-service');

jest.mock('../../../../src/services/book-service');

describe('deleteBook handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEvent = (bookId, userId = 'user123') => ({
    pathParameters: { bookId },
    requestContext: {
      authorizer: {
        claims: {
          sub: userId
        }
      }
    }
  });

  it('should delete book successfully when valid parameters are provided', async () => {
    const mockBookId = 'book123';
    const mockUserId = 'user123';
    
    BookService.delete.mockResolvedValue(true);

    const event = mockEvent(mockBookId, mockUserId);
    const result = await handler(event);

    expect(BookService.delete).toHaveBeenCalledWith(mockBookId, mockUserId);
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.message).toBe('Book deleted successfully');
  });

  it('should return validation error when bookId is missing', async () => {
    const event = {
      pathParameters: {},
      requestContext: { authorizer: { claims: { sub: 'user123' } } }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(BookService.delete).not.toHaveBeenCalled();
  });

  it('should return 404 when book not found', async () => {
    BookService.delete.mockRejectedValue(new Error('NOT_FOUND:Book not found'));

    const event = mockEvent('missing123');
    const result = await handler(event);

    expect(result.statusCode).toBe(404);
  });

  it('should return 403 when user is not authorized', async () => {
    BookService.delete.mockRejectedValue(new Error('FORBIDDEN:You do not have permission'));

    const event = mockEvent('book123', 'otheruser');
    const result = await handler(event);

    expect(result.statusCode).toBe(403);
  });
});