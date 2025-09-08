const response = require('../../lib/response');
const ocrService = require('../../lib/ocr-service');
const bookMetadataService = require('../../lib/book-metadata');

module.exports.handler = async (event) => {
  try {
    // Derive userId from Cognito authorizer claims
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    const data = JSON.parse(event.body);

    // Validate input - need S3 bucket and key for the uploaded image
    if (!data.bucket || !data.key) {
      return response.validationError({
        bucket: data.bucket ? undefined : 'S3 bucket is required',
        key: data.key ? undefined : 'S3 key is required',
      });
    }

    console.log(`[OCRMetadata] Processing image s3://${data.bucket}/${data.key}`);

    // Step 1: Extract text from image using OCR
    const ocrResult = await ocrService.extractTextFromImage(data.bucket, data.key);
    console.log('[OCRMetadata] OCR extraction completed:', {
      isbn: ocrResult.isbn,
      title: ocrResult.title,
      author: ocrResult.author,
      confidence: ocrResult.confidence
    });

    // Step 2: Search for metadata using extracted text
    let metadata = null;
    if (ocrResult.isbn || ocrResult.title || ocrResult.author) {
      console.log('[OCRMetadata] Searching for book metadata...');
      
      try {
        metadata = await bookMetadataService.searchBookMetadata({
          isbn: ocrResult.isbn,
          title: ocrResult.title,
          author: ocrResult.author
        });
        
        if (metadata) {
          console.log('[OCRMetadata] Metadata found from:', metadata.source);
        } else {
          console.log('[OCRMetadata] No metadata found for extracted text');
        }
      } catch (error) {
        console.error('[OCRMetadata] Metadata search failed:', error);
        // Continue without metadata - OCR results are still valuable
      }
    }

    // Step 3: Return combined results
    const result = {
      ocr: {
        isbn: ocrResult.isbn,
        title: ocrResult.title,
        author: ocrResult.author,
        confidence: ocrResult.confidence,
        rawText: ocrResult.rawText
      },
      metadata: metadata,
      suggestions: {
        // Provide book data suggestions based on OCR + metadata
        title: metadata?.title || ocrResult.title,
        author: metadata?.authors?.[0] || ocrResult.author,
        description: metadata?.description,
        isbn: metadata?.isbn13 || metadata?.isbn10 || ocrResult.isbn,
        coverImage: metadata?.thumbnail,
        publisher: metadata?.publisher,
        publishedDate: metadata?.publishedDate,
        pageCount: metadata?.pageCount,
        categories: metadata?.categories,
        language: metadata?.language
      }
    };

    return response.success(result);
  } catch (error) {
    console.error('[OCRMetadata] Error processing image:', error);
    return response.error(error);
  }
};