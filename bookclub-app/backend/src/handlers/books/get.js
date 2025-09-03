const Book = require('../../models/book');
const response = require('../../lib/response');

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
