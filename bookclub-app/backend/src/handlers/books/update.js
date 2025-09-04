/**
 * AWS Lambda handler for updating existing books
 * Allows book owners to modify their book information
 */
const Book = require('../../models/book');
const response = require('../../lib/response');

/**
 * Lambda handler function for updating a book
 * @param {Object} event - AWS Lambda event object containing HTTP request data
 * @param {Object} event.pathParameters - URL path parameters
 * @param {string} event.pathParameters.bookId - Unique identifier of the book to update
 * @param {Object} event.requestContext.authorizer.claims - JWT claims containing user info
 * @param {string} event.requestContext.authorizer.claims.sub - User ID from JWT token
 * @param {Object} event.body - JSON string containing book update data
 * @param {string} event.body.title - Updated book title (optional)
 * @param {string} event.body.author - Updated book author (optional)
 * @param {string} event.body.description - Updated book description (optional)
 * @param {string} event.body.coverImage - Updated book cover image URL (optional)
 * @param {string} event.body.status - Updated book status (optional)
 * @returns {Promise<Object>} HTTP response with updated book data or error
 */
module.exports.handler = async (event) => {
  try {
    const { bookId } = event.pathParameters;
    const userId = event.requestContext.authorizer.claims.sub;
    const data = JSON.parse(event.body);

    if (!bookId) {
      return response.validationError({
        bookId: 'Book ID is required',
      });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = ['title', 'author', 'description', 'coverImage', 'status'];
    const updates = {};

    Object.keys(data).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = data[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return response.validationError({
        message: 'No valid fields to update',
      });
    }

    const updatedBook = await Book.update(bookId, userId, updates);
    
    if (!updatedBook) {
      return response.notFound('Book not found or you do not have permission to update it');
    }

    return response.success(updatedBook);
  } catch (error) {
    return response.error(error);
  }
};
