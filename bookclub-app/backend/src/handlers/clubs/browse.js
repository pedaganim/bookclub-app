const { success, error } = require('../../lib/response');
const BookClub = require('../../models/bookclub');

module.exports.handler = async (event) => {
  try {
    const qs = event?.queryStringParameters || {};
    const limit = qs && qs.limit ? parseInt(qs.limit, 10) : 10;
    const nextToken = qs && typeof qs.nextToken === 'string' ? qs.nextToken : null;
    const search = qs && typeof qs.search === 'string' ? qs.search : null;

    const result = await BookClub.listPublicClubs(limit, nextToken, search);
    return success({ items: result.items, nextToken: result.nextToken || null });
  } catch (e) {
    return error(e.message || 'Failed to browse clubs', 500);
  }
};
