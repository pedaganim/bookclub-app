jest.mock('../../../../src/services/book-service');

const { handler } = require('../../../../src/handlers/books/list');
const BookService = require('../../../../src/services/book-service');

describe('listBooks handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list books by user when userId is provided in query string', async () => {
    const mockBooks = {
      items: [{ id: '1', title: 'Test Book' }],
      nextToken: 'token123'
    };
    
    BookService.list.mockResolvedValue(mockBooks);

    const event = {
      queryStringParameters: {
        userId: 'user123',
        limit: '5'
      },
      requestContext: {
        authorizer: {
          claims: {
            sub: 'auth-user-id'
          }
        }
      }
    };

    const result = await handler(event);

    expect(BookService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user123',
        limit: 5
      }),
      'auth-user-id'
    );
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.items).toEqual(mockBooks.items);
    expect(body.data.nextToken).toBe(mockBooks.nextToken);
  });

  it('should list books by authenticated user when no userId in query', async () => {
    const mockBooks = {
      items: [{ id: '2', title: 'Another Book' }],
      nextToken: null
    };
    
    BookService.list.mockResolvedValue(mockBooks);

    const event = {
      queryStringParameters: null,
      requestContext: {
        authorizer: {
          claims: {
            sub: 'cognito-user-123'
          }
        }
      }
    };

    const result = await handler(event);

    expect(BookService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10
      }),
      'cognito-user-123'
    );
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.data.items).toEqual(mockBooks.items);
  });

  it('should handle pagination with nextToken', async () => {
    const mockBooks = {
      items: [{ id: '4', title: 'Paginated Book' }],
      nextToken: 'next123'
    };
    
    BookService.list.mockResolvedValue(mockBooks);

    const event = {
      queryStringParameters: {
        userId: 'user456',
        limit: '20',
        nextToken: 'prev123'
      },
      requestContext: {
        authorizer: {
          claims: {
            sub: 'some-user'
          }
        }
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(BookService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user456',
        limit: 20,
        nextToken: 'prev123'
      }),
      'some-user'
    );
  });

  it('should handle search filter', async () => {
    const mockBooks = {
      items: [{ bookId: '1', title: 'Book 1' }],
      nextToken: null
    };

    BookService.list.mockResolvedValue(mockBooks);

    const event = {
      queryStringParameters: {
        search: 'fiction'
      }
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(BookService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'fiction'
      }),
      null
    );
  });
});