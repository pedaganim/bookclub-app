const User = require('../models/user');
const LocalStorage = require('./local-storage');

async function getUserFromEvent(event) {
  try {
    let userId;
    let claims = null;
    
    // Prefer Cognito claims when available
    if (event.requestContext && 
        event.requestContext.authorizer && 
        event.requestContext.authorizer.claims && 
        event.requestContext.authorizer.claims.sub) {
      claims = event.requestContext.authorizer.claims;
      userId = claims.sub;
    } else {
      // Fallback for local/offline: parse Bearer token and verify via LocalStorage
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
      if (!token) {
        return null;
      }
      const user = await LocalStorage.verifyToken(token);
      if (!user) {
        return null;
      }
      userId = user.userId;
    }

    let user = await User.getById(userId);
    
    if (!user) {
      // If authenticated via Cognito but user record is missing, create one from claims
      if (claims) {
        user = await User.ensureExistsFromClaims(claims);
      }
      if (!user) {
        return null;
      }
    }

    return user;
  } catch (error) {
    console.error('Error getting user from event:', error);
    return null;
  }
}

module.exports = {
  getUserFromEvent,
};