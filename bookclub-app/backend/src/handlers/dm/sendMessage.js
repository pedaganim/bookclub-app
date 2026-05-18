const { z } = require('zod');
const response = require('../../lib/response');
const DMService = require('../../services/dm-service');
const { withAuth } = require('../../lib/middleware');

const SendMessageSchema = z.object({
  toUserId: z.string().min(1, 'toUserId is required'),
  content: z.string().min(1, 'Content is required').max(2000, 'Content too long'),
});

/**
 * Handler for sending a direct message.
 */
const handler = async (event) => {
  const { conversationId } = event.pathParameters || {};
  if (!conversationId) {
    return response.validationError({ message: 'conversationId is required' });
  }

  const body = JSON.parse(event.body || '{}');
  const data = SendMessageSchema.parse(body);

  const message = await DMService.sendMessage({
    conversationId,
    fromUserId: event.userId,
    toUserId: data.toUserId,
    content: data.content,
  });

  return response.success(message);
};

module.exports.handler = withAuth(handler);
