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

    // Get current user from token
    const authToken = event.headers.Authorization?.replace('Bearer ', '');
    if (!authToken) {
      return error('Authorization token is required', 401);
    }

    let currentUser;
    try {
      currentUser = await User.getCurrentUser(authToken);
    } catch (err) {
      return error('Invalid or expired token', 401);
    }

    if (!currentUser) {
      return error('User not found', 401);
    }

    // Find club by invite code
    const club = await BookClub.getByInviteCode(inviteCode.trim().toUpperCase());
    if (!club) {
      return error('Invalid invite code', 404);
    }

    // Check if user is already a member
    const isMember = await BookClub.isMember(club.clubId, currentUser.userId);
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
    const membership = await BookClub.addMember(club.clubId, currentUser.userId, 'member');

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