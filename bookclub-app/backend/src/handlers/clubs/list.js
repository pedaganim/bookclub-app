const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error } = require('../../lib/response');

exports.handler = async (event) => {
  try {
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

    // Get user's clubs
    const clubs = await BookClub.getUserClubs(currentUser.userId);

    return success({
      items: clubs,
      count: clubs.length,
    });
  } catch (err) {
    console.error('Error listing user clubs:', err);
    return error(err.message || 'Failed to list clubs', 500);
  }
};