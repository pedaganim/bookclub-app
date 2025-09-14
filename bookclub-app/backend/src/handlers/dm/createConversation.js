const { success, error } = require('../../lib/response');
const DM = require('../../models/dm');

exports.handler = async (event) => {
  try {
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub;
    if (!userId) return error('Unauthorized', 401);

    if (!event.body) return error('Request body is required', 400);
    const { toUserId } = JSON.parse(event.body);
    if (!toUserId) return error('toUserId is required', 400);
    if (toUserId === userId) return error('Cannot start a conversation with yourself', 400);

    const conv = await DM.ensureConversation(userId, toUserId);
    return success(conv);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error creating conversation:', e);
    return error(e.message || 'Failed to create conversation', 500);
  }
};
