const response = require('../../lib/response');
const Notification = require('../../models/notification');

module.exports.handler = async (event) => {
  try {
    // Get userId from Cognito authorizer claims
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    console.log('getUnreadCount handler', { userId });

    const count = await Notification.getUnreadCount(userId);

    return response.success({ unreadCount: count });
  } catch (error) {
    return response.error(error);
  }
};