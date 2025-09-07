const response = require('../../lib/response');
const Book = require('../../models/book');

module.exports.handler = async (event) => {
  try {
    const { queryStringParameters = {} } = event || {};
    let userId = queryStringParameters.userId || null;
    const limit = queryStringParameters.limit ? parseInt(queryStringParameters.limit, 10) : 10;
    const nextToken = queryStringParameters.nextToken || null;

    // If no userId specified, try to use Cognito claims (authenticated user)
    if (!userId && event?.requestContext?.authorizer?.claims?.sub) {
      userId = event.requestContext.authorizer.claims.sub;
    }

    let result;
    if (userId) {
      result = await Book.listByUser(userId, limit, nextToken);
    } else {
      // Public listing (all books) when no userId provided
      result = await Book.listAll(limit, nextToken);
    }

    return response.success({
      items: result.items,
      nextToken: result.nextToken || null,
    });
  } catch (error) {
    return response.error(error);
  }
};
