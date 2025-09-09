const response = require('../../lib/response');
const textractService = require('../../lib/textract-service');

module.exports.handler = async (event) => {
  try {
    // Derive userId from Cognito authorizer claims (configured in API Gateway)
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    const data = JSON.parse(event.body);

    // Validate input
    if (!data.s3Bucket || !data.s3Key) {
      return response.validationError({
        s3Bucket: data.s3Bucket ? undefined : 'S3 bucket is required',
        s3Key: data.s3Key ? undefined : 'S3 key is required',
      });
    }

    // Extract text and metadata from the image using Textract
    console.log(`[ImageMetadata] Processing image for user ${userId}: s3://${data.s3Bucket}/${data.s3Key}`);
    
    const extractionResult = await textractService.extractTextFromImage(data.s3Bucket, data.s3Key);
    
    if (!extractionResult) {
      return response.error(new Error('Failed to extract text from image. Please try again or upload a different image.'), 500);
    }

    const { extractedText, bookMetadata, confidence } = extractionResult;

    // Log the extraction results
    console.log(`[ImageMetadata] Extraction completed with ${confidence}% confidence`);
    console.log(`[ImageMetadata] Found metadata:`, {
      title: bookMetadata.title,
      author: bookMetadata.author,
      isbn: bookMetadata.isbn
    });

    // Return the extracted metadata
    return response.success({
      metadata: bookMetadata,
      extractedText: extractedText.fullText,
      confidence,
      textBlocks: extractedText.blocks,
      summary: {
        hasTitle: !!bookMetadata.title,
        hasAuthor: !!bookMetadata.author,
        hasISBN: !!bookMetadata.isbn,
        hasPublisher: !!bookMetadata.publisher,
        hasPublishedDate: !!bookMetadata.publishedDate
      }
    });
  } catch (error) {
    console.error('[ImageMetadata] Error:', error);
    return response.error(error);
  }
};