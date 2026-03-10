const { success, error } = require('../../lib/response');
const ToyListing = require('../../models/toyListing');

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

    await ToyListing.delete(listingId, userId);
    return success({ deleted: true });
  } catch (e) {
    if (e.message && (e.message.includes('permission') || e.message.includes('authorised'))) {
      return error(e.message, 403);
    }
    if (e.message && e.message.includes('not found')) {
      return error(e.message, 404);
    }
    // eslint-disable-next-line no-console
    console.error('[SwapToys][delete] Error:', e);
    return error('Failed to delete toy listing', 500);
  }
};
