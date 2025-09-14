const { success, error } = require('../../lib/response');
const DM = require('../../models/dm');

exports.handler = async (event) => {
  try {
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub;
    if (!userId) return error('Unauthorized', 401);

    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : 20;
    const list = await DM.listConversationsForUser(userId, Math.min(Math.max(limit, 1), 100));
    return success(list);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error listing conversations:', e);
    return error(e.message || 'Failed to list conversations', 500);
  }
};
