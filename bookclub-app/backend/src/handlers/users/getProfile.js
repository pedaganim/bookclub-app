const User = require('../../models/user');
const response = require('../../lib/response');

module.exports.handler = async (event) => {
  try {
    let userId;
    let claims = null;
    // Prefer Cognito claims when available
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims && event.requestContext.authorizer.claims.sub) {
      claims = event.requestContext.authorizer.claims;
      userId = claims.sub;
    } else {
      // Fallback: parse Bearer token and validate via Cognito (or LocalStorage in offline mode)
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
      if (!token) {
        return response.unauthorized('Missing Authorization header');
      }
      try {
        const user = await User.getCurrentUser(token);
        if (!user) {
          return response.unauthorized('Invalid token');
        }
        userId = user.userId;
      } catch (e) {
        return response.unauthorized('Invalid or expired token');
      }
    }

    let user = await User.getById(userId);
    
    if (!user) {
      // If authenticated via Cognito but user record is missing, create one from claims
      if (claims) {
        user = await User.ensureExistsFromClaims(claims);
      }
      if (!user) {
        return response.notFound('User not found');
      }
    }

    // Return only necessary user data
    const userData = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      bio: user.bio,
      profilePicture: user.profilePicture,
      timezone: user.timezone,
      createdAt: user.createdAt,
    };

    return response.success(userData);
  } catch (error) {
    return response.error(error);
  }
};
