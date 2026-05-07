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
    const email = decodeURIComponent(event?.pathParameters?.email || '');
    if (!clubId || !email) return error('clubId and email are required', 400);

    const userId = await getUserId(event);
    if (!userId) return error('Authorization required', 401);

    const club = await BookClub.getById(clubId);
    if (!club) return error('Club not found', 404);

    const member = await BookClub.getMemberRecord(clubId, userId);
    if (!member || member.status !== 'active' || (member.role !== 'admin' && club.createdBy !== userId)) {
      return forbidden('Only club admins can revoke invites');
    }

    await BookClub.revokeEmailInvite(clubId, email);
    return success({ revoked: true });
  } catch (err) {
    console.error('[clubs][revokeInvite] error:', err);
    return error(err.message || 'Failed to revoke invite', 500);
  }
};
