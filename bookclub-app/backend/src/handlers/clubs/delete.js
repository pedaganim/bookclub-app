const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const { clubId } = event.pathParameters || {};
    if (!clubId) {
      return error('clubId is required in path', 400);
    }

    // Authn / Authz: prefer authorizer claims, fallback to token validation
    const claims = event?.requestContext?.authorizer?.claims;
    let userId = claims?.sub;
    if (!userId) {
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader || null;
      if (!token) return error('Authorization token is required', 401);
      try {
        const currentUser = await User.getCurrentUser(token);
        if (!currentUser) return error('User not found', 401);
        userId = currentUser.userId;
      } catch (err) {
        return error('Invalid or expired token', 401);
      }
    }

    const club = await BookClub.getById(clubId);
    if (!club) {
      return error('Club not found', 404);
    }

    if (club.createdBy !== userId) {
      return error('Only the club creator can delete this club', 403);
    }

    await BookClub.delete(clubId);
    return success({ deleted: true });
  } catch (err) {
    console.error('Error deleting club:', err);
    return error(err.message || 'Failed to delete club', 500);
  }
};
