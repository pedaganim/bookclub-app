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
    const qs = event.queryStringParameters || {};
    const { clubId, status, search, nextToken } = qs;
    const limit = Math.min(parseInt(qs.limit || '50', 10), 100);

    if (!clubId) return response.error('clubId is required', 400);

    const userId = await deriveUserId(event);

    const result = await LostFound.listByClub(clubId, { limit, nextToken: nextToken || null, status: status || null, search: search || null });

    // Enrich with poster name
    const User = require('../../models/user');
    const userIds = [...new Set(result.items.map(i => i.userId))];
    const userMap = {};
    await Promise.all(userIds.map(async (uid) => {
      try {
        const u = await User.getById(uid);
        userMap[uid] = u ? u.name : null;
      } catch { userMap[uid] = null; }
    }));

    const items = result.items.map(i => ({ ...i, postedByName: userMap[i.userId] || null, isOwner: userId === i.userId }));

    return response.success({ items, nextToken: result.nextToken, count: items.length });
  } catch (err) {
    console.error('[LostFound] list error:', err);
    return response.error(err.message || 'Failed to list lost & found items', 500);
  }
};
