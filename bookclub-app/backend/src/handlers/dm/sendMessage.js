const { success, error } = require('../../lib/response');
const User = require('../../models/user');
const DM = require('../../models/dm');
const { sendEmailIfEnabled } = require('../../lib/notification-service');

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

    const { conversationId } = event.pathParameters || {};
    if (!conversationId) return error('conversationId is required', 400);

    if (!event.body) return error('Request body is required', 400);
    const { toUserId, content } = JSON.parse(event.body);
    if (!toUserId || !content || typeof content !== 'string' || content.trim().length === 0) {
      return error('toUserId and non-empty content are required', 400);
    }
    if (content.length > 2000) return error('content too long (max 2000)', 400);

    // Ensure conv exists and user participates
    const conv = await DM.ensureConversation(userId, toUserId);
    if (conv.conversationId !== conversationId) return error('Conversation ID does not match participants', 403);

    const trimmed = content.trim();
    const msg = await DM.sendMessage({ conversationId, fromUserId: userId, toUserId, content: trimmed });

    // Fire-and-forget notification (do not block response on email failures)
    try {
      const sender = await User.getById(userId);
      const fromName = sender?.name || 'A user';
      const baseUrl = process.env.APP_BASE_URL || 'https://booklub.shop';
      const conversationUrl = `${baseUrl.replace(/\/$/, '')}/messages/${conversationId}`;
      await sendEmailIfEnabled(
        toUserId,
        'dm_message_received',
        'dm_message_received',
        { fromName, snippet: trimmed.slice(0, 140), conversationUrl }
      );
    } catch (notifyErr) {
      // eslint-disable-next-line no-console
      console.warn('DM email notification skipped/failed:', notifyErr?.message || notifyErr);
    }

    return success(msg);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error sending message:', e);
    return error(e.message || 'Failed to send message', 500);
  }
};
