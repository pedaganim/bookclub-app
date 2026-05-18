const { success, error } = require('../../lib/response');
const User = require('../../models/user');
const BookClub = require('../../models/bookclub');
const { withClubAdmin } = require('../../lib/middleware');

const handler = async (event) => {
  try {
    const clubId = event?.pathParameters?.clubId;
    if (!clubId) return error('clubId is required', 400);

    const pending = await BookClub.listPendingRequests(clubId).catch((e) => {
      console.error('listRequests: listPendingRequests failed', { clubId, error: e?.message });
      throw e;
    });

    // Enrich with requester profile (name/email) for better admin UX
    const enriched = await Promise.all((pending || []).map(async (p) => {
      try {
        const u = await User.getById(p.userId);
        return { ...p, name: u?.name || undefined, email: u?.email || undefined };
      } catch {
        return p;
      }
    }));
    return success({ items: enriched });
  } catch (e) {
    console.error('listRequests: unexpected error', e);
    return error(e.message || 'Failed to list join requests', 500);
  }
};

module.exports.handler = withClubAdmin(handler);
