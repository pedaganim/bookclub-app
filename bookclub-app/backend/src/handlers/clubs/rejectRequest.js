const { success, error } = require('../../lib/response');
const User = require('../../models/user');
const BookClub = require('../../models/bookclub');

module.exports.handler = async (event) => {
  try {
    const clubId = event?.pathParameters?.clubId;
    const targetUserId = event?.pathParameters?.userId;
    if (!clubId || !targetUserId) return error('clubId and userId are required', 400);

    // who is calling
    const claims = event?.requestContext?.authorizer?.claims;
    let userId = claims?.sub;
    if (!userId) {
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader || null;
      if (!token) return error('Authorization token is required', 401);
      const currentUser = await User.getCurrentUser(token).catch(() => null);
      if (!currentUser) return error('Invalid or expired token', 401);
      userId = currentUser.userId;
    }

    const club = await BookClub.getById(clubId);
    if (!club) return error('Club not found', 404);

    // admin check (creator or admin member)
    const isCreator = club.createdBy === userId;
    const role = await BookClub.getMemberRole(clubId, userId);
    const isAdmin = role === 'admin';
    if (!isCreator && !isAdmin) return error('Forbidden', 403);

    await BookClub.rejectJoinRequest(clubId, targetUserId);
    return success({ rejected: true });
  } catch (e) {
    return error(e.message || 'Failed to reject join request', 500);
  }
};
