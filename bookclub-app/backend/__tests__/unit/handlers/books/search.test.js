const searchHandler = require('../../../../src/handlers/books/search');

// Mock the dependencies
jest.mock('../../../../src/lib/response');
jest.mock('../../../../src/models/book');

const response = require('../../../../src/lib/response');
const Book = require('../../../../src/models/book');

describe('Book Search Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    response.success = jest.fn().mockReturnValue({
      statusCode: 200,
      body: JSON.stringify({ success: true })
    });
    
    response.error = jest.fn().mockReturnValue({
      statusCode: 400,
      body: JSON.stringify({ success: false })
    });
  });

  describe('handler', () => {
    it('should search books with query parameter', async () => {
      const mockBooks = [
        {
          bookId: 'book-1',
          title: 'JavaScript: The Good Parts',
          author: 'Douglas Crockford',
          description: 'A book about JavaScript'
        },
        {
          bookId: 'book-2', 
          title: 'Clean Code',
          author: 'Robert Martin',
          description: 'A handbook of agile software craftsmanship'
        }
      ];

      Book.search = jest.fn().mockResolvedValue({
        items: mockBooks,
        nextToken: null
      });

      const event = {
        queryStringParameters: {
          q: 'javascript',
          limit: '10'
        }
      };

      await searchHandler.handler(event);

      expect(Book.search).toHaveBeenCalledWith('javascript', 10, null);
      expect(response.success).toHaveBeenCalledWith({
        items: mockBooks,
        nextToken: null,
        query: 'javascript',
        totalCount: 2
      });
    });

    it('should handle empty query parameter', async () => {
      const mockBooks = [
        {
          bookId: 'book-1',
          title: 'JavaScript: The Good Parts',
          author: 'Douglas Crockford'
        }
      ];

      Book.search = jest.fn().mockResolvedValue({
        items: mockBooks,
        nextToken: null
      });

      const event = {
        queryStringParameters: {
          q: ''
        }
      };

      await searchHandler.handler(event);

      expect(Book.search).toHaveBeenCalledWith('', 10, null);
      expect(response.success).toHaveBeenCalledWith({
        items: mockBooks,
        nextToken: null,
        query: '',
        totalCount: 1
      });
    });

    it('should handle missing query parameters', async () => {
      const mockBooks = [];

      Book.search = jest.fn().mockResolvedValue({
        items: mockBooks,
        nextToken: null
      });

      const event = {
        queryStringParameters: null
      };

      await searchHandler.handler(event);

      expect(Book.search).toHaveBeenCalledWith('', 10, null);
      expect(response.success).toHaveBeenCalledWith({
        items: mockBooks,
        nextToken: null,
        query: '',
        totalCount: 0
      });
    });

    it('should handle pagination parameters', async () => {
      const mockBooks = [
        {
          bookId: 'book-1',
          title: 'JavaScript: The Good Parts',
          author: 'Douglas Crockford'
        }
      ];

      Book.search = jest.fn().mockResolvedValue({
        items: mockBooks,
        nextToken: 'next-page-token'
      });

      const event = {
        queryStringParameters: {
          q: 'javascript',
          limit: '5',
          nextToken: 'current-page-token'
        }
      };

      await searchHandler.handler(event);

      expect(Book.search).toHaveBeenCalledWith('javascript', 5, 'current-page-token');
      expect(response.success).toHaveBeenCalledWith({
        items: mockBooks,
        nextToken: 'next-page-token',
        query: 'javascript',
        totalCount: 1
      });
    });

    it('should handle search errors', async () => {
      const error = new Error('Search failed');
      Book.search = jest.fn().mockRejectedValue(error);

      const event = {
        queryStringParameters: {
          q: 'test'
        }
      };

      await searchHandler.handler(event);

      expect(Book.search).toHaveBeenCalledWith('test', 10, null);
      expect(response.error).toHaveBeenCalledWith(error);
    });

    it('should use default limit when not provided', async () => {
      const mockBooks = [];

      Book.search = jest.fn().mockResolvedValue({
        items: mockBooks,
        nextToken: null
      });

      const event = {
        queryStringParameters: {
          q: 'test'
        }
      };

      await searchHandler.handler(event);

      expect(Book.search).toHaveBeenCalledWith('test', 10, null);
    });

    it('should handle invalid limit parameter', async () => {
      const mockBooks = [];

      Book.search = jest.fn().mockResolvedValue({
        items: mockBooks,
        nextToken: null
      });

      const event = {
        queryStringParameters: {
          q: 'test',
          limit: 'invalid'
        }
      };

      await searchHandler.handler(event);

      expect(Book.search).toHaveBeenCalledWith('test', 10, null);
    });
  });
});