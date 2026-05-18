const response = require('../../lib/response');
const NotificationService = require('../../services/notification-service');
const { withAuth } = require('../../lib/middleware');

/**
 * Handler for retrieving user notification preferences.
 */
const handler = async (event) => {
  const prefs = await NotificationService.getPrefs(event.userId);
  return response.success(prefs);
};

module.exports.handler = withAuth(handler);
