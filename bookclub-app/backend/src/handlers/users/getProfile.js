const User = require('../../models/user');
const response = require('../../lib/response');

module.exports.handler = async (event) => {
  try {
    let userId;
    let claims = null;
    // Prefer Cognito claims when available (typical for ID tokens)
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims && event.requestContext.authorizer.claims.sub) {
      claims = event.requestContext.authorizer.claims;
      userId = claims.sub;
    } else {
      // Fallback: parse token from Authorization header (handles both 'Bearer ' prefix and raw tokens)
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      let token = null;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice('Bearer '.length);
      } else if (authHeader.length > 0) {
        token = authHeader; // Assume raw token
      }
      
      if (!token) {
        return response.unauthorized('Missing Authorization header');
      }

      try {
        const currentUser = await User.getCurrentUser(token);
        if (!currentUser) {
          return response.unauthorized('Invalid or expired token');
        }
        userId = currentUser.userId;
        // If we got a user but they aren't in Dynamo yet (though getCurrentUser does a lookup),
        // we handle the missing record below.
      } catch (e) {
        console.error('Auth fallback failed:', e.message);
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
