const textractService = require('../../lib/textract-service');
const { DynamoDB } = require('../../lib/aws-config');
const { getTableName } = require('../../lib/table-names');

/**
 * Lambda function to automatically process uploaded images with Textract
 * Triggered by S3 ObjectCreated events
 */
module.exports.handler = async (event) => {
  console.log('[ImageProcessor] Processing S3 event:', JSON.stringify(event, null, 2));

  try {
    // Process each record in the S3 event
    for (const record of event.Records) {
      if (record.eventSource !== 'aws:s3') {
        console.log('[ImageProcessor] Skipping non-S3 event');
        continue;
      }

      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      
      console.log(`[ImageProcessor] Processing image: s3://${bucket}/${key}`);

      // Only process book cover images (skip other uploads)
      if (!key.startsWith('book-covers/')) {
        console.log('[ImageProcessor] Skipping non-book-cover image');
        continue;
      }

      // Extract userId from the key path (book-covers/userId/filename)
      const keyParts = key.split('/');
      if (keyParts.length < 3) {
        console.log('[ImageProcessor] Invalid key structure, skipping');
        continue;
      }
      const userId = keyParts[1];

      try {
        // Extract metadata using Textract
        const extractionResult = await textractService.extractTextFromImage(bucket, key);
        
        if (!extractionResult) {
          console.log('[ImageProcessor] Textract extraction failed, skipping metadata storage');
          continue;
        }

        // Store extracted metadata in cache table for later retrieval
        const metadataItem = {
          cacheKey: `textract:${bucket}:${key}`,
          extractedAt: new Date().toISOString(),
          userId: userId,
          s3Bucket: bucket,
          s3Key: key,
          metadata: extractionResult.bookMetadata,
          extractedText: extractionResult.extractedText,
          confidence: extractionResult.confidence,
          ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days TTL
        };

        const dynamodb = new DynamoDB.DocumentClient();
        await dynamodb.put({
          TableName: getTableName('metadata-cache'),
          Item: metadataItem,
        }).promise();

        console.log(`[ImageProcessor] Successfully processed and stored metadata for ${key} with ${extractionResult.confidence}% confidence`);
        console.log(`[ImageProcessor] Extracted metadata:`, {
          title: extractionResult.bookMetadata.title,
          author: extractionResult.bookMetadata.author,
          isbn: extractionResult.bookMetadata.isbn,
        });

      } catch (extractionError) {
        console.error(`[ImageProcessor] Error processing image ${key}:`, extractionError);
        // Continue processing other images even if one fails
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Processed ${event.Records.length} image(s)`,
      }),
    };
  } catch (error) {
    console.error('[ImageProcessor] Error processing S3 event:', error);
    throw error;
  }
};