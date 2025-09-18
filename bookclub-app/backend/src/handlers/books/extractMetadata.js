const Book = require('../../models/book');
const { publishEvent } = require('../../lib/event-bus');
const response = require('../../lib/response');

/**
 * API endpoint for manually triggering advanced metadata extraction
 * POST /books/{bookId}/extract-metadata
 */
module.exports.handler = async (event) => {
  try {
    const { bookId } = event.pathParameters || {};
    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!bookId) {
      return response.error(new Error('Missing bookId parameter'), 400);
    }

    if (!userId) {
      return response.error(new Error('User not authenticated'), 401);
    }

    console.log(`[ExtractMetadataAPI] Manual metadata extraction requested for book: ${bookId} by user: ${userId}`);

    // Get the book to validate ownership and get S3 details
    const book = await Book.getById(bookId);
    
    if (!book) {
      return response.error(new Error('Book not found'), 404);
    }

    if (book.userId !== userId) {
      return response.error(new Error('Not authorized to modify this book'), 403);
    }

    if (!book.s3Bucket || !book.s3Key) {
      return response.error(new Error('Book does not have associated S3 image'), 400);
    }

    // Publish EventBridge event to trigger metadata extraction
    await publishEvent('S3.ObjectCreated', {
      bucket: book.s3Bucket,
      key: book.s3Key,
      userId,
      bookId,
      eventType: 'manual-metadata-extraction'
    });

    console.log(`[ExtractMetadataAPI] Published metadata extraction event for book: ${bookId}`);

    return response.success({
      message: 'Metadata extraction initiated',
      bookId,
      status: 'processing'
    });

  } catch (error) {
    console.error('[ExtractMetadataAPI] Error initiating metadata extraction:', error);
    return response.error(error);
  }
};