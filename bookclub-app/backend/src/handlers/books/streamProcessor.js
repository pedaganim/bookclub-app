const { publishEvent } = require('../../lib/event-bus');
const textractService = require('../../lib/textract-service');
const Book = require('../../models/book');

// Helper to read DynamoDB attribute values from stream images
function readAttr(image, key) {
  if (!image || !image[key]) return undefined;
  const val = image[key];
  // Minimal handling for common DynamoDB types in Document Streams
  if (val.S !== undefined) return val.S;
  if (val.N !== undefined) return Number(val.N);
  if (val.BOOL !== undefined) return Boolean(val.BOOL);
  if (val.M !== undefined) return val.M; // raw map
  if (val.L !== undefined) return val.L; // raw list
  return val; // fallback
}

module.exports.handler = async (event) => {
  const enable = String(process.env.ENABLE_STREAM_ENRICHMENT || 'false') === 'true';
  if (!enable) {
    console.log('[BooksStream] ENABLE_STREAM_ENRICHMENT is not true; skipping');
    return { skipped: true };
  }

  const results = [];

  for (const record of event.Records || []) {
    try {
      if (record.eventName !== 'INSERT' && record.eventName !== 'MODIFY') {
        continue;
      }

      const newImage = record.dynamodb?.NewImage;
      if (!newImage) continue;

      const bookId = readAttr(newImage, 'bookId');
      const userId = readAttr(newImage, 'userId');
      const s3Bucket = readAttr(newImage, 's3Bucket');
      const s3Key = readAttr(newImage, 's3Key');
      const alreadyTextractedAt = readAttr(newImage, 'textractExtractedAt');

      // Idempotency/guard: if both clean_description and google_metadata exist, skip
      const hasClean = !!readAttr(newImage, 'clean_description');
      const hasGoogle = !!readAttr(newImage, 'google_metadata');
      if (hasClean && hasGoogle) {
        continue;
      }

      if (!bookId || !userId) {
        console.warn('[BooksStream] Missing bookId/userId in new image; skipping');
        continue;
      }

      // Textract-first: if we have image location and textract not yet applied, run it
      if (s3Bucket && s3Key && !alreadyTextractedAt) {
        try {
          console.log(`[BooksStream] Running Textract for ${bookId} from s3://${s3Bucket}/${s3Key}`);
          const extractionResult = await textractService.extractTextFromImage(s3Bucket, s3Key);
          if (extractionResult && extractionResult.bookMetadata) {
            const { bookMetadata, extractedText } = extractionResult;
            const updated = await Book.update(bookId, userId, {
              // only set fields if missing on the item
              title: readAttr(newImage, 'title') || bookMetadata.title,
              author: readAttr(newImage, 'author') || bookMetadata.author,
              description: readAttr(newImage, 'description') || bookMetadata.description || (extractedText?.fullText || extractedText) || null,
              publisher: readAttr(newImage, 'publisher') || bookMetadata.publisher,
              publishedDate: readAttr(newImage, 'publishedDate') || bookMetadata.publishedDate,
              textractExtractedText: extractedText?.fullText || extractedText || null,
              textractConfidence: extractionResult.confidence,
              textractSource: bookMetadata.extractionSource,
              textractExtractedAt: extractionResult.extractedAt || new Date().toISOString(),
              metadataSource: readAttr(newImage, 'metadataSource') || 'textract-auto-processed',
            });
            await publishEvent('Book.TextractCompleted', {
              bookId,
              userId,
              s3Bucket,
              s3Key,
              hasDescription: !!updated?.description,
            });
            console.log(`[BooksStream] Published Book.TextractCompleted for ${bookId}`);
            results.push({ bookId, textract: true });
            continue;
          } else {
            console.log(`[BooksStream] Textract returned no metadata for ${bookId}; will request enrichment`);
          }
        } catch (texErr) {
          console.error('[BooksStream] Textract failed:', texErr);
          // Fall through to enrichment request
        }
      }

      // Fallback: publish enrichment request
      await publishEvent('Book.EnrichmentRequested', {
        bookId,
        userId,
        s3Bucket,
        s3Key,
      });
      console.log(`[BooksStream] Published Book.EnrichmentRequested for ${bookId}`);
      results.push({ bookId, enrichmentRequested: true });
    } catch (e) {
      console.error('[BooksStream] Error handling record:', e);
      results.push({ error: e.message });
    }
  }

  return { ok: true, results };
};
