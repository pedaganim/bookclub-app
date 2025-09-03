const Book = require('../../models/book');
const response = require('../../lib/response');

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
