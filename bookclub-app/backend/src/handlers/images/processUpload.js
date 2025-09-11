const Book = require('../../models/book');

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
          title: 'Uploaded Book', // Placeholder - will be updated by metadata processing
          author: 'Unknown Author', // Placeholder - will be updated by metadata processing
          description: 'Book uploaded via image - metadata processing in progress',
          coverImage: fileUrl,
          metadataSource: 'image-upload-pending'
        };

        const createdBook = await Book.create(bookData, userId);
        
        console.log(`[ImageProcessor] Created book entry for uploaded image: ${createdBook.bookId} - ${key}`);

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