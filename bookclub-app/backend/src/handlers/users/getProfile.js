/**
 * AWS Lambda handler for retrieving user profile information
 * Returns current user's profile data with support for both Cognito and local auth
 */
const User = require('../../models/user');
const response = require('../../lib/response');
const LocalStorage = require('../../lib/local-storage');

/**
 * Lambda handler function for getting user profile
 * @param {Object} event - AWS Lambda event object containing HTTP request data
 * @param {Object} event.requestContext - Request context containing authorizer claims
 * @param {Object} event.requestContext.authorizer.claims - JWT claims (Cognito auth)
 * @param {string} event.requestContext.authorizer.claims.sub - User ID from Cognito
 * @param {Object} event.headers - HTTP headers including Authorization (local auth)
 * @param {string} event.headers.Authorization - Bearer token for local authentication
 * @returns {Promise<Object>} HTTP response with user profile data or error
 */
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
