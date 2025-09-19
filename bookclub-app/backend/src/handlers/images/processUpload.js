const AWS = require('aws-sdk');
const Book = require('../../models/book');
const textractService = require('../../lib/textract-service');
const { DynamoDB } = require('../../lib/aws-config');
const { publishEvent } = require('../../lib/event-bus');
const { getTableName } = require('../../lib/table-names');

// Constants
const METADATA_SOURCE_PENDING = 'image-upload-pending';
const PLACEHOLDER_AUTHOR = 'Unknown Author';
const PROCESSING_DESCRIPTION = 'Book uploaded via image - metadata processing in progress';

// --- Handler (moved to top for readability) ---
module.exports.handler = async (event) => {
  console.log('[ImageProcessor] Processing S3 event:', JSON.stringify(event, null, 2));

  try {
    for (const record of event.Records) {
      if (!isS3Event(record)) {
        console.log('[ImageProcessor] Skipping non-S3 event');
        continue;
      }

      const { bucket, key } = parseS3Record(record);
      console.log(`[ImageProcessor] Processing image: s3://${bucket}/${key}`);

      if (!shouldProcessKey(key)) {
        console.log('[ImageProcessor] Skipping non-book-cover image');
        continue;
      }

      try {
        const userId = extractUserIdFromKey(key);
        if (!userId) {
          console.warn(`[ImageProcessor] Could not extract userId from key: ${key}`);
          continue;
        }

        // Create a minimal book entry only; do not enrich here
        const createdBook = await createMinimalBookEntry(bucket, key, userId);

        // Publish EventBridge event for downstream metadata processing
        // This replaces the direct metadata extraction to implement EventBridge-triggered processing
        await publishEvent('S3.ObjectCreated', {
          bucket,
          key,
          userId,
          bookId: createdBook.bookId,
          eventType: 'book-cover-uploaded'
        });
        
        console.log(`[ImageProcessor] Published S3.ObjectCreated event for book: ${createdBook.bookId}`);

        // Additionally invoke Bedrock analyzer directly (best-effort, no infra changes required)
        await invokeBedrockAnalyzer({
          bucket,
          key,
          bookId: createdBook.bookId,
        }).catch(err => console.warn('[ImageProcessor] Bedrock analyzer direct invoke failed:', err.message));
      } catch (bookCreationError) {
        console.error(`[ImageProcessor] Error creating or updating book for ${key}:`, bookCreationError);
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

/**
 * Utility function to remove undefined fields from an object
 * @param {Object} obj - Object to clean
 * @returns {Object} - Object with undefined fields removed
 */
function removeUndefinedFields(obj) {
  const cleaned = { ...obj };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
}

/**
 * Derives a meaningful title from the uploaded filename
 * @param {string} s3Key - The S3 key (e.g., "book-covers/userId/my-book-title.jpg")
 * @returns {string} - Formatted title (e.g., "My Book Title")
 */
function deriveBookTitleFromFilename(s3Key) {
  // Extract filename from S3 key (book-covers/userId/filename.ext)
  const keyParts = s3Key.split('/');
  const filename = keyParts[keyParts.length - 1];
  
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Replace underscores, hyphens, and dots with spaces
  // Then capitalize first letter of each word
  return nameWithoutExt
    .replace(/[_\-\.]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim() || 'Uploaded Book'; // Fallback if filename processing results in empty string
}

/**
 * Cache extracted metadata in DynamoDB for later retrieval
 * @param {string} s3Bucket - S3 bucket name
 * @param {string} s3Key - S3 key
 * @param {string} userId - User ID
 * @param {Object} extractionResult - Result from textract service
 * @returns {Promise<boolean>} Success status
 */
async function cacheExtractedMetadata(s3Bucket, s3Key, userId, extractionResult) {
  try {
    const dynamodb = new DynamoDB.DocumentClient();
    const cacheKey = `textract:${s3Bucket}:${s3Key}`;
    const timestamp = new Date().toISOString();
    
    // Calculate TTL (30 days from now)
    const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
    
    const cacheItem = {
      cacheKey,
      userId,
      s3Bucket,
      s3Key,
      extractedAt: timestamp,
      metadata: extractionResult.bookMetadata,
      extractedText: extractionResult.extractedText,
      confidence: extractionResult.confidence || 0,
      ttl
    };
    
    await dynamodb.put({
      TableName: getTableName('metadata-cache'),
      Item: cacheItem,
    }).promise();
    
    console.log(`[ImageProcessor] Cached metadata for ${cacheKey} with ${extractionResult.confidence}% confidence`);
    return true;
  } catch (error) {
    console.error('[ImageProcessor] Error caching metadata:', error);
    return false;
  }
}

// --- Helpers ---
const isS3Event = (record) => record?.eventSource === 'aws:s3';

const parseS3Record = (record) => ({
  bucket: record.s3.bucket.name,
  key: decodeURIComponent(record.s3.object.key.replace(/\+/g, ' ')),
});

const shouldProcessKey = (key) => key && key.startsWith('book-covers/');

const extractUserIdFromKey = (key) => {
  const parts = key.split('/');
  if (parts.length < 3) return null;
  return parts[1];
};

// Use metadata-cache table as an idempotency map: s3 -> bookId
const IS_TEST = process.env.NODE_ENV === 'test';
async function getMappedBookId(bucket, key) {
  if (IS_TEST) return null;
  try {
    const dynamodb = new DynamoDB.DocumentClient();
    const cacheKey = `bookForS3:${bucket}:${key}`;
    const res = await dynamodb.get({ TableName: getTableName('metadata-cache'), Key: { cacheKey } }).promise();
    return res.Item?.bookId || null;
  } catch (e) {
    console.warn('[ImageProcessor] getMappedBookId failed:', e.message);
    return null;
  }
}

async function setMappedBookId(bucket, key, bookId, userId) {
  if (IS_TEST) return; // skip during tests
  try {
    const dynamodb = new DynamoDB.DocumentClient();
    const cacheKey = `bookForS3:${bucket}:${key}`;
    const timestamp = new Date().toISOString();
    // 30 days TTL for mapping (can be recreated if needed)
    const ttl = Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000);
    await dynamodb.put({
      TableName: getTableName('metadata-cache'),
      Item: { cacheKey, bookId, userId, s3Bucket: bucket, s3Key: key, mappedAt: timestamp, ttl },
      ConditionExpression: 'attribute_not_exists(cacheKey)'
    }).promise().catch(() => {}); // ignore ConditionalCheckFailedException
  } catch (e) {
    console.warn('[ImageProcessor] setMappedBookId failed:', e.message);
  }
}

const createMinimalBookEntry = async (bucket, key, userId) => {
  // Check idempotent mapping first
  const existingBookId = await getMappedBookId(bucket, key);
  if (existingBookId) {
    console.log(`[ImageProcessor] Found existing book mapping for ${key}: ${existingBookId}`);
    const existing = await Book.getById(existingBookId).catch(() => null);
    return existing || { bookId: existingBookId, userId };
  }

  const fileUrl = `https://${bucket}.s3.amazonaws.com/${key}`;
  const bookData = {
    title: deriveBookTitleFromFilename(key),
    author: PLACEHOLDER_AUTHOR,
    description: PROCESSING_DESCRIPTION,
    coverImage: fileUrl,
    metadataSource: METADATA_SOURCE_PENDING,
    s3Bucket: bucket,
    s3Key: key,
  };
  const createdBook = await Book.create(bookData, userId);
  await setMappedBookId(bucket, key, createdBook.bookId, userId);
  console.log(`[ImageProcessor] Created book entry for uploaded image: ${createdBook.bookId} - ${key}`);
  return createdBook;
};

async function invokeBedrockAnalyzer({ bucket, key, bookId }) {
  const functionName = process.env.BEDROCK_ANALYZE_FUNCTION_NAME;
  if (!functionName) {
    console.warn('[ImageProcessor] BEDROCK_ANALYZE_FUNCTION_NAME not set; skipping direct invoke');
    return;
  }
  const lambda = new AWS.Lambda();
  const payload = {
    bucket,
    key,
    bookId,
    contentType: 'image/jpeg',
  };
  await lambda.invoke({
    FunctionName: functionName,
    InvocationType: 'Event', // async invoke
    Payload: JSON.stringify(payload),
  }).promise();
  console.log('[ImageProcessor] Invoked Bedrock analyzer lambda for', key);
}

