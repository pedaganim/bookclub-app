const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error, forbidden } = require('../../lib/response');

const getUserId = async (event) => {
  if (event?.requestContext?.authorizer?.claims?.sub) return event.requestContext.authorizer.claims.sub;
  const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try { return (await User.getCurrentUser(token))?.userId || null; } catch { return null; }
};

exports.handler = async (event) => {
  try {
    const clubId = event?.pathParameters?.clubId;
    if (!clubId) return error('clubId is required', 400);

    const userId = await getUserId(event);
    if (!userId) return error('Authorization required', 401);

    const club = await BookClub.getById(clubId);
    if (!club) return error('Club not found', 404);

    const member = await BookClub.getMemberRecord(clubId, userId);
    if (!member || member.status !== 'active' || (member.role !== 'admin' && club.createdBy !== userId)) {
      return forbidden('Only club admins can view invites');
    }

    const invites = await BookClub.listEmailInvites(clubId);
    return success({ items: invites, count: invites.length });
  } catch (err) {
    console.error('[clubs][listInvites] error:', err);
    return error(err.message || 'Failed to list invites', 500);
  }
};
