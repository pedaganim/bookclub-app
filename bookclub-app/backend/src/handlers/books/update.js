const Book = require('../../models/book');
const User = require('../../models/user');
const BookClub = require('../../models/bookclub');
const response = require('../../lib/response');
const { getAuthenticatedUserId } = require('../../lib/get-user-id');

// --- Handler (top) ---
module.exports.handler = async (event) => {
  try {
    const { bookId } = event.pathParameters || {};
    const userId = await getAuthenticatedUserId(event);
    if (!userId) return response.unauthorized('Unauthorized');
    const data = parseBody(event);

    if (!bookId) {
      return response.validationError({ bookId: 'Book ID is required' });
    }
    if (!data) {
      return response.validationError({ message: 'Request body is required' });
    }

    const updates = pickAllowed(data, ['title', 'author', 'description', 'coverImage', 'status', 'lentToUserId', 'lentToUserName']);
    const validationErr = validateUpdates(updates);
    if (validationErr) return validationErr;

    // Determine the effective owner for the update call.
    // Club admins can edit items in their club; superadmins can edit any item.
    let effectiveUserId = userId;
    if (userId) {
      const book = await Book.getById(bookId);
      if (book && book.userId !== userId) {
        const reqUser = await User.getById(userId);
        const isSuperAdmin = reqUser?.role === 'superadmin';
        let isClubAdmin = false;
        if (book.clubId) {
          try {
            const role = await BookClub.getMemberRole(book.clubId, userId);
            isClubAdmin = role === 'admin';
          } catch (_) {}
        }
        if (isSuperAdmin || isClubAdmin) {
          effectiveUserId = book.userId;
        }
      }
    }

    const updatedBook = await Book.update(bookId, effectiveUserId, updates);
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
