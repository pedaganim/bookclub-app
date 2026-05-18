const { handler } = require('../../../../src/handlers/books/get');
const BookService = require('../../../../src/services/book-service');

jest.mock('../../../../src/services/book-service');

describe('getBook handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return book when valid bookId is provided', async () => {
    const mockBook = { id: 'book123', title: 'Test Book', author: 'Test Author' };
    BookService.getById.mockResolvedValue(mockBook);

    const event = {
      pathParameters: {
        bookId: 'book123'
      }
    };

    const result = await handler(event);

    expect(BookService.getById).toHaveBeenCalledWith('book123');
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data).toEqual(mockBook);
  });

  it('should return validation error when bookId is missing', async () => {
    const event = {
      pathParameters: {}
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.errors.bookId).toBe('Book ID is required');
  });

  it('should return not found when book does not exist', async () => {
    BookService.getById.mockRejectedValue(new Error('NOT_FOUND:Book not found'));

    const event = {
      pathParameters: {
        bookId: 'nonexistent123'
      }
    };

    const result = await handler(event);

    expect(BookService.getById).toHaveBeenCalledWith('nonexistent123');
    expect(result.statusCode).toBe(404);
  });

  it('should handle database errors gracefully', async () => {
    const error = new Error('Database connection failed');
    BookService.getById.mockRejectedValue(error);

    const event = {
      pathParameters: {
        bookId: 'book123'
      }
    };

    const result = await handler(event);

    expect(BookService.getById).toHaveBeenCalledWith('book123');
    expect(result.statusCode).toBe(500);
  });
});