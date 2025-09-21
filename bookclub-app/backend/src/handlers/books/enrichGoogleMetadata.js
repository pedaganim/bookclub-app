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

    // Derive better hints from Bedrock analysis (if available)
    const bedrock = existing?.mcp_metadata?.bedrock || null;
    // Titles: combine candidates and optional title_guess; keep unique and trimmed
    const brTitles = (() => {
      const list = [];
      if (Array.isArray(bedrock?.title_candidates)) {
        list.push(
          ...bedrock.title_candidates
            .map((c) => (c && c.value ? String(c.value).trim() : ''))
            .filter(Boolean)
        );
      }
      if (typeof bedrock?.title_guess === 'string') {
        const guess = bedrock.title_guess.trim();
        if (guess && !list.includes(guess)) list.unshift(guess);
      }
      return list.length ? list : undefined;
    })();
    const brTitle = Array.isArray(brTitles) && brTitles.length > 0 ? brTitles[0] : undefined;
    // Authors: use best candidate or first from authors_guess
    const brAuthor = (() => {
      const cand = Array.isArray(bedrock?.author_candidates) && bedrock.author_candidates[0]?.value
        ? String(bedrock.author_candidates[0].value).trim()
        : '';
      const guess = Array.isArray(bedrock?.authors_guess) && bedrock.authors_guess[0]
        ? String(bedrock.authors_guess[0]).trim()
        : '';
      return (cand || guess) || undefined;
    })();

    // Prefer ISBN if present; otherwise use best available title/author hints
    const lookupParams = {
      isbn: existing.isbn13 || existing.isbn10,
      // Prefer multiple Bedrock titles when available; fallback to single title
      titles: Array.isArray(brTitles) && brTitles.length > 1 ? brTitles.slice(0, 3) : undefined,
      title: (Array.isArray(brTitles) && brTitles.length > 0 ? brTitles[0] : undefined) || existing.title,
      author: brAuthor || existing.author,
    };

    // Query Google metadata using derived hints
    const metadata = await bookMetadataService.searchBookMetadata(lookupParams);

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
        averageRating: metadata.averageRating ?? null,
        ratingsCount: metadata.ratingsCount ?? null,
        price: metadata.price || null,
        buyLink: metadata.buyLink || null,
        isEbook: metadata.isEbook,
      },
    };

    await Book.update(bookId, existing.userId, update);
    // Publish post-enrichment event for downstream processors (e.g., MCP OCR)
    if (process.env.NODE_ENV !== 'test') {
      try {
        await publishEvent('Book.GoogleMetadataEnriched', {
          bookId,
          userId: existing.userId,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[EnrichGoogleMetadata] Failed to publish GoogleMetadataEnriched:', e.message);
      }
    }
    return success({ bookId, enriched: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[EnrichGoogleMetadata] Error:', e);
    return error(e.message || 'Failed to enrich google metadata', 500);
  }
};
