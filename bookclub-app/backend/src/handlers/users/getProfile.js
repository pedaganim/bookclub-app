const User = require('../../models/user');
const response = require('../../lib/response');

module.exports.handler = async (event) => {
  console.log('[getUserProfile] Handler invoked');
  try {
    let userId;
    let claims = null;
    
    // Log authorizer presence
    if (event.requestContext && event.requestContext.authorizer) {
      console.log('[getUserProfile] Authorizer present');
      if (event.requestContext.authorizer.claims) {
        console.log('[getUserProfile] Claims present:', JSON.stringify(event.requestContext.authorizer.claims));
      } else {
        console.log('[getUserProfile] No claims in authorizer');
      }
    } else {
      console.log('[getUserProfile] No authorizer in requestContext');
    }

    // Prefer Cognito claims when available (typical for ID tokens)
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims && event.requestContext.authorizer.claims.sub) {
      claims = event.requestContext.authorizer.claims;
      userId = claims.sub;
      console.log('[getUserProfile] Found userId from claims:', userId);
    } else {
      console.log('[getUserProfile] Attempting fallback to Authorization header');
      // Fallback: parse token from Authorization header (handles both 'Bearer ' prefix and raw tokens)
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      console.log('[getUserProfile] Auth header present:', !!authHeader);
      
      let token = null;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice('Bearer '.length);
        console.log('[getUserProfile] Extracted Bearer token');
      } else if (authHeader.length > 0) {
        token = authHeader; // Assume raw token
        console.log('[getUserProfile] Using raw token from header');
      }
      
      if (!token) {
        console.log('[getUserProfile] No token found in header');
        return response.unauthorized('Missing Authorization header');
      }

      try {
        console.log('[getUserProfile] Calling User.getCurrentUser with token');
        const currentUser = await User.getCurrentUser(token);
        if (!currentUser) {
          console.log('[getUserProfile] User.getCurrentUser returned null');
          return response.unauthorized('Invalid or expired token');
        }
        userId = currentUser.userId;
        console.log('[getUserProfile] Found userId from token fallback:', userId);
      } catch (e) {
        console.error('[getUserProfile] Auth fallback failed error:', e.message);
        return response.unauthorized('Invalid or expired token');
      }
    }

    console.log('[getUserProfile] Fetching user from DynamoDB with userId:', userId);
    let user = await User.getById(userId);
    
    if (!user) {
      console.log('[getUserProfile] User record not found in DynamoDB');
      // If authenticated via Cognito but user record is missing, create one from claims
      if (claims) {
        console.log('[getUserProfile] Attempting to ensure user exists from claims');
        user = await User.ensureExistsFromClaims(claims);
      }
      if (!user) {
        console.log('[getUserProfile] User still not found, returning 404');
        return response.notFound('User not found');
      }
    }

    console.log('[getUserProfile] Returning success for user:', user.email);
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
