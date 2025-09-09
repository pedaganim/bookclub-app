const response = require('../../lib/response');
const { getTableName } = require('../../lib/table-names');
const dynamoDb = require('../../lib/dynamodb');

/**
 * Search books by text query across metadata fields
 * Returns books with images only (not full metadata) for cost efficiency
 */
module.exports.handler = async (event) => {
  try {
    const query = event.queryStringParameters?.q;
    const limit = parseInt(event.queryStringParameters?.limit) || 20;
    const nextToken = event.queryStringParameters?.nextToken;

    if (!query || query.trim().length === 0) {
      return response.validationError({
        q: 'Search query is required',
      });
    }

    const searchTerm = query.trim().toLowerCase();

    // Build scan parameters to search across title, author, and description
    const params = {
      TableName: getTableName('books'),
      FilterExpression: 'contains(#title, :searchTerm) OR contains(#author, :searchTerm) OR contains(#description, :searchTerm)',
      ExpressionAttributeNames: {
        '#title': 'title',
        '#author': 'author',
        '#description': 'description',
      },
      ExpressionAttributeValues: {
        ':searchTerm': searchTerm,
      },
      Limit: limit,
      // Project only necessary fields for cost efficiency
      ProjectionExpression: 'bookId, userId, title, author, coverImage, images, #status, createdAt',
    };

    // Add status attribute name since it might be a reserved word
    params.ExpressionAttributeNames['#status'] = 'status';

    if (nextToken) {
      try {
        params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
      } catch (error) {
        return response.validationError({
          nextToken: 'Invalid pagination token',
        });
      }
    }

    const result = await dynamoDb.scan(params);

    // Transform results to show images only (for listing display)
    const books = (result.Items || []).map(book => ({
      bookId: book.bookId,
      userId: book.userId,
      title: book.title,
      author: book.author,
      status: book.status,
      // Return images array, falling back to coverImage for backward compatibility
      images: book.images || (book.coverImage ? [book.coverImage] : []),
      createdAt: book.createdAt,
    }));

    const responseData = {
      items: books,
      count: books.length,
      query: searchTerm,
    };

    if (result.LastEvaluatedKey) {
      responseData.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
    }

    return response.success(responseData);
  } catch (error) {
    console.error('[BookSearch] Error:', error);
    return response.error(error);
  }
};