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
      if (token && token !== 'null') {
        try {
          const currentUser = await User.getCurrentUser(token);
          if (currentUser) userId = currentUser.userId;
        } catch (err) {
          console.warn('Invalid token provided for listMembers');
        }
      }
    }

    // Check if club exists
    const club = await BookClub.getById(clubId);
    if (!club) {
      return error('Club not found', 404);
    }

    // Check if user is a member (optional: allow anyone to list members for public clubs?)
    // For now, let's allow anyone to see the member list, but only active members will be returned.
    const allMemberships = await BookClub.getMembers(clubId);
    const activeMemberships = allMemberships.filter(m => m.status === 'active');

    // Enrich with user names/emails
    const enrichedMembers = await Promise.all(activeMemberships.map(async (m) => {
      try {
        const user = await User.getById(m.userId);
        return {
          ...m,
          name: user?.name || 'Unknown User',
          email: user?.email || '',
          profilePicture: user?.profilePicture || null,
        };
      } catch (err) {
        return { ...m, name: 'Unknown User' };
      }
    }));

    return success({ items: enrichedMembers });
  } catch (err) {
    console.error('Error listing members:', err);
    return error(err.message || 'Failed to list members', 500);
  }
};
