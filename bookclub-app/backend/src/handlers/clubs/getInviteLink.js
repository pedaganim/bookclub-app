const { success, error } = require('../../lib/response');
const User = require('../../models/user');
const BookClub = require('../../models/bookclub');

exports.handler = async (event) => {
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return error('Missing authorization token', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const currentUser = await User.getCurrentUser(token);

    if (!currentUser) {
      return error('User not found', 404);
    }

    const { clubId } = event.pathParameters || {};

    if (!clubId) {
      return error('Club ID is required', 400);
    }

    // Verify user is a member of the club
    const isMember = await BookClub.isMember(clubId, currentUser.userId);
    if (!isMember) {
      return error('You must be a member of this club to generate invite links', 403);
    }

    // Get club details
    const club = await BookClub.getById(clubId);
    if (!club) {
      return error('Club not found', 404);
    }

    // Generate invite URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite/${club.inviteCode}`;

    return success({ 
      inviteCode: club.inviteCode,
      inviteUrl
    });
  } catch (err) {
    console.error('Error generating invite link:', err);
    return error(err.message || 'Failed to generate invite link', 500);
  }
};
