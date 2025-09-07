const response = require('../../lib/response');
const Book = require('../../models/book');
const bookMetadataService = require('../../lib/book-metadata');

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
    if (!data.title || !data.author) {
      return response.validationError({
        title: data.title ? undefined : 'Title is required',
        author: data.author ? undefined : 'Author is required',
      });
    }

    // Prepare book data
    let bookData = {
      title: data.title,
      author: data.author,
      description: data.description,
      coverImage: data.coverImage,
      status: data.status,
    };

    // Optional metadata enrichment
    if (data.enrichWithMetadata || data.isbn) {
      try {
        console.log('[BookCreate] Attempting metadata enrichment...');
        const metadata = await bookMetadataService.searchBookMetadata({
          isbn: data.isbn,
          title: data.title,
          author: data.author,
        });

        if (metadata) {
          console.log('[BookCreate] Metadata found, enriching book data');
          // Enrich with metadata, but preserve user input if provided
          bookData = {
            ...bookData,
            // Only use metadata for empty fields
            description: bookData.description || metadata.description,
            coverImage: bookData.coverImage || metadata.thumbnail,
            // Add metadata fields that weren't in original schema
            isbn10: metadata.isbn10,
            isbn13: metadata.isbn13,
            publishedDate: metadata.publishedDate,
            pageCount: metadata.pageCount,
            categories: metadata.categories,
            language: metadata.language,
            publisher: metadata.publisher,
            metadataSource: metadata.source,
          };
        }
      } catch (error) {
        console.error('[BookCreate] Metadata enrichment failed:', error);
        // Continue with original data - metadata enrichment failure shouldn't break book creation
      }
    }

    const created = await Book.create(bookData, userId);

    return response.success(created, 201);
  } catch (error) {
    return response.error(error);
  }
};
