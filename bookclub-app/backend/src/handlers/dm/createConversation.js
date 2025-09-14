const { success, error } = require('../../lib/response');
const User = require('../../models/user');
const DM = require('../../models/dm');

exports.handler = async (event) => {
  try {
    const authToken = event.headers.Authorization?.replace('Bearer ', '');
    if (!authToken) return error('Authorization token is required', 401);
    let currentUser;
    try { currentUser = await User.getCurrentUser(authToken); } catch { return error('Invalid or expired token', 401); }
    if (!currentUser) return error('User not found', 401);

    if (!event.body) return error('Request body is required', 400);
    const { toUserId } = JSON.parse(event.body);
    if (!toUserId) return error('toUserId is required', 400);
    if (toUserId === currentUser.userId) return error('Cannot start a conversation with yourself', 400);

    const conv = await DM.ensureConversation(currentUser.userId, toUserId);
    return success(conv);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error creating conversation:', e);
    return error(e.message || 'Failed to create conversation', 500);
  }
};
