const response = require('../../lib/response');
const Club = require('../../models/club');

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
    if (!data.name) {
      return response.validationError({
        name: 'Club name is required',
      });
    }

    console.log('createClub handler', {
      userId,
      clubName: data.name,
    });

    const created = await Club.create({
      name: data.name,
      description: data.description,
    }, userId);

    return response.success(created, 201);
  } catch (error) {
    return response.error(error);
  }
};