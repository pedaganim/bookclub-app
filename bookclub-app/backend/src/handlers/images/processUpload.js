const Book = require('../../models/book');
const textractService = require('../../lib/textract-service');
const { DynamoDB } = require('../../lib/aws-config');
const { getTableName } = require('../../lib/table-names');

// Constants
const METADATA_SOURCE_PENDING = 'image-upload-pending';
const PLACEHOLDER_AUTHOR = 'Unknown Author';
const PROCESSING_DESCRIPTION = 'Book uploaded via image - metadata processing in progress';

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

/**
 * Lambda function to automatically create book entries from uploaded images
 * Triggered by S3 ObjectCreated events
 * 
 * Flow:
 * 1. Create minimal book entries with uploaded cover images
 * 2. Metadata extraction and enrichment happens asynchronously via other lambdas
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
        // Create minimal book entry with uploaded image
        const fileUrl = `https://${bucket}.s3.amazonaws.com/${key}`;
        
        const bookData = {
          title: deriveBookTitleFromFilename(key), // Derive from filename - will be updated by metadata processing
          author: PLACEHOLDER_AUTHOR, // Placeholder - will be updated by metadata processing
          description: PROCESSING_DESCRIPTION,
          coverImage: fileUrl,
          metadataSource: METADATA_SOURCE_PENDING
        };

        const createdBook = await Book.create(bookData, userId);
        
        console.log(`[ImageProcessor] Created book entry for uploaded image: ${createdBook.bookId} - ${key}`);

        // Asynchronously extract metadata and update the book
        // This happens in the background to not block the response
        try {
          console.log(`[ImageProcessor] Starting metadata extraction for ${key}...`);
          
          const extractionResult = await textractService.extractTextFromImage(bucket, key);
          
          if (extractionResult && extractionResult.bookMetadata) {
            console.log(`[ImageProcessor] Metadata extraction successful for ${key}`);
            
            // Cache the extracted metadata for future use
            await cacheExtractedMetadata(bucket, key, userId, extractionResult);
            
            // Update the book with extracted metadata
            const { bookMetadata, extractedText } = extractionResult;
            const updatedBookData = {
              // Only update if we have better data than placeholders
              title: bookMetadata.title || bookData.title,
              author: bookMetadata.author || PLACEHOLDER_AUTHOR,
              description: bookMetadata.description || extractedText.fullText || PROCESSING_DESCRIPTION,
              isbn10: bookMetadata.isbn && bookMetadata.isbn.length === 10 ? bookMetadata.isbn : undefined,
              isbn13: bookMetadata.isbn && bookMetadata.isbn.length === 13 ? bookMetadata.isbn : undefined,
              publisher: bookMetadata.publisher,
              publishedDate: bookMetadata.publishedDate,
              textractExtractedText: extractedText.fullText,
              textractConfidence: extractionResult.confidence,
              metadataSource: 'textract-auto-processed'
            };
            
            // Remove undefined fields
            Object.keys(updatedBookData).forEach(key => {
              if (updatedBookData[key] === undefined) {
                delete updatedBookData[key];
              }
            });
            
            await Book.update(createdBook.bookId, userId, updatedBookData);
            
            console.log(`[ImageProcessor] Updated book ${createdBook.bookId} with extracted metadata`);
          } else {
            console.log(`[ImageProcessor] No metadata extracted for ${key}, book remains with placeholder data`);
          }
        } catch (metadataError) {
          console.error(`[ImageProcessor] Metadata extraction failed for ${key}:`, metadataError);
          // Book creation succeeded, but metadata extraction failed
          // The book will remain with placeholder data, which is acceptable
        }

      } catch (bookCreationError) {
        console.error(`[ImageProcessor] Error creating book entry for ${key}:`, bookCreationError);
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