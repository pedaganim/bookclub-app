const LostFound = require('../../models/lost-found');
const LocalStorage = require('../../lib/local-storage');
const response = require('../../lib/response');

const deriveUserId = async (event) => {
  if (event?.requestContext?.authorizer?.claims?.sub) return event.requestContext.authorizer.claims.sub;
  const authHeader = (event?.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token && (process.env.IS_OFFLINE === 'true' || process.env.SERVERLESS_OFFLINE === 'true' || process.env.APP_ENV === 'local')) {
    const user = await LocalStorage.verifyToken(token).catch(() => null);
    if (user) return user.userId;
  }
  return null;
};

exports.handler = async (event) => {
  try {
    const userId = await deriveUserId(event);
    if (!userId) return response.unauthorized('Unauthorized');

    const qs = event.queryStringParameters || {};
    const limit = Math.min(parseInt(qs.limit || '100', 10), 200);

    const result = await LostFound.listByUser(userId, { limit });
    return response.success({ items: result.items, count: result.items.length });
  } catch (err) {
    console.error('[LostFound] mine error:', err);
    return response.error(err.message || 'Failed to list your lost & found items', 500);
  }
};
