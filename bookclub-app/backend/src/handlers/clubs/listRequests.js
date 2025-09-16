const { success, error } = require('../../lib/response');
const User = require('../../models/user');
const BookClub = require('../../models/bookclub');

module.exports.handler = async (event) => {
  try {
    const clubId = event?.pathParameters?.clubId;
    if (!clubId) return error('clubId is required', 400);

    // who is calling
    const claims = event?.requestContext?.authorizer?.claims;
    let userId = claims?.sub;
    if (!userId) {
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader || null;
      if (!token) return error('Authorization token is required', 401);
      const currentUser = await User.getCurrentUser(token).catch((e) => {
        console.error('listRequests: getCurrentUser failed', e);
        return null;
      });
      if (!currentUser) return error('Invalid or expired token', 401);
      userId = currentUser.userId;
    }

    const club = await BookClub.getById(clubId);
    if (!club) return error('Club not found', 404);

    // admin check (creator or admin member)
    const isCreator = club.createdBy === userId;
    let role = null;
    try {
      role = await BookClub.getMemberRole(clubId, userId);
    } catch (e) {
      console.error('listRequests: getMemberRole failed', { clubId, userId, error: e?.message });
    }
    const isAdmin = role === 'admin';
    if (!isCreator && !isAdmin) return error('Forbidden', 403);

    const pending = await BookClub.listPendingRequests(clubId).catch((e) => {
      console.error('listRequests: listPendingRequests failed', { clubId, error: e?.message });
      throw e;
    });
    return success({ items: pending });
  } catch (e) {
    console.error('listRequests: unexpected error', e);
    return error(e.message || 'Failed to list join requests', 500);
  }
};
