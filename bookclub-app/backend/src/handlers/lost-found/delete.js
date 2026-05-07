const LostFound = require('../../models/lost-found');
const BookClub = require('../../models/bookclub');
const response = require('../../lib/response');

const deriveUserId = async (event) => {
  if (event?.requestContext?.authorizer?.claims?.sub) return event.requestContext.authorizer.claims.sub;
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

    const { lostFoundId } = event.pathParameters || {};
    if (!lostFoundId) return response.error('lostFoundId is required', 400);

    const existing = await LostFound.getById(lostFoundId);
    if (!existing) return response.notFound('Item not found');

    const memberRecord = await BookClub.getMemberRecord(existing.clubId, userId);
    const userRole = memberRecord ? (memberRecord.role || 'member') : null;

    await LostFound.delete(lostFoundId, userId, userRole);
    return response.success({ deleted: true });
  } catch (err) {
    if (err.message === 'FORBIDDEN') return response.forbidden('You do not have permission to delete this item');
    console.error('[LostFound] delete error:', err);
    return response.error(err.message || 'Failed to delete item', 500);
  }
};
