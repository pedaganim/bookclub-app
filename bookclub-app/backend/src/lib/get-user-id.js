const User = require('../models/user');

/**
 * Resolves the authenticated userId from a Lambda event.
 * 1. Tries Cognito authorizer claims (production / API Gateway Cognito authorizer).
 * 2. Falls back to Bearer token in Authorization header (local offline dev, tests).
 *
 * Returns null if no valid identity can be determined.
 */
async function getAuthenticatedUserId(event) {
  const userId =
    event?.requestContext?.authorizer?.claims?.sub ||
    event?.requestContext?.authorizer?.claims?.['cognito:username'];
  if (userId) return userId;

  const authHeader =
    (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : authHeader || null;
  if (!token) return null;

  try {
    const currentUser = await User.getCurrentUser(token);
    return currentUser?.userId || null;
  } catch {
    return null;
  }
}

module.exports = { getAuthenticatedUserId };
