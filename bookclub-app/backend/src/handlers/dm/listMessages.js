const { success, error } = require('../../lib/response');
const DM = require('../../models/dm');

exports.handler = async (event) => {
  try {
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub;
    if (!userId) return error('Unauthorized', 401);

    const { conversationId } = event.pathParameters || {};
    if (!conversationId) return error('conversationId is required', 400);

    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : 20;
    const nextToken = event.queryStringParameters?.nextToken ? JSON.parse(Buffer.from(event.queryStringParameters.nextToken, 'base64').toString('utf-8')) : undefined;

    const list = await DM.listMessages(conversationId, Math.min(Math.max(limit, 1), 100), nextToken);

    // Encode nextToken for transport
    const encoded = list.nextToken ? Buffer.from(JSON.stringify(list.nextToken), 'utf-8').toString('base64') : undefined;

    return success({ items: list.items, nextToken: encoded });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error listing messages:', e);
    return error(e.message || 'Failed to list messages', 500);
  }
};
