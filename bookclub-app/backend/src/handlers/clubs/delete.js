const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const { clubId } = event.pathParameters || {};
    if (!clubId) {
      return error('clubId is required in path', 400);
    }

    // Authn / Authz
    const authToken = event.headers.Authorization?.replace('Bearer ', '');
    if (!authToken) {
      return error('Authorization token is required', 401);
    }

    let currentUser;
    try {
      currentUser = await User.getCurrentUser(authToken);
    } catch (err) {
      return error('Invalid or expired token', 401);
    }
    if (!currentUser) {
      return error('User not found', 401);
    }

    const club = await BookClub.getById(clubId);
    if (!club) {
      return error('Club not found', 404);
    }

    if (club.createdBy !== currentUser.userId) {
      return error('Only the club creator can delete this club', 403);
    }

    await BookClub.delete(clubId);
    return success({ deleted: true });
  } catch (err) {
    console.error('Error deleting club:', err);
    return error(err.message || 'Failed to delete club', 500);
  }
};
