const response = require('../../lib/response');
const imageMetadataService = require('../../lib/image-metadata-service');

module.exports.handler = async (event) => {
  try {
    // Derive userId from Cognito authorizer claims (configured in API Gateway)
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    console.log(`[ListImageMetadata] Retrieving extracted metadata for user ${userId}`);
    
    const extractedMetadata = await imageMetadataService.getUserExtractedMetadata(userId);
    
    console.log(`[ListImageMetadata] Found ${extractedMetadata.length} extracted metadata items`);

    // Return the extracted metadata with summary information
    return response.success({
      items: extractedMetadata,
      count: extractedMetadata.length,
      summary: {
        totalImages: extractedMetadata.length,
        withTitle: extractedMetadata.filter(item => item.metadata.title).length,
        withAuthor: extractedMetadata.filter(item => item.metadata.author).length,
        withISBN: extractedMetadata.filter(item => item.metadata.isbn).length,
        averageConfidence: extractedMetadata.length > 0 
          ? Math.round(extractedMetadata.reduce((sum, item) => sum + item.confidence, 0) / extractedMetadata.length)
          : 0,
      },
    });
  } catch (error) {
    console.error('[ListImageMetadata] Error:', error);
    return response.error(error);
  }
};