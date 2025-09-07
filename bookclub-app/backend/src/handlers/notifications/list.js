const response = require('../../lib/response');
const Notification = require('../../models/notification');

module.exports.handler = async (event) => {
  try {
    // Get userId from Cognito authorizer claims
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    const qs = (event && event.queryStringParameters) ? event.queryStringParameters : {};
    const limit = qs && qs.limit ? parseInt(qs.limit, 10) : 20;
    const nextToken = qs && typeof qs.nextToken === 'string' ? qs.nextToken : null;

    console.log('listNotifications handler', {
      userId,
      limit,
      hasNextToken: !!nextToken,
    });

    const result = await Notification.listByUser(userId, limit, nextToken);

    return response.success({
      items: result.items,
      nextToken: result.nextToken || null,
    });
  } catch (error) {
    return response.error(error);
  }
};