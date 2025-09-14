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

    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : 20;
    const list = await DM.listConversationsForUser(currentUser.userId, Math.min(Math.max(limit, 1), 100));
    return success(list);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error listing conversations:', e);
    return error(e.message || 'Failed to list conversations', 500);
  }
};
