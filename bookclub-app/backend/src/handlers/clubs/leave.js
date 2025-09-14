const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const { clubId } = event.pathParameters;

    if (!clubId) {
      return error('Club ID is required', 400);
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

    // Check if club exists
    const club = await BookClub.getById(clubId);
    if (!club) {
      return error('Club not found', 404);
    }

    // Check if user is a member
    const isMember = await BookClub.isMember(clubId, userId);
    if (!isMember) {
      return error('You are not a member of this club', 400);
    }

    // Check if user is the creator/admin and is the only member
    const userRole = await BookClub.getMemberRole(clubId, userId);
    const members = await BookClub.getMembers(clubId);

    if (userRole === 'admin' && members.length === 1) {
      // If admin is the only member, delete the entire club
      await BookClub.delete(clubId);
      return success({ message: 'Club deleted successfully' });
    } else if (userRole === 'admin' && members.length > 1) {
      // If admin but not the only member, need to transfer ownership or prevent leaving
      return error('As the club admin, you must transfer ownership or delete the club before leaving', 400);
    }

    // Remove user from club
    await BookClub.removeMember(clubId, userId);

    return success({ message: 'Left club successfully' });
  } catch (err) {
    console.error('Error leaving club:', err);
    return error(err.message || 'Failed to leave club', 500);
  }
};