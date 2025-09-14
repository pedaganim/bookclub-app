const { success, error } = require('../../lib/response');
const User = require('../../models/user');
const DM = require('../../models/dm');

exports.handler = async (event) => {
  try {
    const claims = event?.requestContext?.authorizer?.claims;
    let userId = claims?.sub;

    // Fallback to manual token validation for compatibility with tests/offline
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

    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : 20;
    const list = await DM.listConversationsForUser(userId, Math.min(Math.max(limit, 1), 100));
    return success(list);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error listing conversations:', e);
    return error(e.message || 'Failed to list conversations', 500);
  }
};
