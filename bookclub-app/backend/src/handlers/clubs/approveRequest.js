const response = require('../../lib/response');
const ClubService = require('../../services/club-service');
const BookClub = require('../../models/bookclub');
const { sendEmailIfEnabled } = require('../../lib/notification-service');
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

  try {
    const club = await BookClub.getById(clubId);
    const baseUrl = process.env.SITE_BASE_URL || '';
    const clubUrl = `${baseUrl}/clubs/${clubId}`;
    await sendEmailIfEnabled(targetUserId, 'club_join_approved', 'club_join_approved', {
      clubName: club?.name || 'your club',
      clubUrl,
    });
  } catch (notifyErr) {
    console.warn('[clubs][approveRequest] Failed to notify user of join approval', notifyErr?.message || notifyErr);
  }
  
  return response.success({ approved: true, membership: updated });
};

module.exports.handler = withClubAdmin(handler);
