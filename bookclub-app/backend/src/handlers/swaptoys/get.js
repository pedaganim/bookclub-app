const { success, error } = require('../../lib/response');
const ToyListing = require('../../models/toyListing');

exports.handler = async (event) => {
  try {
    const listingId = event.pathParameters?.listingId;
    if (!listingId) {
      return error('listingId is required', 400);
    }

    const listing = await ToyListing.getById(listingId);
    if (!listing) {
      return error('Listing not found', 404);
    }

    return success(listing);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[SwapToys][get] Error:', e);
    return error('Failed to get toy listing', 500);
  }
};
