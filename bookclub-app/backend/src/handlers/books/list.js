const response = require('../../lib/response');
const Book = require('../../models/book');

// --- Handler (top) ---
module.exports.handler = async (event) => {
  try {
    const { qs, limit, nextToken, search, ageGroupFine, bare, filter, clubId } = parseQuery(event);
    const userId = deriveUserId(event, qs);
    logListContext(event, userId, limit, nextToken, search, ageGroupFine, bare, filter);

    let result;
    if (filter === 'borrowed' && userId) {
      result = await Book.listByLentToUser(userId, limit, nextToken);
    } else if (userId && !clubId) {
      result = await Book.listByUser(userId, limit, nextToken);
    } else {
      const options = {};
      if (bare) options.bare = true;
      if (clubId) options.clubId = clubId;
      result = await Book.listAll(limit, nextToken, search, ageGroupFine || null, Object.keys(options).length ? options : undefined);
    }

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
  const bare = qs && typeof qs.bare === 'string' ? (qs.bare === '1' || qs.bare.toLowerCase() === 'true') : false;
  const filter = qs && typeof qs.filter === 'string' ? qs.filter : null;
  const clubId = qs && typeof qs.clubId === 'string' ? qs.clubId : null;
  return { qs, limit, nextToken, search, ageGroupFine, bare, filter, clubId };
};

const deriveUserId = (event, qs) => {
  let userId = qs && typeof qs.userId === 'string' ? qs.userId : null;
  if (!userId && event?.requestContext?.authorizer?.claims?.sub) {
    userId = event.requestContext.authorizer.claims.sub;
  }
  return userId;
};

const logListContext = (event, userId, limit, nextToken, search, ageGroupFine, bare, filter) => {
  console.log('listBooks handler', {
    stage: process.env.STAGE,
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
    derivedUserId: userId || null,
    hasClaims: !!(event?.requestContext?.authorizer?.claims),
    limit,
    hasNextToken: !!nextToken,
    hasSearch: !!search,
    ageGroupFine: ageGroupFine || null,
    bare: !!bare,
    filter: filter || null,
  });
};
