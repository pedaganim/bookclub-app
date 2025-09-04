/**
 * AWS Lambda handler for retrieving a specific book by ID
 * Returns book details if found and accessible
 */
const Book = require('../../models/book');
const response = require('../../lib/response');

/**
 * Lambda handler function for getting a book by ID
 * @param {Object} event - AWS Lambda event object containing HTTP request data
 * @param {Object} event.pathParameters - URL path parameters
 * @param {string} event.pathParameters.bookId - Unique identifier of the book
 * @returns {Promise<Object>} HTTP response with book data or error
 */
module.exports.handler = async (event) => {
  try {
    const { bookId } = event.pathParameters;
    
    if (!bookId) {
      return response.validationError({
        bookId: 'Book ID is required',
      });
    }

    const book = await Book.getById(bookId);
    
    if (!book) {
      return response.notFound('Book not found');
    }

    return response.success(book);
  } catch (error) {
    return response.error(error);
  }
};
