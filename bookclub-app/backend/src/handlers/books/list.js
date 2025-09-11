const response = require('../../lib/response');
const Book = require('../../models/book');

module.exports.handler = async (event) => {
  try {
    const qs = (event && event.queryStringParameters) ? event.queryStringParameters : {};
    let userId = qs && typeof qs.userId === 'string' ? qs.userId : null;
    const limit = qs && qs.limit ? parseInt(qs.limit, 10) : 10;
    const nextToken = qs && typeof qs.nextToken === 'string' ? qs.nextToken : null;
    const search = qs && typeof qs.search === 'string' ? qs.search : null;

    // If no userId specified, try to use Cognito claims (authenticated user)
    if (!userId && event?.requestContext?.authorizer?.claims?.sub) {
      userId = event.requestContext.authorizer.claims.sub;
    }

    console.log('listBooks handler', {
      stage: process.env.STAGE,
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
      derivedUserId: userId || null,
      hasClaims: !!(event?.requestContext?.authorizer?.claims),
      limit,
      hasNextToken: !!nextToken,
      hasSearch: !!search,
    });

    let result;
    if (userId) {
      result = await Book.listByUser(userId, limit, nextToken);
    } else {
      // Public listing (all books) when no userId provided
      result = await Book.listAll(limit, nextToken, search);
    }

    return response.success({
      items: result.items,
      nextToken: result.nextToken || null,
    });
  } catch (error) {
    return response.error(error);
  }
};
