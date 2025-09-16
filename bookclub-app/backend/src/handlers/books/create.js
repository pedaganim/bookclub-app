const response = require('../../lib/response');
const Book = require('../../models/book');
const bookMetadataService = require('../../lib/book-metadata');
const textractService = require('../../lib/textract-service');
const imageMetadataService = require('../../lib/image-metadata-service');

/**
 * Helper function to assign ISBN based on extracted metadata
 * @param {string} existingIsbn10 - Existing ISBN-10 value
 * @param {string} existingIsbn13 - Existing ISBN-13 value
 * @param {string} extractedIsbn - ISBN extracted from image
 * @returns {Object} Object with isbn10 and isbn13 properties
 */
function assignIsbnFromMetadata(existingIsbn10, existingIsbn13, extractedIsbn) {
  const result = {
    isbn10: existingIsbn10,
    isbn13: existingIsbn13
  };

  if (!extractedIsbn) {
    return result;
  }

  if (!existingIsbn10 && extractedIsbn.length === 10) {
    result.isbn10 = extractedIsbn;
  }
  
  if (!existingIsbn13 && extractedIsbn.length === 13) {
    result.isbn13 = extractedIsbn;
  }

  return result;
}

// --- Handler (moved to top for readability) ---
module.exports.handler = async (event) => {
  try {
    const userId = getUserIdFromEvent(event);
    if (!userId) return response.unauthorized('Missing or invalid authentication');

    const data = parseBody(event);
    const isExtractingFromImage = isTextractFlow(data);
    const initialValidationError = validateInitialInput(data, isExtractingFromImage);
    if (initialValidationError) return initialValidationError;

    // Build minimal book data only; do NOT enrich here. All enrichment is deferred to later events.
    const bookData = buildInitialBookData(data);

    const finalValidationError = validateFinalBookData(bookData, isExtractingFromImage);
    if (finalValidationError) return finalValidationError;

    const created = await Book.create(bookData, userId);
    return response.success(created, 201);
  } catch (error) {
    return response.error(error);
  }
};

// --- Helpers ---
const getUserIdFromEvent = (event) => {
  const claims = event?.requestContext?.authorizer?.claims;
  return claims?.sub || null;
};

const parseBody = (event) => {
  try {
    return JSON.parse(event.body || '{}');
  } catch (e) {
    return {};
  }
};

const isTextractFlow = (data) => Boolean(data.extractFromImage && data.s3Bucket && data.s3Key);

const validateInitialInput = (data, isExtracting) => {
  // When extracting from image, allow minimal payload (no title/author required)
  if (!isExtracting && (!data.title || !data.author)) {
    return response.validationError({
      title: data.title ? undefined : 'Title is required',
      author: data.author ? undefined : 'Author is required',
    });
  }
  return null;
};

const buildInitialBookData = (data) => ({
  title: data.title,
  author: data.author,
  description: data.description,
  coverImage: data.coverImage,
  images: data.images, // Support for additional images
  status: data.status,
  // Persist original upload location for downstream processors
  s3Bucket: data.s3Bucket,
  s3Key: data.s3Key,
});

// Enrichment removed from create handler to ensure minimal creation only.
const maybeEnrichWithMetadata = async (_data, bookData) => bookData;

// Textract extraction removed from create handler to defer enrichment to later events.
const maybeApplyTextractExtraction = async (_data, bookData) => bookData;

const validateFinalBookData = (bookData, isExtracting) => {
  // When extracting from image, allow minimal creation without title/author
  if (isExtracting) return null;
  if (bookData.title && bookData.author) return null;
  const missingFields = [];
  if (!bookData.title) missingFields.push('title');
  if (!bookData.author) missingFields.push('author');
  return response.validationError({
    extraction: `Could not extract required fields: ${missingFields.join(', ')}. Please provide them manually or try a different image.`
  });
};

// end handlers
