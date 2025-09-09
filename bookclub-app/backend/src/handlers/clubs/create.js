const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const { name, description, location, isPrivate, memberLimit } = JSON.parse(event.body);

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return error('Club name is required', 400);
    }

    if (!location || location.trim().length === 0) {
      return error('Location is required', 400);
    }

    if (location.length > 100) {
      return error('Location must be 100 characters or less', 400);
    }

    if (name.length > 100) {
      return error('Club name must be 100 characters or less', 400);
    }

    if (description && description.length > 500) {
      return error('Club description must be 500 characters or less', 400);
    }

    if (memberLimit && (memberLimit < 2 || memberLimit > 1000)) {
      return error('Member limit must be between 2 and 1000', 400);
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

    // Create the club
    const clubData = {
      name: name.trim(),
      description: description?.trim() || '',
      location: location.trim(),
      isPrivate: !!isPrivate,
      memberLimit: memberLimit || null,
    };

    const club = await BookClub.create(clubData, currentUser.userId);

    return success(club);
  } catch (err) {
    console.error('Error creating club:', err);
    return error(err.message || 'Failed to create club', 500);
  }
};