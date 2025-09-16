const { success, error } = require('../../lib/response');
const User = require('../../models/user');
const BookClub = require('../../models/bookclub');

exports.handler = async (event) => {
  try {
    const clubId = event?.pathParameters?.clubId;
    if (!clubId) return error('clubId is required', 400);

    // Determine userId from Cognito claims or token
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
    if (!club) return error('Club not found', 404);
    if (!club.isPrivate) {
      // For public clubs, directly add as member
      const membership = await BookClub.addMember(clubId, userId, 'member');
      return success({ status: 'active', membership });
    }

    const reqRecord = await BookClub.createJoinRequest(clubId, userId);
    return success({ status: 'pending', request: reqRecord });
  } catch (e) {
    if (e && e.code === 'AlreadyMember') {
      return success({ status: 'active' });
    }
    return error(e.message || 'Failed to request to join club', 500);
  }
};
