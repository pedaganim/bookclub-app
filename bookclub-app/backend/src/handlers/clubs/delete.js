const response = require('../../lib/response');
const ClubService = require('../../services/club-service');
const { withClubOwner } = require('../../lib/middleware');

/**
 * Handler for deleting a club.
 * Only the club owner (creator) or superadmin can delete a club.
 */
const handler = async (event) => {
  const { clubId } = event.pathParameters || {};
  if (!clubId) return response.validationError({ message: 'Club ID is required' });

  await ClubService.delete(clubId);
  return response.success({ deleted: true });
};

module.exports.handler = withClubOwner(handler);
module.exports.rawHandler = handler;
