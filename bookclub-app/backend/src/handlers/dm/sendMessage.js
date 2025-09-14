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

    if (!event.body) return error('Request body is required', 400);
    const { toUserId, content } = JSON.parse(event.body);
    if (!toUserId || !content || typeof content !== 'string' || content.trim().length === 0) {
      return error('toUserId and non-empty content are required', 400);
    }
    if (content.length > 2000) return error('content too long (max 2000)', 400);

    // Ensure conv exists and user participates
    const conv = await DM.ensureConversation(currentUser.userId, toUserId);
    if (conv.conversationId !== conversationId) return error('Conversation ID does not match participants', 403);

    const msg = await DM.sendMessage({ conversationId, fromUserId: currentUser.userId, toUserId, content: content.trim() });
    return success(msg);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error sending message:', e);
    return error(e.message || 'Failed to send message', 500);
  }
};
