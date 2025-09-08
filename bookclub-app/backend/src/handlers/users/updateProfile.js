const User = require('../../models/user');
const response = require('../../lib/response');
const LocalStorage = require('../../lib/local-storage');

module.exports.handler = async (event) => {
  try {
    let userId;
    let claims = null;
    // Prefer Cognito claims when available
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims && event.requestContext.authorizer.claims.sub) {
      claims = event.requestContext.authorizer.claims;
      userId = claims.sub;
    } else {
      // Fallback for local/offline: parse Bearer token and verify via LocalStorage
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
      if (!token) {
        return response.unauthorized('Missing Authorization header');
      }
      const user = await LocalStorage.verifyToken(token);
      if (!user) {
        return response.unauthorized('Invalid token');
      }
      userId = user.userId;
    }

    const data = JSON.parse(event.body);

    // Validate input - only allow certain fields to be updated
    const allowedUpdates = ['name', 'bio', 'profilePicture', 'timezone'];
    const updates = {};

    Object.keys(data).forEach(key => {
      if (allowedUpdates.includes(key) && data[key] !== undefined) {
        updates[key] = data[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return response.validationError({
        message: 'No valid fields to update',
      });
    }

    // Validate timezone if provided
    if (updates.timezone) {
      const validTimezones = Intl.supportedValuesOf('timeZone');
      if (!validTimezones.includes(updates.timezone)) {
        return response.validationError({
          timezone: 'Invalid timezone',
        });
      }
    }

    const updatedUser = await User.update(userId, updates);
    
    if (!updatedUser) {
      return response.notFound('User not found');
    }

    // Return only necessary user data
    const userData = {
      userId: updatedUser.userId,
      email: updatedUser.email,
      name: updatedUser.name,
      bio: updatedUser.bio,
      profilePicture: updatedUser.profilePicture,
      timezone: updatedUser.timezone,
      createdAt: updatedUser.createdAt,
    };

    return response.success(userData);
  } catch (error) {
    console.error('Error updating profile:', error);
    return response.error(error);
  }
};