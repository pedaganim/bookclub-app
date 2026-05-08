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
      return forbidden('Only club admins can invite members');
    }

    const body = JSON.parse(event.body || '{}');
    const rawEmails = body.emails;
    if (!rawEmails || !Array.isArray(rawEmails) || rawEmails.length === 0) {
      return error('emails array is required', 400);
    }

    // Basic email validation — filter out clearly invalid ones
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = [];
    const invalid = [];
    for (const e of rawEmails) {
      const trimmed = (e || '').trim().toLowerCase();
      if (EMAIL_RE.test(trimmed)) valid.push(trimmed);
      else if (trimmed) invalid.push(trimmed);
    }

    if (valid.length === 0) return error('No valid email addresses provided', 400);

    const invited = await BookClub.addEmailInvites(clubId, valid, userId);

    return success({ invited: invited.length, invalid, emails: invited }, 200);
  } catch (err) {
    console.error('[clubs][inviteMembers] error:', err);
    return error(err.message || 'Failed to invite members', 500);
  }
};
