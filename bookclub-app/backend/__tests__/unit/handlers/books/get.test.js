const { handler } = require('../../../../src/handlers/books/get');
const Book = require('../../../../src/models/book');
const response = require('../../../../src/lib/response');

jest.mock('../../../../src/models/book');
jest.mock('../../../../src/lib/response');

describe('getBook handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return book when valid bookId is provided', async () => {
    const mockBook = { id: 'book123', title: 'Test Book', author: 'Test Author' };
    
    Book.getById.mockResolvedValue(mockBook);
    response.success.mockReturnValue({ statusCode: 200, body: JSON.stringify(mockBook) });

    const event = {
      pathParameters: {
        bookId: 'book123'
      }
    };

    const result = await handler(event);

    expect(Book.getById).toHaveBeenCalledWith('book123');
    expect(response.success).toHaveBeenCalledWith(mockBook);
    expect(result.statusCode).toBe(200);
  });

  it('should return validation error when bookId is missing', async () => {
    response.validationError.mockReturnValue({ 
      statusCode: 400, 
      body: JSON.stringify({ error: 'Validation error' }) 
    });

    const event = {
      pathParameters: {}
    };

    const result = await handler(event);

    expect(response.validationError).toHaveBeenCalledWith({
      bookId: 'Book ID is required'
    });
    expect(Book.getById).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
  });

  it('should return not found when book does not exist', async () => {
    Book.getById.mockResolvedValue(null);
    response.notFound.mockReturnValue({ 
      statusCode: 404, 
      body: JSON.stringify({ error: 'Not found' }) 
    });

    const event = {
      pathParameters: {
        bookId: 'nonexistent123'
      }
    };

    const result = await handler(event);

    expect(Book.getById).toHaveBeenCalledWith('nonexistent123');
    expect(response.notFound).toHaveBeenCalledWith('Book not found');
    expect(result.statusCode).toBe(404);
  });

  it('should handle database errors gracefully', async () => {
    const error = new Error('Database connection failed');
    Book.getById.mockRejectedValue(error);
    response.error.mockReturnValue({ 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Internal server error' }) 
    });

    const event = {
      pathParameters: {
        bookId: 'book123'
      }
    };

    const result = await handler(event);

    expect(Book.getById).toHaveBeenCalledWith('book123');
    expect(response.error).toHaveBeenCalledWith(error);
    expect(result.statusCode).toBe(500);
  });
});