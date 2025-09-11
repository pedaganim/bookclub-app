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

    // Check if specific s3Bucket and s3Key are provided as query parameters
    const queryParams = event.queryStringParameters || {};
    const { s3Bucket, s3Key } = queryParams;

    if (s3Bucket && s3Key) {
      // Return specific image metadata
      console.log(`[ListImageMetadata] Retrieving specific metadata for user ${userId}: s3://${s3Bucket}/${s3Key}`);
      
      const specificMetadata = await imageMetadataService.getExtractedMetadata(s3Bucket, s3Key);
      
      if (!specificMetadata) {
        return response.notFound('No pre-extracted metadata found for this image');
      }

      console.log(`[ListImageMetadata] Found specific metadata with ${specificMetadata.confidence}% confidence`);
      
      return response.success(specificMetadata);
    } else {
      // Return all user metadata (existing behavior)
      console.log(`[ListImageMetadata] Retrieving all extracted metadata for user ${userId}`);
      
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
    }
  } catch (error) {
    console.error('[ListImageMetadata] Error:', error);
    return response.error(error);
  }
};