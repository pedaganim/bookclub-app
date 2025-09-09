const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const { clubId } = event.pathParameters;

    if (!clubId) {
      return error('Club ID is required', 400);
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

    // Check if club exists
    const club = await BookClub.getById(clubId);
    if (!club) {
      return error('Club not found', 404);
    }

    // Check if user is a member
    const isMember = await BookClub.isMember(clubId, currentUser.userId);
    if (!isMember) {
      return error('You are not a member of this club', 403);
    }

    // Get user's role in the club
    const userRole = await BookClub.getMemberRole(clubId, currentUser.userId);

    // Return club with user's role
    const result = {
      ...club,
      userRole,
    };

    return success(result);
  } catch (err) {
    console.error('Error getting club:', err);
    return error(err.message || 'Failed to get club', 500);
  }
};