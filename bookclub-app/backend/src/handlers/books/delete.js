/**
 * AWS Lambda handler for deleting books
 * Allows book owners to delete their own books
 */
const Book = require('../../models/book');
const response = require('../../lib/response');

/**
 * Lambda handler function for deleting a book
 * @param {Object} event - AWS Lambda event object containing HTTP request data
 * @param {Object} event.pathParameters - URL path parameters
 * @param {string} event.pathParameters.bookId - Unique identifier of the book to delete
 * @param {Object} event.requestContext.authorizer.claims - JWT claims containing user info
 * @param {string} event.requestContext.authorizer.claims.sub - User ID from JWT token
 * @returns {Promise<Object>} HTTP response confirming deletion or error
 */
module.exports.handler = async (event) => {
  try {
    const { bookId } = event.pathParameters;
    const userId = event.requestContext.authorizer.claims.sub;

    if (!bookId) {
      return response.validationError({
        bookId: 'Book ID is required',
      });
    }

    await Book.delete(bookId, userId);
    return response.success({ message: 'Book deleted successfully' });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return response.notFound(error.message);
    }
    return response.error(error);
  }
};
