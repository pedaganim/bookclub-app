const Book = require('../../models/book');
const response = require('../../lib/response');

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
