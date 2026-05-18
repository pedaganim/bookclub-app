const LostFound = require('../../models/lost-found');
const BookClub = require('../../models/bookclub');
const response = require('../../lib/response');
const { publishEvent } = require('../../lib/event-bus');
const { withAuth } = require('../../lib/middleware');

const handler = async (event) => {
  try {
    const { userId } = event;
    const { lostFoundId } = event.pathParameters || {};
    if (!lostFoundId) return response.error('lostFoundId is required', 400);

    const patch = JSON.parse(event.body || '{}');

    const existing = await LostFound.getById(lostFoundId);
    if (!existing) return response.notFound('Item not found');

    const memberRecord = await BookClub.getMemberRecord(existing.clubId, userId);
    if (!memberRecord || memberRecord.status !== 'active') {
      return response.forbidden('You must be an active club member to update this item');
    }

    const userRole = memberRecord.role || 'member';
    const updated = await LostFound.update(lostFoundId, userId, patch, userRole);
    if (!updated) return response.notFound('Item not found');

    if (patch.images && patch.images.length > 0) {
      try {
        await publishEvent('LostFound.ImageAnalysisRequested', {
          lostFoundId: updated.lostFoundId,
          clubId: updated.clubId,
          userId: userId,
          images: updated.images
        });
      } catch (evtErr) {
        console.error('[LostFound] Failed to publish ImageAnalysisRequested event', evtErr);
      }
    }

    return response.success(updated);
  } catch (err) {
    if (err.message === 'FORBIDDEN') return response.forbidden('You do not have permission to update this item');
    console.error('[LostFound] update error:', err);
    return response.error(err.message || 'Failed to update item', 500);
  }
};

module.exports.handler = withAuth(handler);
