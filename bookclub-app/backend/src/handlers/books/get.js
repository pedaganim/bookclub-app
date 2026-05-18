const response = require('../../lib/response');
const BookService = require('../../services/book-service');
const { withErrorHandler } = require('../../lib/middleware');

/**
 * Handler for retrieving a single book or library item by ID.
 */
const handler = async (event) => {
  const { bookId } = event.pathParameters || {};
  
  if (!bookId) {
    return response.validationError({ bookId: 'Book ID is required' });
  }

  const book = await BookService.getById(bookId);
  
  return response.success(book);
};

module.exports.handler = withErrorHandler(handler);
