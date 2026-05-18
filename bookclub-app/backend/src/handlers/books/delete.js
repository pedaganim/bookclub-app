const response = require('../../lib/response');
const BookService = require('../../services/book-service');
const { withAuth } = require('../../lib/middleware');

/**
 * Handler for deleting a book or library item.
 */
const handler = async (event) => {
  const { bookId } = event.pathParameters || {};
  if (!bookId) return response.validationError({ message: 'Book ID is required' });

  await BookService.delete(bookId, event.userId);
  
  return response.success({ message: 'Book deleted successfully' });
};

module.exports.handler = withAuth(handler);
