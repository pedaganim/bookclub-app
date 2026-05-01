const Book = require('../../models/book');
const User = require('../../models/user');
const BookClub = require('../../models/bookclub');
const response = require('../../lib/response');
const { getAuthenticatedUserId } = require('../../lib/get-user-id');

module.exports.handler = async (event) => {
  try {
    const { bookId } = event.pathParameters;
    const userId = await getAuthenticatedUserId(event);
    if (!userId) return response.unauthorized('Unauthorized');

    if (!bookId) {
      return response.validationError({
        bookId: 'Book ID is required',
      });
    }

    // Determine the effective owner for the delete call.
    // Club admins can delete items in their club; superadmins can delete any item.
    let effectiveUserId = userId;
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

    await Book.delete(bookId, effectiveUserId);
    return response.success({ message: 'Book deleted successfully' });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return response.notFound(error.message);
    }
    return response.error(error);
  }
};
