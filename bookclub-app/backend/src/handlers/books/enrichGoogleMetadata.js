const Book = require('../../models/book');
const { success, error } = require('../../lib/response');
const bookMetadataService = require('../../lib/book-metadata');
const { publishEvent } = require('../../lib/event-bus');

module.exports.handler = async (event) => {
  try {
    if (String(process.env.ENABLE_GOOGLE_ENRICHMENT || 'true') !== 'true') {
      return success({ skipped: true, reason: 'Google enrichment disabled' });
    }
    const detail = event?.detail || {};
    const bookId = detail.bookId;
    if (!bookId) return error('Missing bookId in event detail', 400);

    const existing = await Book.getById(bookId);
    if (!existing) return error('Book not found', 404);

    // Idempotency: skip if we already have google_metadata
    if (existing.google_metadata && existing.google_metadata.source) {
      return success({ bookId, enriched: true, skipped: true });
    }

    // Query Google metadata using available hints
    const metadata = await bookMetadataService.searchBookMetadata({
      isbn: existing.isbn13 || existing.isbn10,
      title: existing.title,
      author: existing.author,
    });

    if (!metadata) {
      return success({ bookId, enriched: false });
    }

    // Store raw google metadata blob for auditing, do not overwrite existing fields here
    const update = {
      google_metadata: {
        title: metadata.title,
        authors: metadata.authors,
        description: metadata.description,
        publishedDate: metadata.publishedDate,
        pageCount: metadata.pageCount,
        categories: metadata.categories,
        language: metadata.language,
        isbn10: metadata.isbn10,
        isbn13: metadata.isbn13,
        thumbnail: metadata.thumbnail,
        smallThumbnail: metadata.smallThumbnail,
        publisher: metadata.publisher,
        source: metadata.source || 'google-books',
      },
    };

    await Book.update(bookId, existing.userId, update);
    // Publish post-enrichment event for downstream processors (e.g., MCP OCR)
    try {
      await publishEvent('Book.GoogleMetadataEnriched', {
        bookId,
        userId: existing.userId,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[EnrichGoogleMetadata] Failed to publish GoogleMetadataEnriched:', e.message);
    }
    return success({ bookId, enriched: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[EnrichGoogleMetadata] Error:', e);
    return error(e.message || 'Failed to enrich google metadata', 500);
  }
};
