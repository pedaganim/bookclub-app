const response = require('../../lib/response');
const ClubService = require('../../services/club-service');
const { withUser } = require('../../lib/middleware');

/**
 * Handler for listing members of a club.
 */
const handler = async (event) => {
  const { clubId } = event.pathParameters || {};
  
  if (!clubId) {
    return response.validationError({ message: 'Club ID is required' });
  }

  const members = await ClubService.listMembers(clubId);
  
  return response.success({ items: members });
};

module.exports.handler = withUser(handler);
