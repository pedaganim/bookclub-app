const response = require('../../lib/response');
const bookMetadataService = require('../../lib/book-metadata');

module.exports.handler = async (event) => {
  try {
    // Derive userId from Cognito authorizer claims (configured in API Gateway)
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    // Parse query parameters for metadata search
    const queryParams = event.queryStringParameters || {};
    const { isbn, title, author } = queryParams;

    // Validate input - at least one search parameter is required
    if (!isbn && !title && !author) {
      return response.validationError({
        search: 'At least one search parameter (isbn, title, or author) is required',
      });
    }

    // Search for book metadata
    const metadata = await bookMetadataService.searchBookMetadata({
      isbn,
      title,
      author,
    });

    if (!metadata) {
      return response.notFound('No book metadata found for the provided search criteria');
    }

    return response.success(metadata);
  } catch (error) {
    console.error('[MetadataLookup] Error:', error);
    return response.error(error);
  }
};