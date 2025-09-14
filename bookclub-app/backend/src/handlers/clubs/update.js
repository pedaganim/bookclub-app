const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const { clubId } = event.pathParameters || {};
    if (!clubId) {
      return error('clubId is required in path', 400);
    }

    if (!event.body) {
      return error('Request body is required', 400);
    }

    const payload = JSON.parse(event.body);

    // Allowed updatable fields
    const allowed = ['name', 'description', 'location', 'isPrivate', 'memberLimit'];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        updates[key] = payload[key];
      }
    }

    // Basic validation mirroring create
    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.trim().length === 0) {
        return error('Club name must be a non-empty string', 400);
      }
      if (updates.name.length > 100) {
        return error('Club name must be 100 characters or less', 400);
      }
      updates.name = updates.name.trim();
    }

    if (updates.description !== undefined) {
      if (typeof updates.description !== 'string') {
        return error('Description must be a string', 400);
      }
      if (updates.description.length > 500) {
        return error('Club description must be 500 characters or less', 400);
      }
      updates.description = updates.description.trim();
    }

    if (updates.location !== undefined) {
      if (typeof updates.location !== 'string' || updates.location.trim().length === 0) {
        return error('Location must be a non-empty string', 400);
      }
      if (updates.location.length > 100) {
        return error('Location must be 100 characters or less', 400);
      }
      updates.location = updates.location.trim();
    }

    if (updates.isPrivate !== undefined) {
      updates.isPrivate = !!updates.isPrivate;
    }

    if (updates.memberLimit !== undefined) {
      if (updates.memberLimit !== null && (typeof updates.memberLimit !== 'number' || updates.memberLimit < 2 || updates.memberLimit > 1000)) {
        return error('Member limit must be a number between 2 and 1000 (or null)', 400);
      }
    }

    // Authn / Authz: prefer claims, fallback to token validation
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

    const club = await BookClub.getById(clubId);
    if (!club) {
      return error('Club not found', 404);
    }

    if (club.createdBy !== userId) {
      return error('Only the club creator can update this club', 403);
    }

    // Perform update
    const updated = await BookClub.update(clubId, updates);
    return success(updated);
  } catch (err) {
    console.error('Error updating club:', err);
    return error(err.message || 'Failed to update club', 500);
  }
};
