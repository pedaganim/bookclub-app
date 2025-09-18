const Book = require('../../models/book');
const textractService = require('../../lib/textract-service');
const bookMetadataService = require('../../lib/book-metadata');
const { publishEvent } = require('../../lib/event-bus');

/**
 * EventBridge-triggered handler for advanced book cover metadata extraction
 * Triggered by S3.ObjectCreated events for book covers
 */
module.exports.handler = async (event) => {
  console.log('[MetadataExtractor] Processing EventBridge event:', JSON.stringify(event, null, 2));

  try {
    const { detail } = event;
    
    if (!detail) {
      console.warn('[MetadataExtractor] No detail in event');
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid event format' }) };
    }

    const { bucket, key, userId, bookId, eventType } = detail;

    if (!bucket || !key || !userId || !bookId) {
      console.warn('[MetadataExtractor] Missing required fields in event detail');
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing required fields' }) };
    }

    if (eventType !== 'book-cover-uploaded' && eventType !== 'manual-metadata-extraction') {
      console.log(`[MetadataExtractor] Skipping event type: ${eventType}`);
      return { statusCode: 200, body: JSON.stringify({ success: true, message: 'Event type not handled' }) };
    }

    console.log(`[MetadataExtractor] Processing metadata extraction for book: ${bookId}, s3://${bucket}/${key}`);

    // Phase 1: Advanced image preprocessing and text extraction
    const extractionResult = await extractMetadataFromImage(bucket, key);
    
    if (!extractionResult.success) {
      console.error(`[MetadataExtractor] Failed to extract metadata for ${bookId}`);
      return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Metadata extraction failed' }) };
    }

    // Phase 2: Create advanced metadata structure with confidence scores and provenance
    const advancedMetadata = await buildAdvancedMetadata(extractionResult.data, bucket, key);
    
    // Phase 3: Update book table with new metadata column
    await updateBookWithMetadata(bookId, userId, advancedMetadata);

    // Phase 4: Publish completion event for downstream processors
    await publishEvent('Book.MetadataExtracted', {
      bookId,
      userId,
      s3Bucket: bucket,
      s3Key: key,
      confidence: advancedMetadata.overallConfidence,
      hasTitle: !!advancedMetadata.metadata.title,
      hasAuthor: !!advancedMetadata.metadata.author,
      hasISBN: !!(advancedMetadata.metadata.isbn10 || advancedMetadata.metadata.isbn13)
    });

    console.log(`[MetadataExtractor] Successfully processed metadata extraction for book: ${bookId}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        bookId,
        confidence: advancedMetadata.overallConfidence
      })
    };

  } catch (error) {
    console.error('[MetadataExtractor] Error processing metadata extraction:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

/**
 * Phase 1: Extract metadata from image using multiple techniques
 */
async function extractMetadataFromImage(bucket, key) {
  try {
    console.log(`[MetadataExtractor] Starting advanced image processing for s3://${bucket}/${key}`);
    
    // 1. Basic OCR extraction using existing Textract service
    const textractResult = await textractService.extractTextFromImage(bucket, key);
    
    // 2. TODO: Advanced image preprocessing (deskew, denoise, normalize)
    // This would be implemented in future iterations with additional services
    
    // 3. TODO: Barcode detection for ISBN lookup
    // This would use computer vision to detect barcodes on book covers
    
    // 4. TODO: Vision LLM service integration
    // This would use OpenAI Vision API for advanced text analysis
    
    if (textractResult && textractResult.bookMetadata) {
      return {
        success: true,
        data: {
          textract: textractResult,
          // Future: barcode, visionLLM, etc.
        }
      };
    }
    
    return { success: false, error: 'No metadata extracted' };
  } catch (error) {
    console.error('[MetadataExtractor] Error in extractMetadataFromImage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Phase 2: Build advanced metadata structure with confidence and provenance
 */
async function buildAdvancedMetadata(extractionData, bucket, key) {
  const { textract } = extractionData;
  const { bookMetadata, extractedText, confidence } = textract;
  
  // Create advanced metadata structure
  const advancedMetadata = {
    extractedAt: new Date().toISOString(),
    source: {
      bucket,
      key
    },
    metadata: {
      title: bookMetadata.title || null,
      author: bookMetadata.author || null,
      isbn10: bookMetadata.isbn && bookMetadata.isbn.length === 10 ? bookMetadata.isbn : null,
      isbn13: bookMetadata.isbn && bookMetadata.isbn.length === 13 ? bookMetadata.isbn : null,
      publisher: bookMetadata.publisher || null,
      publishedDate: bookMetadata.publishedDate || null,
      description: bookMetadata.description || extractedText.fullText || null
    },
    confidence: {
      overall: confidence || 0,
      title: bookMetadata.title ? confidence || 0 : 0,
      author: bookMetadata.author ? confidence || 0 : 0,
      isbn: bookMetadata.isbn ? confidence || 0 : 0,
      publisher: bookMetadata.publisher ? confidence || 0 : 0,
      publishedDate: bookMetadata.publishedDate ? confidence || 0 : 0
    },
    provenance: {
      textract: {
        extractedText: extractedText.fullText,
        confidence: confidence || 0,
        textBlocks: extractedText.blocks?.length || 0
      }
      // Future: barcode, visionLLM, catalog lookups, etc.
    },
    overallConfidence: confidence || 0
  };

  // TODO: Phase 3: Catalog connector integration
  // If we have an ISBN, look up authoritative metadata from Google Books, Open Library
  if (bookMetadata.isbn) {
    try {
      const catalogMetadata = await bookMetadataService.searchBookMetadata({ isbn: bookMetadata.isbn });
      if (catalogMetadata) {
        // TODO: Implement resolver/ranker to merge and score candidate editions
        // For now, just add catalog data to provenance
        advancedMetadata.provenance.catalog = {
          source: catalogMetadata.source,
          confidence: 95, // Higher confidence for catalog lookups
          data: catalogMetadata
        };
        // Update overall confidence if catalog lookup was successful
        advancedMetadata.overallConfidence = Math.max(advancedMetadata.overallConfidence, 90);
      }
    } catch (error) {
      console.warn('[MetadataExtractor] Catalog lookup failed:', error.message);
    }
  }

  return advancedMetadata;
}

/**
 * Phase 3: Update book table with extracted metadata
 */
async function updateBookWithMetadata(bookId, userId, advancedMetadata) {
  const updateData = {
    // Update traditional fields
    title: advancedMetadata.metadata.title || undefined,
    author: advancedMetadata.metadata.author || undefined,
    description: advancedMetadata.metadata.description || undefined,
    isbn10: advancedMetadata.metadata.isbn10 || undefined,
    isbn13: advancedMetadata.metadata.isbn13 || undefined,
    publisher: advancedMetadata.metadata.publisher || undefined,
    publishedDate: advancedMetadata.metadata.publishedDate || undefined,
    
    // Add new advanced metadata column
    advancedMetadata: advancedMetadata,
    
    // Update metadata source
    metadataSource: 'advanced-extraction-pipeline',
    
    // Add extraction timestamp
    lastMetadataExtraction: new Date().toISOString()
  };

  // Remove undefined fields
  const cleanedData = Object.fromEntries(
    Object.entries(updateData).filter(([_, value]) => value !== undefined)
  );

  await Book.update(bookId, userId, cleanedData);
  console.log(`[MetadataExtractor] Updated book ${bookId} with advanced metadata`);
}