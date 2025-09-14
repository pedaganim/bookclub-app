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

    const { conversationId } = event.pathParameters || {};
    if (!conversationId) return error('conversationId is required', 400);

    await DM.markRead(conversationId, currentUser.userId);
    return success({ read: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error marking conversation read:', e);
    return error(e.message || 'Failed to mark conversation as read', 500);
  }
};
