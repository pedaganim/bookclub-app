const { success, error } = require('../../lib/response');
const ToyListing = require('../../models/toyListing');

exports.handler = async (event) => {
  try {
    const limit = Math.min(parseInt(event.queryStringParameters?.limit || '20', 10), 100);
    const nextToken = event.queryStringParameters?.nextToken || null;
    const userId = event.queryStringParameters?.userId || null;
    const libraryType = event.queryStringParameters?.libraryType || null;

    let result;
    if (userId) {
      result = await ToyListing.listByUser(userId, limit, nextToken);
      // Client-side filter by libraryType if provided
      if (libraryType && result.items) {
        result.items = result.items.filter((item) => item.libraryType === libraryType);
      }
    } else {
      result = await ToyListing.listAll(limit, nextToken);
      // Client-side filter by libraryType if provided
      if (libraryType && result.items) {
        result.items = result.items.filter((item) => item.libraryType === libraryType);
      }
    }

    return success(result);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[SwapToys][list] Error:', e);
    return error('Failed to list toy listings', 500);
  }
};
