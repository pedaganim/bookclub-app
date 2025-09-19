const Book = require('../../models/book');
const textractService = require('../../lib/textract-service');
const bookMetadataService = require('../../lib/book-metadata');
const imagePreprocessingService = require('../../lib/image-preprocessing');
const barcodeDetectionService = require('../../lib/barcode-detection');
const visionLLMService = require('../../lib/vision-llm');
const strandsAgentService = require('../../lib/strands-agent');
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
    
    // Step 1: Advanced image preprocessing for better accuracy
    console.log('[MetadataExtractor] Phase 1a: Image preprocessing');
    const preprocessingResult = await imagePreprocessingService.preprocessImage(bucket, key, {
      deskew: true,
      denoise: true,
      normalize: true,
      enhanceContrast: true,
      createVariants: true
    });

    // Step 2: Barcode detection for fast ISBN lookup
    console.log('[MetadataExtractor] Phase 1b: Barcode detection');
    const barcodeResult = await barcodeDetectionService.detectBarcodes(bucket, key, {
      formats: ['EAN-13', 'ISBN-13', 'ISBN-10'],
      confidenceThreshold: 0.8
    });

    // Step 3: OCR extraction using existing Textract service
    console.log('[MetadataExtractor] Phase 1c: OCR text extraction');
    const textractResult = await textractService.extractTextFromImage(bucket, key);
    
    // Step 4: Strands Agent orchestrated vision analysis for advanced parsing
    console.log('[MetadataExtractor] Phase 1d: Strands Agent vision analysis');
    
    // Create and configure Strands Agent
    const agentId = `metadata-extraction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const agent = strandsAgentService.createAgent(agentId, {
      strategy: process.env.STRANDS_STRATEGY || 'best-effort', // best-effort, cost-optimized, accuracy-first
      fallbackEnabled: true,
      enrichWithGoogle: false, // We'll handle Google enrichment separately
      confidenceThreshold: 0.7,
      maxStrandAttempts: 3
    });

    // Execute Strands Agent analysis
    const strandsResult = await strandsAgentService.executeAnalysis(
      agentId, 
      bucket, 
      key, 
      {} // metadata will be set by the main handler
    );

    // Clean up agent after completion
    strandsAgentService.cleanupAgent(agentId);

    // Convert Strands result to match expected format for backward compatibility
    const visionResult = strandsResult.success ? {
      success: true,
      provider: 'strands-agent',
      metadata: strandsResult.metadata,
      confidence: strandsResult.confidence,
      processingTime: strandsResult.processingTime,
      workflow: strandsResult.workflow,
      cost: strandsResult.cost
    } : {
      success: false,
      error: strandsResult.error,
      workflow: strandsResult.workflow
    };

    // Validate that we have at least one successful extraction
    const hasTextract = textractResult && textractResult.bookMetadata;
    const hasBarcode = barcodeResult && barcodeResult.success;
    const hasVision = visionResult && visionResult.success;

    if (!hasTextract && !hasBarcode && !hasVision) {
      return { success: false, error: 'All extraction methods failed' };
    }

    return {
      success: true,
      data: {
        preprocessing: preprocessingResult,
        barcode: barcodeResult,
        textract: textractResult,
        vision: visionResult
      }
    };
    
  } catch (error) {
    console.error('[MetadataExtractor] Error in extractMetadataFromImage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Phase 2: Build advanced metadata structure with confidence and provenance
 */
async function buildAdvancedMetadata(extractionData, bucket, key) {
  const { preprocessing, barcode, textract, vision } = extractionData;
  
  console.log('[MetadataExtractor] Phase 2: Building advanced metadata structure');
  
  // Initialize metadata structure
  const advancedMetadata = {
    extractedAt: new Date().toISOString(),
    source: { bucket, key },
    metadata: {},
    confidence: {},
    provenance: {},
    overallConfidence: 0
  };

  // Step 1: Extract ISBN from barcode (highest priority)
  let primaryISBN = null;
  if (barcode?.success && barcode.isbns?.length > 0) {
    const isbnData = barcode.isbns[0]; // Use first detected ISBN
    primaryISBN = isbnData.isbn13 || isbnData.isbn10;
    
    advancedMetadata.metadata.isbn10 = isbnData.isbn10;
    advancedMetadata.metadata.isbn13 = isbnData.isbn13;
    advancedMetadata.confidence.isbn = isbnData.confidence;
    advancedMetadata.provenance.barcode = {
      type: 'isbn_barcode',
      confidence: isbnData.confidence,
      position: isbnData.position,
      format: isbnData.format
    };
  }

  // Step 2: Extract metadata from Textract OCR
  if (textract?.bookMetadata) {
    const { bookMetadata, extractedText, confidence } = textract;
    
    // Use textract data if no barcode ISBN found
    if (!primaryISBN && bookMetadata.isbn) {
      primaryISBN = bookMetadata.isbn;
      advancedMetadata.metadata.isbn13 = bookMetadata.isbn.length === 13 ? bookMetadata.isbn : null;
      advancedMetadata.metadata.isbn10 = bookMetadata.isbn.length === 10 ? bookMetadata.isbn : null;
    }
    
    advancedMetadata.metadata.title = bookMetadata.title || null;
    advancedMetadata.metadata.author = bookMetadata.author || null;
    advancedMetadata.metadata.publisher = bookMetadata.publisher || null;
    advancedMetadata.metadata.publishedDate = bookMetadata.publishedDate || null;
    advancedMetadata.metadata.description = bookMetadata.description || extractedText.fullText || null;
    
    // Textract confidence scores
    advancedMetadata.confidence.title = bookMetadata.title ? confidence || 0 : 0;
    advancedMetadata.confidence.author = bookMetadata.author ? confidence || 0 : 0;
    advancedMetadata.confidence.publisher = bookMetadata.publisher ? confidence || 0 : 0;
    
    advancedMetadata.provenance.textract = {
      extractedText: extractedText.fullText,
      confidence: confidence || 0,
      textBlocks: extractedText.blocks?.length || 0
    };
  }

  // Step 3: Enhance with Vision LLM analysis
  if (vision?.success && vision.metadata) {
    const visionMetadata = vision.metadata;
    const visionConfidence = vision.confidence;
    
    // Use vision data to enhance or validate OCR results
    if (visionMetadata.title && (!advancedMetadata.metadata.title || visionConfidence.title > advancedMetadata.confidence.title)) {
      advancedMetadata.metadata.title = visionMetadata.title;
      advancedMetadata.confidence.title = visionConfidence.title || 0.8;
    }
    
    if (visionMetadata.authors?.length > 0) {
      advancedMetadata.metadata.author = visionMetadata.authors.join(', ');
      advancedMetadata.confidence.author = Math.max(advancedMetadata.confidence.author || 0, visionConfidence.authors || 0.8);
    }
    
    // Vision-specific metadata
    advancedMetadata.metadata.subtitle = visionMetadata.subtitle || null;
    advancedMetadata.metadata.series = visionMetadata.series || null;
    advancedMetadata.metadata.edition = visionMetadata.edition || null;
    advancedMetadata.metadata.categories = visionMetadata.categories || [];
    advancedMetadata.metadata.language = visionMetadata.language || null;
    
    advancedMetadata.provenance.vision = {
      provider: vision.provider,
      model: vision.model,
      confidence: visionConfidence.overall,
      visualAnalysis: visionMetadata.visualAnalysis
    };
  }

  // Step 4: Catalog lookup for authoritative metadata
  if (primaryISBN) {
    try {
      console.log('[MetadataExtractor] Phase 2b: Catalog lookup for ISBN:', primaryISBN);
      const catalogMetadata = await bookMetadataService.searchBookMetadata({ isbn: primaryISBN });
      
      if (catalogMetadata) {
        // Catalog data has highest authority for factual information
        if (catalogMetadata.title) {
          advancedMetadata.metadata.title = catalogMetadata.title;
          advancedMetadata.confidence.title = 0.95; // High confidence for catalog data
        }
        
        if (catalogMetadata.authors) {
          const authors = Array.isArray(catalogMetadata.authors) ? catalogMetadata.authors.join(', ') : catalogMetadata.authors;
          advancedMetadata.metadata.author = authors;
          advancedMetadata.confidence.author = 0.95;
        }
        
        if (catalogMetadata.publisher) {
          advancedMetadata.metadata.publisher = catalogMetadata.publisher;
          advancedMetadata.confidence.publisher = 0.95;
        }
        
        if (catalogMetadata.publishedDate) {
          advancedMetadata.metadata.publishedDate = catalogMetadata.publishedDate;
          advancedMetadata.confidence.publishedDate = 0.95;
        }
        
        // Additional catalog-only fields
        advancedMetadata.metadata.pageCount = catalogMetadata.pageCount || null;
        advancedMetadata.metadata.language = catalogMetadata.language || advancedMetadata.metadata.language;
        
        advancedMetadata.provenance.catalog = {
          source: catalogMetadata.source,
          confidence: 0.95,
          data: catalogMetadata
        };
      }
    } catch (error) {
      console.warn('[MetadataExtractor] Catalog lookup failed:', error.message);
    }
  }

  // Step 5: Calculate overall confidence score
  advancedMetadata.overallConfidence = calculateOverallConfidence(advancedMetadata.confidence, advancedMetadata.provenance);

  console.log(`[MetadataExtractor] Advanced metadata built with ${advancedMetadata.overallConfidence}% overall confidence`);
  return advancedMetadata;
}

/**
 * Calculate overall confidence score based on available data sources
 */
function calculateOverallConfidence(confidence, provenance) {
  const weights = {
    catalog: 0.4,    // Highest weight for authoritative catalog data
    barcode: 0.3,    // High weight for barcode ISBN
    vision: 0.2,     // Medium weight for AI vision analysis
    textract: 0.1    // Lower weight for basic OCR
  };
  
  const sources = Object.keys(provenance);
  const fieldWeights = { title: 0.3, author: 0.3, isbn: 0.25, publisher: 0.15 };
  
  let totalScore = 0;
  let maxPossibleScore = 0;
  
  // Calculate weighted confidence for each field
  Object.entries(fieldWeights).forEach(([field, fieldWeight]) => {
    if (confidence[field] > 0) {
      // Boost confidence based on data source quality
      let sourceMultiplier = 1.0;
      if (provenance.catalog && field !== 'isbn') sourceMultiplier = 1.2;
      else if (provenance.barcode && field === 'isbn') sourceMultiplier = 1.2;
      else if (provenance.vision) sourceMultiplier = 1.1;
      
      const fieldScore = Math.min(confidence[field] * sourceMultiplier, 1.0);
      totalScore += fieldScore * fieldWeight;
    }
    maxPossibleScore += fieldWeight;
  });
  
  return maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
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