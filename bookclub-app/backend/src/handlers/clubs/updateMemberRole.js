const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error, forbidden } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const { clubId, userId: targetUserId } = event.pathParameters;
    const { role: newRole } = JSON.parse(event.body || '{}');

    if (!clubId || !targetUserId || !newRole) {
      return error('Club ID, User ID, and Role are required', 400);
    }

    if (!['admin', 'member'].includes(newRole)) {
      return error('Invalid role. Must be "admin" or "member"', 400);
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
        return forbidden('Only admins can manage member roles');
      }
    }

    // Check if target user is actually a member
    const isMember = await BookClub.isMember(clubId, targetUserId);
    if (!isMember) {
      return error('Target user is not a member of this club', 400);
    }

    // Prevent demoting the last admin if needed? 
    // Usually, the club creator is also an admin and shouldn't be demoted by others.
    if (newRole === 'member' && targetUserId === club.createdBy) {
      return error('Cannot demote the club creator', 400);
    }

    // Update role
    const updated = await BookClub.updateMemberRole(clubId, targetUserId, newRole);

    return success({ message: 'Role updated successfully', member: updated });
  } catch (err) {
    console.error('Error updating member role:', err);
    return error(err.message || 'Failed to update role', 500);
  }
};
