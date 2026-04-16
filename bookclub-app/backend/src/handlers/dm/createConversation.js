const { success, error } = require('../../lib/response');
const User = require('../../models/user');
const DM = require('../../models/dm');
const BookClub = require('../../models/bookclub');

exports.handler = async (event) => {
  try {
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
      } catch {
        return error('Invalid or expired token', 401);
      }
    }

    if (!event.body) return error('Request body is required', 400);
    const { toUserId } = JSON.parse(event.body);
    if (!toUserId) return error('toUserId is required', 400);
    if (toUserId === userId) return error('Cannot start a conversation with yourself', 400);
    
    // Check if users share at least one club
    const sharedClubs = await BookClub.getSharedClubIds(userId, toUserId);
    if (sharedClubs.length === 0) {
      return error('You must share a common club to start a conversation with this user.', 403);
    }

    const conv = await DM.ensureConversation(userId, toUserId);
    return success(conv);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error creating conversation:', e);
    return error(e.message || 'Failed to create conversation', 500);
  }
};
