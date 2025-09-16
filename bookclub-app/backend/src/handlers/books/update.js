const Book = require('../../models/book');
const response = require('../../lib/response');

// --- Handler (top) ---
module.exports.handler = async (event) => {
  try {
    const { bookId } = event.pathParameters || {};
    const userId = event?.requestContext?.authorizer?.claims?.sub;
    const data = parseBody(event);

    if (!bookId) {
      return response.validationError({ bookId: 'Book ID is required' });
    }
    if (!data) {
      return response.validationError({ message: 'Request body is required' });
    }

    const updates = pickAllowed(data, ['title', 'author', 'description', 'coverImage', 'status']);
    const validationErr = validateUpdates(updates);
    if (validationErr) return validationErr;

    const updatedBook = await Book.update(bookId, userId, updates);
    if (!updatedBook) {
      return response.notFound('Book not found or you do not have permission to update it');
    }
    return response.success(updatedBook);
  } catch (error) {
    return response.error(error);
  }
};

// --- Helpers ---
const parseBody = (event) => {
  if (!event?.body) return null;
  try { return JSON.parse(event.body); } catch { return null; }
};

const pickAllowed = (data, allowed) => {
  const updates = {};
  Object.keys(data).forEach((key) => {
    if (allowed.includes(key)) updates[key] = data[key];
  });
  return updates;
};

const validateUpdates = (updates) => {
  if (!updates || Object.keys(updates).length === 0) {
    return response.validationError({ message: 'No valid fields to update' });
  }
  return null;
};
