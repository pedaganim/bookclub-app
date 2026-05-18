const LostFound = require('../../models/lost-found');
const response = require('../../lib/response');
const { withAuth } = require('../../lib/middleware');

const handler = async (event) => {
  try {
    const { userId } = event;

    const qs = event.queryStringParameters || {};
    const limit = Math.min(parseInt(qs.limit || '100', 10), 200);

    const result = await LostFound.listByUser(userId, { limit });
    const items = result.items.map(i => ({ ...i, isOwner: true }));
    return response.success({ items, count: items.length });
  } catch (err) {
    console.error('[LostFound] mine error:', err);
    return response.error(err.message || 'Failed to list your lost & found items', 500);
  }
};

module.exports.handler = withAuth(handler);
