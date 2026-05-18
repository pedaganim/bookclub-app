const { z } = require('zod');
const response = require('../../lib/response');
const DMService = require('../../services/dm-service');
const { withAuth } = require('../../lib/middleware');

const ListConversationsSchema = z.object({
  limit: z.preprocess((val) => parseInt(val, 10), z.number().int().min(1).max(100).default(20)),
}).strict();

/**
 * Handler for listing user conversations.
 */
const handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const { limit } = ListConversationsSchema.parse(qs);

  const list = await DMService.listConversations(event.userId, limit);
  return response.success(list);
};

module.exports.handler = withAuth(handler);
