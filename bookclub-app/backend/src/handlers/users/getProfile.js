const User = require('../../models/user');
const response = require('../../lib/response');
const LocalStorage = require('../../lib/local-storage');

module.exports.handler = async (event) => {
  try {
    let userId;
    // Prefer Cognito claims when available
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims && event.requestContext.authorizer.claims.sub) {
      userId = event.requestContext.authorizer.claims.sub;
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

    const user = await User.getById(userId);
    
    if (!user) {
      return response.notFound('User not found');
    }

    // Return only necessary user data
    const userData = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      bio: user.bio,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
    };

    return response.success(userData);
  } catch (error) {
    return response.error(error);
  }
};
