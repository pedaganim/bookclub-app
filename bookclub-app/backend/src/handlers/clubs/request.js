const { success, error } = require('../../lib/response');
const User = require('../../models/user');
const BookClub = require('../../models/bookclub');
const { sendEmailIfEnabled } = require('../../lib/notification-service');
const { withAuth } = require('../../lib/middleware');

const handler = async (event) => {
  try {
    const clubId = event?.pathParameters?.clubId;
    if (!clubId) return error('clubId is required', 400);

    const { userId } = event;

    const club = await BookClub.getById(clubId);
    if (!club) return error('Club not found', 404);

    const reqRecord = await BookClub.createJoinRequest(clubId, userId);

    try {
      const ownerId = club.createdBy;
      if (ownerId && ownerId !== userId) {
        const requester = await User.getById(userId).catch(() => null);
        const baseUrl = process.env.SITE_BASE_URL;
        const reviewUrl = `${baseUrl}/clubs/${clubId}/requests`;
        await sendEmailIfEnabled(ownerId, 'new_member_in_your_club', 'club_join_request', {
          requesterName: requester?.name || 'A user',
          requesterEmail: requester?.email || '',
          clubName: club?.name || 'your club',
          reviewUrl,
        });
      }
    } catch (notifyErr) {
      console.warn('[clubs][request] Failed to notify owner of join request', notifyErr?.message || notifyErr);
    }

    return success({ status: 'pending', request: reqRecord });
  } catch (e) {
    if (e && e.code === 'AlreadyMember') {
      return success({ status: 'active' });
    }
    return error(e.message || 'Failed to request to join club', 500);
  }
};

module.exports.handler = withAuth(handler);
