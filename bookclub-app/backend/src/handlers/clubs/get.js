const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const { clubId } = event.pathParameters;

    if (!clubId) {
      return error('Club ID is required', 400);
    }

    // Auth: prefer authorizer claims, fallback to token validation (OPTIONAL for public access)
    const claims = event?.requestContext?.authorizer?.claims;
    let userId = claims?.sub;
    if (!userId) {
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader || null;
      if (token && token !== 'null') {
        try {
          const currentUser = await User.getCurrentUser(token);
          if (currentUser) userId = currentUser.userId;
        } catch (err) {
          // If token is present but invalid, we still allow public access, just without identity
          console.warn('Invalid token provided for getClub, falling back to public view');
        }
      }
    }

    // Check if club exists
    const club = await BookClub.getById(clubId);
    if (!club) {
      return error('Club not found', 404);
    }

    // Membership check: only enforced if the club is "Private" (if such a concept exists)
    // For now, we allow public viewing of all clubs, but certain actions/roles require membership
    let isMember = false;
    let userRole = null;
    let userStatus = null;

    if (userId) {
      const memberRecord = await BookClub.getMemberRecord(clubId, userId);
      if (memberRecord) {
        userStatus = memberRecord.status || null;
        isMember = userStatus === 'active';
        userRole = memberRecord.role || null;
      }
    }

    // Return club with user's membership info
    const result = {
      ...club,
      isMember,
      userRole,
      userStatus,
    };

    return success(result);
  } catch (err) {
    console.error('Error getting club:', err);
    return error(err.message || 'Failed to get club', 500);
  }
};