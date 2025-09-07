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

    const { notificationId } = event.pathParameters;

    if (!notificationId) {
      return response.validationError({
        notificationId: 'Notification ID is required',
      });
    }

    console.log('markNotificationRead handler', {
      userId,
      notificationId,
    });

    const updatedNotification = await Notification.markAsRead(notificationId, userId);
    
    if (!updatedNotification) {
      return response.notFound('Notification not found or you do not have permission to update it');
    }

    return response.success(updatedNotification);
  } catch (error) {
    return response.error(error);
  }
};