const response = require('../../lib/response');
const Book = require('../../models/book');

module.exports.handler = async (event) => {
  try {
    const qs = (event && event.queryStringParameters) ? event.queryStringParameters : {};
    const query = qs && typeof qs.q === 'string' ? qs.q : '';
    const limit = qs && qs.limit && !isNaN(parseInt(qs.limit, 10)) ? parseInt(qs.limit, 10) : 10;
    const nextToken = qs && typeof qs.nextToken === 'string' ? qs.nextToken : null;

    console.log('searchBooks handler', {
      stage: process.env.STAGE,
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
      query: query || '(empty)',
      limit,
      hasNextToken: !!nextToken,
    });

    const result = await Book.search(query, limit, nextToken);

    return response.success({
      items: result.items,
      nextToken: result.nextToken || null,
      query: query,
      totalCount: result.items.length,
    });
  } catch (error) {
    return response.error(error);
  }
};