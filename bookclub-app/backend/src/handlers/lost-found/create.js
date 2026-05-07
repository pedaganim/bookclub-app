const LostFound = require('../../models/lost-found');
const BookClub = require('../../models/bookclub');
const response = require('../../lib/response');

const deriveUserId = async (event) => {
  if (event?.requestContext?.authorizer?.claims?.sub) {
    return event.requestContext.authorizer.claims.sub;
  }
  const LocalStorage = require('../../lib/local-storage');
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

    const body = JSON.parse(event.body || '{}');
    const { clubId, title, description, itemType, foundLocation, foundDate, images } = body;

    if (!clubId) return response.error('clubId is required', 400);
    if (!title || !title.trim()) return response.error('title is required', 400);

    const isMember = await BookClub.isMember(clubId, userId);
    if (!isMember) return response.forbidden('You must be an active club member to post Lost & Found items');

    const item = await LostFound.create({ clubId, title, description, itemType, foundLocation, foundDate, images }, userId);
    return response.success(item, 201);
  } catch (err) {
    console.error('[LostFound] create error:', err);
    return response.error(err.message || 'Failed to create lost & found item', 500);
  }
};
