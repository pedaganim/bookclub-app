const response = require('../../lib/response');
const ClubService = require('../../services/club-service');
const { withUser } = require('../../lib/middleware');

/**
 * Handler for retrieving a single club's details.
 */
const handler = async (event) => {
  const { clubId } = event.pathParameters || {};
  
  if (!clubId) {
    return response.validationError({ message: 'Club ID is required' });
  }

  const result = await ClubService.getById(clubId, event.userId);
  
  return response.success(result);
};

module.exports.handler = withUser(handler);