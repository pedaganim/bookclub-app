const { getAuthenticatedUserId } = require('./get-user-id');
const response = require('./response');
const User = require('../models/user');
const BookClub = require('../models/bookclub');
const logger = require('./logger');

/**
 * Global error handler wrapper for Lambda functions.
 * Catches unhandled exceptions and service-level errors.
 */
const withErrorHandler = (handler) => async (event, context) => {
  try {
    const result = await handler(event, context);
    return result;
  } catch (err) {
    const message = err.message || 'Internal Server Error';
    // Handle Zod validation errors (robust check for ZodError)
    const zodIssues = err.issues || (err.zodError ? err.zodError.errors : null);
    if (Array.isArray(zodIssues) && zodIssues.length > 0) {
      const errors = {};
      zodIssues.forEach((e) => {
        const path = e.path && e.path.length > 0 ? e.path.join('.') : 'message';
        errors[path] = e.message;
      });
      return response.validationError(errors);
    }

    // Parse service-level error prefixes
    if (message.startsWith('VALIDATION_ERROR:')) {
      console.log('[Middleware Debug] Entering VALIDATION_ERROR block');
      const details = message.replace('VALIDATION_ERROR:', '');
      return response.validationError({ message: details });
    }
    if (message.startsWith('NOT_FOUND:')) {
      return response.notFound(message.replace('NOT_FOUND:', ''));
    }
    if (message.startsWith('FORBIDDEN:')) {
      return response.forbidden(message.replace('FORBIDDEN:', ''));
    }
    if (message.startsWith('UNAUTHORIZED:')) {
      return response.unauthorized(message.replace('UNAUTHORIZED:', ''));
    }

    console.error('Unhandled Exception in Middleware:', err);
    logger.error({ err, path: event.path, userId: event.userId }, 'Unhandled Exception');
    return response.error(message, 500);
  }
};

/**
 * Ensures the request is authenticated.
 * Injects event.userId into the handler.
 */
const withAuth = (handler) => withErrorHandler(async (event, context) => {
  const userId = await getAuthenticatedUserId(event);
  if (!userId) return response.unauthorized('Unauthorized');
  
  event.userId = userId;
  return handler(event, context);
});

/**
 * Ensures the request is authenticated and fetches the full user record.
 * Injects event.userId and event.currentUser into the handler.
 */
const withUser = (handler) => withAuth(async (event, context) => {
  const currentUser = await User.getById(event.userId);
  if (!currentUser) return response.notFound('User not found');
  
  event.currentUser = currentUser;
  return handler(event, context);
});

/**
 * Ensures the user has admin or superadmin privileges.
 */
const withAdmin = (handler) => withUser(async (event, context) => {
  const { currentUser } = event;
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
  
  if (!isAdmin) return response.forbidden('Forbidden: Admin access required');
  return handler(event, context);
});

/**
 * Ensures the user is a club admin or superadmin.
 */
const withClubAdmin = (handler) => withUser(async (event, context) => {
  const { userId, currentUser } = event;
  const clubId = event.pathParameters?.clubId;
  
  if (!clubId) return response.validationError({ clubId: 'Club ID is required' });
  
  const isSuperAdmin = currentUser.role === 'superadmin';
  const club = await BookClub.getById(clubId);
  
  if (!club) return response.notFound('Club not found');
  
  const isCreator = club.createdBy === userId;
  const memberRole = await BookClub.getMemberRole(clubId, userId);
  const isClubAdmin = memberRole === 'admin';
  
  if (!isSuperAdmin && !isCreator && !isClubAdmin) {
    return response.forbidden('Forbidden: Club admin access required');
  }
  
  event.club = club;
  return handler(event, context);
});

/**
 * Ensures the user is the club creator or superadmin.
 */
const withClubOwner = (handler) => withUser(async (event, context) => {
  const { userId, currentUser } = event;
  const clubId = event.pathParameters?.clubId;
  
  if (!clubId) return response.validationError({ clubId: 'Club ID is required' });
  
  const isSuperAdmin = currentUser.role === 'superadmin';
  const club = await BookClub.getById(clubId);
  
  if (!club) return response.notFound('Club not found');
  
  const isCreator = club.createdBy === userId;
  
  if (!isSuperAdmin && !isCreator) {
    return response.forbidden('Forbidden: Club owner access required');
  }
  
  event.club = club;
  return handler(event, context);
});

/**
 * Resolves userId if available, but allows unauthenticated requests.
 */
const withOptionalAuth = (handler) => withErrorHandler(async (event, context) => {
  const userId = await getAuthenticatedUserId(event);
  event.userId = userId;
  return handler(event, context);
});

module.exports = {
  withErrorHandler,
  withAuth,
  withUser,
  withAdmin,
  withClubAdmin,
  withClubOwner,
  withOptionalAuth,
};
