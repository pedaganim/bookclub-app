const response = require('../../lib/response');
const Meeting = require('../../models/meeting');

module.exports.handler = async (event) => {
  try {
    // Get userId from Cognito authorizer claims
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    const data = JSON.parse(event.body);

    // Validate input
    const errors = {};
    if (!data.clubId) errors.clubId = 'Club ID is required';
    if (!data.title) errors.title = 'Meeting title is required';
    if (!data.scheduledAt) errors.scheduledAt = 'Meeting schedule is required';

    if (Object.keys(errors).length > 0) {
      return response.validationError(errors);
    }

    console.log('createMeeting handler', {
      userId,
      clubId: data.clubId,
      meetingTitle: data.title,
    });

    const created = await Meeting.create({
      clubId: data.clubId,
      title: data.title,
      description: data.description,
      scheduledAt: data.scheduledAt,
    }, userId);

    return response.success(created, 201);
  } catch (error) {
    return response.error(error);
  }
};