const { DynamoDB } = require('./aws-config');
const tableNames = require('./table-names');

class ImageMetadataService {
  constructor() {
    this.dynamodb = new DynamoDB.DocumentClient();
  }

  /**
   * Retrieve pre-extracted metadata for an image
   * @param {string} s3Bucket - S3 bucket name
   * @param {string} s3Key - S3 object key
   * @returns {Promise<Object|null>} Extracted metadata or null if not found
   */
  async getExtractedMetadata(s3Bucket, s3Key) {
    try {
      const cacheKey = `textract:${s3Bucket}:${s3Key}`;
      console.log(`[ImageMetadataService] Looking up pre-extracted metadata for ${cacheKey}`);

      const result = await this.dynamodb.get({
        TableName: tableNames.metadataCache,
        Key: { cacheKey },
      }).promise();

      if (result.Item) {
        console.log(`[ImageMetadataService] Found pre-extracted metadata with ${result.Item.confidence}% confidence`);
        return {
          extractedText: result.Item.extractedText,
          bookMetadata: result.Item.metadata,
          confidence: result.Item.confidence,
          extractedAt: result.Item.extractedAt,
          isPreExtracted: true,
        };
      }

      console.log(`[ImageMetadataService] No pre-extracted metadata found for ${cacheKey}`);
      return null;
    } catch (error) {
      console.error('[ImageMetadataService] Error retrieving pre-extracted metadata:', error);
      return null;
    }
  }

  /**
   * List all pre-extracted metadata for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of extracted metadata items
   */
  async getUserExtractedMetadata(userId) {
    try {
      console.log(`[ImageMetadataService] Retrieving all extracted metadata for user ${userId}`);

      // Scan for items with this userId (not ideal for large datasets, but okay for moderate usage)
      const result = await this.dynamodb.scan({
        TableName: tableNames.metadataCache,
        FilterExpression: 'userId = :userId AND begins_with(cacheKey, :prefix)',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':prefix': 'textract:',
        },
      }).promise();

      console.log(`[ImageMetadataService] Found ${result.Items.length} extracted metadata items for user ${userId}`);
      
      return result.Items.map(item => ({
        s3Bucket: item.s3Bucket,
        s3Key: item.s3Key,
        extractedAt: item.extractedAt,
        metadata: item.metadata,
        confidence: item.confidence,
        extractedText: item.extractedText,
      }));
    } catch (error) {
      console.error('[ImageMetadataService] Error retrieving user metadata:', error);
      return [];
    }
  }

  /**
   * Delete extracted metadata for an image
   * @param {string} s3Bucket - S3 bucket name
   * @param {string} s3Key - S3 object key
   * @returns {Promise<boolean>} Success status
   */
  async deleteExtractedMetadata(s3Bucket, s3Key) {
    try {
      const cacheKey = `textract:${s3Bucket}:${s3Key}`;
      console.log(`[ImageMetadataService] Deleting extracted metadata for ${cacheKey}`);

      await this.dynamodb.delete({
        TableName: tableNames.metadataCache,
        Key: { cacheKey },
      }).promise();

      console.log(`[ImageMetadataService] Successfully deleted metadata for ${cacheKey}`);
      return true;
    } catch (error) {
      console.error('[ImageMetadataService] Error deleting extracted metadata:', error);
      return false;
    }
  }
}

module.exports = new ImageMetadataService();