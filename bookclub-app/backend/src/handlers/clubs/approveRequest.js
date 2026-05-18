const response = require('../../lib/response');
const ClubService = require('../../services/club-service');
const { withClubAdmin } = require('../../lib/middleware');

/**
 * Handler for approving a club join request.
 */
const handler = async (event) => {
  const { clubId, userId: targetUserId } = event.pathParameters || {};
  
  if (!clubId || !targetUserId) {
    return response.validationError({ message: 'clubId and userId are required' });
  }

  const updated = await ClubService.approveRequest(clubId, targetUserId);
  
  return response.success({ approved: true, membership: updated });
};

module.exports.handler = withClubAdmin(handler);
