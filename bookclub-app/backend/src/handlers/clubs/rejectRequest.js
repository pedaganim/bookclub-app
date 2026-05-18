const response = require('../../lib/response');
const ClubService = require('../../services/club-service');
const { withClubAdmin } = require('../../lib/middleware');

/**
 * Handler for rejecting a club join request.
 */
const handler = async (event) => {
  const { clubId, userId: targetUserId } = event.pathParameters || {};
  
  if (!clubId || !targetUserId) {
    return response.validationError({ message: 'clubId and userId are required' });
  }

  await ClubService.rejectRequest(clubId, targetUserId);
  
  return response.success({ rejected: true });
};

module.exports.handler = withClubAdmin(handler);
