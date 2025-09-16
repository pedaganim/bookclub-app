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

      const userId = extractUserIdFromKey(key);
      if (!userId) {
        console.log('[ImageProcessor] Invalid key structure, skipping');
        continue;
      }

      try {
        const createdBook = await createMinimalBookEntry(bucket, key, userId);
        await extractAndUpdateMetadata(bucket, key, userId, createdBook);
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

const createMinimalBookEntry = async (bucket, key, userId) => {
  const fileUrl = `https://${bucket}.s3.amazonaws.com/${key}`;
  const bookData = {
    title: deriveBookTitleFromFilename(key),
    author: PLACEHOLDER_AUTHOR,
    description: PROCESSING_DESCRIPTION,
    coverImage: fileUrl,
    metadataSource: METADATA_SOURCE_PENDING,
  };
  const createdBook = await Book.create(bookData, userId);
  console.log(`[ImageProcessor] Created book entry for uploaded image: ${createdBook.bookId} - ${key}`);
  return createdBook;
};

const extractAndUpdateMetadata = async (bucket, key, userId, createdBook) => {
  try {
    console.log(`[ImageProcessor] Starting metadata extraction for ${key}...`);
    const extractionResult = await textractService.extractTextFromImage(bucket, key);
    if (extractionResult && extractionResult.bookMetadata) {
      console.log(`[ImageProcessor] Metadata extraction successful for ${key}`);
      await cacheExtractedMetadata(bucket, key, userId, extractionResult);
      const { bookMetadata, extractedText } = extractionResult;
      const updatedBookData = {
        title: bookMetadata.title || deriveBookTitleFromFilename(key),
        author: bookMetadata.author ?? PLACEHOLDER_AUTHOR,
        description: bookMetadata.description || extractedText.fullText || PROCESSING_DESCRIPTION,
        isbn10: bookMetadata.isbn && bookMetadata.isbn.length === 10 ? bookMetadata.isbn : undefined,
        isbn13: bookMetadata.isbn && bookMetadata.isbn.length === 13 ? bookMetadata.isbn : undefined,
        publisher: bookMetadata.publisher,
        publishedDate: bookMetadata.publishedDate,
        textractExtractedText: extractedText.fullText,
        textractConfidence: extractionResult.confidence,
        metadataSource: 'textract-auto-processed',
      };
      const cleaned = removeUndefinedFields(updatedBookData);
      await Book.update(createdBook.bookId, userId, cleaned);
      console.log(`[ImageProcessor] Updated book ${createdBook.bookId} with extracted metadata`);
      // Emit event to trigger downstream processors
      try {
        await publishEvent('Book.TextractCompleted', {
          bookId: createdBook.bookId,
          userId,
          s3Bucket: bucket,
          s3Key: key,
          hasDescription: !!cleaned.description,
        });
        console.log('[ImageProcessor] Published Book.TextractCompleted event');
      } catch (e) {
        console.error('[ImageProcessor] Failed to publish Book.TextractCompleted event:', e);
      }
    } else {
      console.log(`[ImageProcessor] No metadata extracted for ${key}, book remains with placeholder data`);
    }
  } catch (metadataError) {
    console.error(`[ImageProcessor] Metadata extraction failed for ${key}:`, metadataError);
  }
};