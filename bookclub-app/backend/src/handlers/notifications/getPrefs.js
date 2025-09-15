const { success, error } = require('../../lib/response');
const { getUserPrefs } = require('../../lib/notification-service');
const User = require('../../models/user');

exports.handler = async (event) => {
  try {
    // Auth: claims first, fallback to token
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
      } catch (err) {
        return error('Invalid or expired token', 401);
      }
    }

    const prefs = await getUserPrefs(userId);
    return success(prefs);
  } catch (err) {
    console.error('Error getting notification prefs:', err);
    return error(err.message || 'Failed to get notification preferences', 500);
  }
};
