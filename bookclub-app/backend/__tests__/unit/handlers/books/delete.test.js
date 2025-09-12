const { handler } = require('../../../../src/handlers/books/delete');
const Book = require('../../../../src/models/book');
const response = require('../../../../src/lib/response');

jest.mock('../../../../src/models/book');
jest.mock('../../../../src/lib/response');

describe('deleteBook handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete book successfully when valid parameters are provided', async () => {
    const mockUserId = 'user123';
    const mockBookId = 'book123';
    
    Book.delete.mockResolvedValue({ success: true });
    response.success.mockReturnValue({ 
      statusCode: 200, 
      body: JSON.stringify({ message: 'Book deleted successfully' }) 
    });

    const event = {
      pathParameters: {
        bookId: mockBookId
      },
      requestContext: {
        authorizer: {
          claims: {
            sub: mockUserId
          }
        }
      }
    };

    const result = await handler(event);

    expect(Book.delete).toHaveBeenCalledWith(mockBookId, mockUserId);
    expect(response.success).toHaveBeenCalledWith({ message: 'Book deleted successfully' });
    expect(result.statusCode).toBe(200);
  });

  it('should return validation error when bookId is missing', async () => {
    response.validationError.mockReturnValue({ 
      statusCode: 400, 
      body: JSON.stringify({ error: 'Validation error' }) 
    });

    const event = {
      pathParameters: {},
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user123'
          }
        }
      }
    };

    const result = await handler(event);

    expect(response.validationError).toHaveBeenCalledWith({
      bookId: 'Book ID is required'
    });
    expect(Book.delete).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
  });

  it('should return not found when book does not exist or user lacks permission', async () => {
    const mockUserId = 'user123';
    const mockBookId = 'book123';
    const error = new Error('Book not found or you do not have permission to delete it');
    
    Book.delete.mockRejectedValue(error);
    response.notFound.mockReturnValue({ 
      statusCode: 404, 
      body: JSON.stringify({ error: 'Not found' }) 
    });

    const event = {
      pathParameters: {
        bookId: mockBookId
      },
      requestContext: {
        authorizer: {
          claims: {
            sub: mockUserId
          }
        }
      }
    };

    const result = await handler(event);

    expect(Book.delete).toHaveBeenCalledWith(mockBookId, mockUserId);
    expect(response.notFound).toHaveBeenCalledWith(error.message);
    expect(result.statusCode).toBe(404);
  });

  it('should handle database errors gracefully', async () => {
    const mockUserId = 'user123';
    const mockBookId = 'book123';
    const error = new Error('DynamoDB connection failed');
    
    Book.delete.mockRejectedValue(error);
    response.error.mockReturnValue({ 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Internal server error' }) 
    });

    const event = {
      pathParameters: {
        bookId: mockBookId
      },
      requestContext: {
        authorizer: {
          claims: {
            sub: mockUserId
          }
        }
      }
    };

    const result = await handler(event);

    expect(Book.delete).toHaveBeenCalledWith(mockBookId, mockUserId);
    expect(response.error).toHaveBeenCalledWith(error);
    expect(result.statusCode).toBe(500);
  });
});