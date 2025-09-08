const { handler } = require('../../../../src/handlers/books/list');
const Book = require('../../../../src/models/book');
const response = require('../../../../src/lib/response');

jest.mock('../../../../src/models/book');
jest.mock('../../../../src/lib/response');

describe('listBooks handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it('should list books by user when userId is provided in query string', async () => {
    const mockBooks = {
      items: [{ id: '1', title: 'Test Book' }],
      nextToken: 'token123'
    };
    
    Book.listByUser.mockResolvedValue(mockBooks);
    response.success.mockReturnValue({ statusCode: 200, body: JSON.stringify(mockBooks) });

    const event = {
      queryStringParameters: {
        userId: 'user123',
        limit: '5'
      }
    };

    const result = await handler(event);

    expect(Book.listByUser).toHaveBeenCalledWith('user123', 5, null);
    expect(response.success).toHaveBeenCalledWith({
      items: mockBooks.items,
      nextToken: mockBooks.nextToken
    });
    expect(result.statusCode).toBe(200);
  });

  it('should list books by authenticated user when no userId in query but has Cognito claims', async () => {
    const mockBooks = {
      items: [{ id: '2', title: 'Another Book' }],
      nextToken: null
    };
    
    Book.listByUser.mockResolvedValue(mockBooks);
    response.success.mockReturnValue({ statusCode: 200, body: JSON.stringify(mockBooks) });

    const event = {
      requestContext: {
        authorizer: {
          claims: {
            sub: 'cognito-user-123'
          }
        }
      },
      queryStringParameters: null
    };

    await handler(event);

    expect(Book.listByUser).toHaveBeenCalledWith('cognito-user-123', 10, null);
    expect(response.success).toHaveBeenCalledWith({
      items: mockBooks.items,
      nextToken: null
    });
  });

  it('should list all books when no userId provided and no authentication', async () => {
    const mockBooks = {
      items: [{ id: '3', title: 'Public Book' }],
      nextToken: null
    };
    
    Book.listAll.mockResolvedValue(mockBooks);
    response.success.mockReturnValue({ statusCode: 200, body: JSON.stringify(mockBooks) });

    const event = {
      queryStringParameters: null
    };

    await handler(event);

    expect(Book.listAll).toHaveBeenCalledWith(10, null);
    expect(response.success).toHaveBeenCalledWith({
      items: mockBooks.items,
      nextToken: null
    });
  });

  it('should handle pagination with nextToken', async () => {
    const mockBooks = {
      items: [{ id: '4', title: 'Paginated Book' }],
      nextToken: 'next123'
    };
    
    Book.listByUser.mockResolvedValue(mockBooks);
    response.success.mockReturnValue({ statusCode: 200, body: JSON.stringify(mockBooks) });

    const event = {
      queryStringParameters: {
        userId: 'user456',
        limit: '20',
        nextToken: 'prev123'
      }
    };

    await handler(event);

    expect(Book.listByUser).toHaveBeenCalledWith('user456', 20, 'prev123');
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Database error');
    Book.listAll.mockRejectedValue(error);
    response.error.mockReturnValue({ statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) });

    const event = {
      queryStringParameters: null
    };

    const result = await handler(event);

    expect(response.error).toHaveBeenCalledWith(error);
    expect(result.statusCode).toBe(500);
  });

  it('should use default limit when not specified', async () => {
    const mockBooks = { items: [], nextToken: null };
    Book.listAll.mockResolvedValue(mockBooks);
    response.success.mockReturnValue({ statusCode: 200, body: JSON.stringify(mockBooks) });

    const event = {};

    await handler(event);

    expect(Book.listAll).toHaveBeenCalledWith(10, null);
  });
});