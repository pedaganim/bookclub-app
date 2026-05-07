const LostFound = require('../../models/lost-found');
const LocalStorage = require('../../lib/local-storage');
const response = require('../../lib/response');
const User = require('../../models/user');
const BookClub = require('../../models/bookclub');

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
    const { lostFoundId } = event.pathParameters || {};
    
    if (!lostFoundId) return response.error('lostFoundId is required', 400);

    const item = await LostFound.getById(lostFoundId);
    if (!item) return response.notFound('Lost & Found item not found');

    // Fetch poster's name
    let postedByName = null;
    try {
      const u = await User.getById(item.userId);
      if (u) postedByName = u.name;
    } catch (e) {
      console.warn('Could not fetch poster name', e);
    }

    // Set permissions
    const isOwner = userId === item.userId;

    return response.success({
      ...item,
      postedByName,
      isOwner,
    });

  } catch (err) {
    console.error('[LostFound] get error:', err);
    return response.error(err.message || 'Failed to get lost & found item', 500);
  }
};
