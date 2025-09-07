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

    const user = await User.getById(userId);
    if (!user) {
      return response.notFound('User not found');
    }

    // Return notification preferences with defaults if not set
    const preferences = user.notificationPreferences || {
      email: true,
      inApp: true,
      bookProposals: true,
      votes: true,
      meetingReminders: true,
      discussionReplies: true,
    };

    return response.success({ notificationPreferences: preferences });
  } catch (error) {
    return response.error(error);
  }
};