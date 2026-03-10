const { success, error } = require('../../lib/response');
const ToyListing = require('../../models/toyListing');

const ALLOWED_CONDITIONS = ['new', 'like_new', 'good', 'fair'];
const ALLOWED_CATEGORIES = ['books', 'outdoor', 'educational', 'dolls', 'vehicles', 'other'];
const ALLOWED_STATUSES = ['available', 'swapped'];
const ALLOWED_FIELDS = ['title', 'description', 'condition', 'category', 'images', 'status', 'location', 'wantInReturn'];

exports.handler = async (event) => {
  try {
    const userId =
      event.requestContext?.authorizer?.claims?.sub ||
      event.requestContext?.authorizer?.claims?.['cognito:username'];

    if (!userId) {
      return error('Unauthorized', 401);
    }

    const listingId = event.pathParameters?.listingId;
    if (!listingId) {
      return error('listingId is required', 400);
    }

    let body = {};
    try {
      if (event.body) body = JSON.parse(event.body);
    } catch (_) {
      return error('Invalid JSON body', 400);
    }

    // Validate updatable fields
    const validationErrors = {};
    if (body.condition !== undefined && !ALLOWED_CONDITIONS.includes(body.condition)) {
      validationErrors.condition = `Condition must be one of: ${ALLOWED_CONDITIONS.join(', ')}`;
    }
    if (body.category !== undefined && body.category !== null && !ALLOWED_CATEGORIES.includes(body.category)) {
      validationErrors.category = `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`;
    }
    if (body.status !== undefined && !ALLOWED_STATUSES.includes(body.status)) {
      validationErrors.status = `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`;
    }

    if (Object.keys(validationErrors).length > 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', errors: validationErrors },
        }),
      };
    }

    // Only permit known fields
    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const updated = await ToyListing.update(listingId, userId, updates);
    return success(updated);
  } catch (e) {
    if (e.message && (e.message.includes('permission') || e.message.includes('authorised'))) {
      return error(e.message, 403);
    }
    if (e.message && e.message.includes('not found')) {
      return error(e.message, 404);
    }
    // eslint-disable-next-line no-console
    console.error('[SwapToys][update] Error:', e);
    return error('Failed to update toy listing', 500);
  }
};
