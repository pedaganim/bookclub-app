const LostFound = require('../../models/lost-found');
const BookClub = require('../../models/bookclub');
const response = require('../../lib/response');
const { withAuth } = require('../../lib/middleware');

const handler = async (event) => {
  try {
    const { userId } = event;
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

module.exports.handler = withAuth(handler);
