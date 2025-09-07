const response = require('../../lib/response');
const User = require('../../models/user');

module.exports.handler = async (event) => {
  try {
    // Get userId from Cognito authorizer claims
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    const data = JSON.parse(event.body);

    // Validate notification preferences structure
    const validPreferences = ['email', 'inApp', 'bookProposals', 'votes', 'meetingReminders', 'discussionReplies'];
    const preferences = {};
    
    // Only allow valid preference keys and ensure they are boolean values
    validPreferences.forEach(key => {
      if (key in data) {
        preferences[key] = Boolean(data[key]);
      }
    });

    if (Object.keys(preferences).length === 0) {
      return response.validationError({
        message: 'No valid notification preferences provided',
      });
    }

    console.log('updateNotificationPreferences handler', {
      userId,
      preferences,
    });

    // Update user with new notification preferences
    const updatedUser = await User.update(userId, { notificationPreferences: preferences });
    
    if (!updatedUser) {
      return response.notFound('User not found');
    }

    return response.success({ 
      notificationPreferences: updatedUser.notificationPreferences || preferences 
    });
  } catch (error) {
    return response.error(error);
  }
};