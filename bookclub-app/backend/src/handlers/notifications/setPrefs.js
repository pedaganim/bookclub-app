const { success, error } = require('../../lib/response');
const { setUserPrefs } = require('../../lib/notification-service');
const User = require('../../models/user');

exports.handler = async (event) => {
  try {
    if (!event.body) return error('Request body is required', 400);
    const payload = JSON.parse(event.body);
    const updates = {};

    if (typeof payload.emailOptIn === 'boolean') updates.emailOptIn = payload.emailOptIn;
    if (payload.prefs && typeof payload.prefs === 'object') updates.prefs = payload.prefs;

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

    const result = await setUserPrefs(userId, updates);
    return success(result);
  } catch (err) {
    console.error('Error updating notification prefs:', err);
    return error(err.message || 'Failed to update notification preferences', 500);
  }
};
