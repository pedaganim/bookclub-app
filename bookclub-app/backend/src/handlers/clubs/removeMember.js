const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error, forbidden } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const { clubId, userId: targetUserId } = event.pathParameters;

    if (!clubId || !targetUserId) {
      return error('Club ID and User ID are required', 400);
    }

    // Auth: prefer authorizer claims
    const claims = event?.requestContext?.authorizer?.claims;
    let requesterId = claims?.sub;
    if (!requesterId) {
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader || null;
      if (!token) return error('Authorization token is required', 401);
      try {
        const currentUser = await User.getCurrentUser(token);
        if (!currentUser) return error('User not found', 401);
        requesterId = currentUser.userId;
      } catch (err) {
        return error('Invalid or expired token', 401);
      }
    }

    // Check if club exists
    const club = await BookClub.getById(clubId);
    if (!club) {
      return error('Club not found', 404);
    }

    // Check if requester is a superadmin or club admin
    const requesterUser = await User.getById(requesterId);
    const isSuperAdmin = requesterUser?.role === 'superadmin';
    if (!isSuperAdmin) {
      const requesterRole = await BookClub.getMemberRole(clubId, requesterId);
      if (requesterRole !== 'admin') {
        return forbidden('Only admins can remove members');
      }
    }

    // Prevent removing yourself (should use /leave instead)
    if (requesterId === targetUserId) {
      return error('Cannot remove yourself. Use the leave option instead.', 400);
    }

    // Check if target user is actually a member
    const isMember = await BookClub.isMember(clubId, targetUserId);
    if (!isMember) {
      return error('Target user is not a member of this club', 400);
    }

    // Remove user from club
    await BookClub.removeMember(clubId, targetUserId);

    return success({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Error removing member:', err);
    return error(err.message || 'Failed to remove member', 500);
  }
};
