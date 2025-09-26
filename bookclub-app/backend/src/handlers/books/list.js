const response = require('../../lib/response');
const Book = require('../../models/book');

// --- Handler (top) ---
module.exports.handler = async (event) => {
  try {
    const { qs, limit, nextToken, search, ageGroupFine } = parseQuery(event);
    const userId = deriveUserId(event, qs);
    logListContext(event, userId, limit, nextToken, search, ageGroupFine);

    const result = userId
      ? await Book.listByUser(userId, limit, nextToken)
      : await Book.listAll(limit, nextToken, search, ageGroupFine);

    return response.success({
      items: result.items,
      nextToken: result.nextToken || null,
    });
  } catch (error) {
    return response.error(error);
  }
};

// --- Helpers ---
const parseQuery = (event) => {
  const qs = (event && event.queryStringParameters) ? event.queryStringParameters : {};
  const limit = qs && qs.limit ? parseInt(qs.limit, 10) : 10;
  const nextToken = qs && typeof qs.nextToken === 'string' ? qs.nextToken : null;
  const search = qs && typeof qs.search === 'string' ? qs.search : null;
  const ageGroupFine = qs && typeof qs.ageGroupFine === 'string' ? qs.ageGroupFine : null;
  return { qs, limit, nextToken, search, ageGroupFine };
};

const deriveUserId = (event, qs) => {
  let userId = qs && typeof qs.userId === 'string' ? qs.userId : null;
  if (!userId && event?.requestContext?.authorizer?.claims?.sub) {
    userId = event.requestContext.authorizer.claims.sub;
  }
  return userId;
};

const logListContext = (event, userId, limit, nextToken, search, ageGroupFine) => {
  console.log('listBooks handler', {
    stage: process.env.STAGE,
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
    derivedUserId: userId || null,
    hasClaims: !!(event?.requestContext?.authorizer?.claims),
    limit,
    hasNextToken: !!nextToken,
    hasSearch: !!search,
    ageGroupFine: ageGroupFine || null,
  });
};
