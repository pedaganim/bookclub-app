const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const { inviteCode } = JSON.parse(event.body);

    // Validate required fields
    if (!inviteCode || inviteCode.trim().length === 0) {
      return error('Invite code is required', 400);
    }

    // Auth: prefer authorizer claims, fallback to token validation
    const claims = event?.requestContext?.authorizer?.claims;
    let userId = claims?.sub;
    if (!userId) {
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader || null;
      if (!token) return error('Authorization token is required', 401);
      try {
        const currentUser = await User.getCurrentUser(token);
        if (!currentUser) return error('User not found', 401);
        userId = currentUser.userId;
      } catch (err) {
        return error('Invalid or expired token', 401);
      }
    }

    // Find club by invite code
    const club = await BookClub.getByInviteCode(inviteCode.trim().toUpperCase());
    if (!club) {
      return error('Invalid invite code', 404);
    }

    // Check if user is already a member
    const isMember = await BookClub.isMember(club.clubId, userId);
    if (isMember) {
      return error('You are already a member of this club', 400);
    }

    // Check member limit
    if (club.memberLimit) {
      const members = await BookClub.getMembers(club.clubId);
      if (members.length >= club.memberLimit) {
        return error('This club has reached its member limit', 400);
      }
    }

    // Add user as member
    const membership = await BookClub.addMember(club.clubId, userId, 'member');

    // Return club with user's role
    const result = {
      ...club,
      userRole: membership.role,
      joinedAt: membership.joinedAt,
    };

    return success(result);
  } catch (err) {
    console.error('Error joining club:', err);
    return error(err.message || 'Failed to join club', 500);
  }
};