const response = require('../../lib/response');
const ClubService = require('../../services/club-service');
const { withAuth } = require('../../lib/middleware');

/**
 * Handler for listing clubs that the authenticated user belongs to.
 */
const handler = async (event) => {
  const clubs = await ClubService.listUserClubs(event.userId);

  return response.success({
    items: clubs,
    count: clubs.length,
  });
};

module.exports.handler = withAuth(handler);