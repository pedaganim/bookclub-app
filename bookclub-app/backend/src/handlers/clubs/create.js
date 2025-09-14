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

    // Auth: prefer claims, fallback to token validation
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

    // Create the club
    const clubData = {
      name: name.trim(),
      description: description?.trim() || '',
      location: location.trim(),
      isPrivate: !!isPrivate,
      memberLimit: memberLimit || null,
    };

    const club = await BookClub.create(clubData, userId);

    return success(club);
  } catch (err) {
    console.error('Error creating club:', err);
    return error(err.message || 'Failed to create club', 500);
  }
};