const { success, error } = require('../../lib/response');
const DM = require('../../models/dm');

exports.handler = async (event) => {
  try {
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub;
    if (!userId) return error('Unauthorized', 401);

    const { conversationId } = event.pathParameters || {};
    if (!conversationId) return error('conversationId is required', 400);

    await DM.markRead(conversationId, userId);
    return success({ read: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error marking conversation read:', e);
    return error(e.message || 'Failed to mark conversation as read', 500);
  }
};
