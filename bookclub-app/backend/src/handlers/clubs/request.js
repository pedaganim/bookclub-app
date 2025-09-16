const { success, error } = require('../../lib/response');
const User = require('../../models/user');
const BookClub = require('../../models/bookclub');

// --- Handler (top) ---
exports.handler = async (event) => {
  try {
    const clubId = getClubId(event);
    if (!clubId) return error('clubId is required', 400);

    const userId = await getUserIdFromEventOrToken(event);
    if (!userId) return error('Authorization token is required', 401);

    const club = await BookClub.getById(clubId);
    if (!club) return error('Club not found', 404);
    if (!club.isPrivate) {
      const membership = await BookClub.addMember(clubId, userId, 'member');
      return success({ status: 'active', membership });
    }

    const reqRecord = await BookClub.createJoinRequest(clubId, userId);
    return success({ status: 'pending', request: reqRecord });
  } catch (e) {
    if (e && e.code === 'AlreadyMember') {
      return success({ status: 'active' });
    }
    return error(e.message || 'Failed to request to join club', 500);
  }
};

// --- Helpers ---
const getClubId = (event) => event?.pathParameters?.clubId || null;

const getUserIdFromEventOrToken = async (event) => {
  const claims = event?.requestContext?.authorizer?.claims;
  let userId = claims?.sub;
  if (userId) return userId;
  const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader || null;
  if (!token) return null;
  try {
    const currentUser = await User.getCurrentUser(token);
    return currentUser?.userId || null;
  } catch {
    return null;
  }
};
