const response = require('../../lib/response');
const textractService = require('../../lib/textract-service');

/**
 * Process multiple images for metadata extraction
 * Includes non-book detection based on extracted text patterns
 */
module.exports.handler = async (event) => {
  try {
    // Derive userId from Cognito authorizer claims (configured in API Gateway)
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    const data = JSON.parse(event.body);

    // Support both single image and multiple images processing
    const isBulkProcess = Array.isArray(data.images);
    const imagesToProcess = isBulkProcess ? data.images : [{ s3Bucket: data.s3Bucket, s3Key: data.s3Key }];

    if (imagesToProcess.length === 0) {
      return response.validationError({
        images: 'At least one image is required for processing',
      });
    }

    // Validate input for each image
    for (let i = 0; i < imagesToProcess.length; i++) {
      const image = imagesToProcess[i];
      if (!image.s3Bucket || !image.s3Key) {
        return response.validationError({
          [`images[${i}]`]: 'Both s3Bucket and s3Key are required for each image',
        });
      }
    }

    console.log(`[ImageMetadata] Processing ${imagesToProcess.length} image(s) for user ${userId}`);
    
    const results = [];
    let bestBookMetadata = null;
    let highestConfidence = 0;

    // Process each image
    for (let i = 0; i < imagesToProcess.length; i++) {
      const image = imagesToProcess[i];
      console.log(`[ImageMetadata] Processing image ${i + 1}/${imagesToProcess.length}: s3://${image.s3Bucket}/${image.s3Key}`);
      
      try {
        const extractionResult = await textractService.extractTextFromImage(image.s3Bucket, image.s3Key);
        
        if (!extractionResult) {
          results.push({
            imageIndex: i,
            s3Key: image.s3Key,
            success: false,
            error: 'Failed to extract text from image',
            isBook: false,
          });
          continue;
        }

        const { extractedText, bookMetadata, confidence } = extractionResult;

        // Enhanced non-book detection
        const isBook = detectIfImageIsBook(extractedText.fullText, bookMetadata);

        const imageResult = {
          imageIndex: i,
          s3Key: image.s3Key,
          success: true,
          metadata: bookMetadata,
          extractedText: extractedText.fullText,
          confidence,
          isBook,
          textBlocks: extractedText.blocks,
          summary: {
            hasTitle: !!bookMetadata.title,
            hasAuthor: !!bookMetadata.author,
            hasISBN: !!bookMetadata.isbn,
            hasPublisher: !!bookMetadata.publisher,
            hasPublishedDate: !!bookMetadata.publishedDate,
          },
        };

        // Track the best book metadata (highest confidence book image)
        if (isBook && confidence > highestConfidence) {
          bestBookMetadata = bookMetadata;
          highestConfidence = confidence;
        }

        results.push(imageResult);

        console.log(`[ImageMetadata] Image ${i + 1} processed: ${confidence}% confidence, isBook: ${isBook}`);
      } catch (error) {
        console.error(`[ImageMetadata] Error processing image ${i + 1}:`, error);
        results.push({
          imageIndex: i,
          s3Key: image.s3Key,
          success: false,
          error: error.message || 'Processing failed',
          isBook: false,
        });
      }
    }

    // Calculate summary statistics
    const bookImages = results.filter(r => r.success && r.isBook);
    const nonBookImages = results.filter(r => r.success && !r.isBook);
    const failedImages = results.filter(r => !r.success);

    const responseData = {
      results,
      summary: {
        totalImages: imagesToProcess.length,
        bookImages: bookImages.length,
        nonBookImages: nonBookImages.length,
        failedImages: failedImages.length,
        bestMetadata: bestBookMetadata,
        highestConfidence,
      },
      recommendations: generateRecommendations(results),
    };

    // For single image processing, maintain backward compatibility
    if (!isBulkProcess && results.length === 1) {
      const singleResult = results[0];
      if (singleResult.success) {
        return response.success({
          metadata: singleResult.metadata,
          extractedText: singleResult.extractedText,
          confidence: singleResult.confidence,
          isBook: singleResult.isBook,
          textBlocks: singleResult.textBlocks,
          summary: singleResult.summary,
        });
      } else {
        return response.error(new Error(singleResult.error), 500);
      }
    }

    return response.success(responseData);
  } catch (error) {
    console.error('[ImageMetadata] Error:', error);
    return response.error(error);
  }
};

/**
 * Detect if an image contains a book based on extracted text and metadata
 */
function detectIfImageIsBook(extractedText, metadata) {
  if (!extractedText) {
    return false;
  }

  const text = extractedText.toLowerCase();
  
  // Strong indicators that this is a book
  const bookIndicators = [
    // Common book metadata
    metadata.title && metadata.title.length > 0,
    metadata.author && metadata.author.length > 0,
    metadata.isbn && metadata.isbn.length > 0,
    metadata.publisher && metadata.publisher.length > 0,
    
    // Text patterns common on book covers
    text.includes('isbn'),
    text.includes('publisher'),
    text.includes('bestseller'),
    text.includes('novel'),
    text.includes('edition'),
    text.includes('copyright'),
    text.includes('author'),
    text.includes('book'),
    
    // Common book phrases
    text.includes('new york times'),
    text.includes('times bestseller'),
    text.includes('national bestseller'),
    text.includes('acclaimed author'),
    text.includes('winner of'),
    text.includes('pulitzer'),
    text.includes('award-winning'),
  ];

  // Non-book indicators (things that suggest this is NOT a book)
  const nonBookIndicators = [
    text.includes('receipt'),
    text.includes('invoice'),
    text.includes('menu'),
    text.includes('restaurant'),
    text.includes('price list'),
    text.includes('total:'),
    text.includes('subtotal'),
    text.includes('tax'),
    text.includes('payment'),
    text.includes('credit card'),
    text.includes('thank you for'),
    text.includes('visit us'),
    text.includes('website'),
    text.includes('follow us'),
    text.includes('facebook'),
    text.includes('instagram'),
    text.includes('twitter'),
    text.includes('@'),
    text.includes('http'),
    text.includes('www.'),
    text.includes('.com'),
    text.includes('phone:'),
    text.includes('address:'),
    text.includes('email:'),
  ];

  const bookScore = bookIndicators.filter(Boolean).length;
  const nonBookScore = nonBookIndicators.filter(Boolean).length;

  // If we have strong non-book indicators, classify as non-book
  if (nonBookScore >= 3) {
    return false;
  }

  // If we have book metadata or book-specific text, classify as book
  if (bookScore >= 2) {
    return true;
  }

  // If text is very short (< 10 characters), likely not a book cover
  if (extractedText.trim().length < 10) {
    return false;
  }

  // Default to book if unclear (conservative approach)
  return true;
}

/**
 * Generate recommendations based on processing results
 */
function generateRecommendations(results) {
  const recommendations = [];
  
  const nonBookImages = results.filter(r => r.success && !r.isBook);
  const lowConfidenceImages = results.filter(r => r.success && r.confidence < 50);
  const failedImages = results.filter(r => !r.success);

  if (nonBookImages.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `${nonBookImages.length} image(s) appear to not be book covers. Consider removing them.`,
      imageIndices: nonBookImages.map(r => r.imageIndex),
    });
  }

  if (lowConfidenceImages.length > 0) {
    recommendations.push({
      type: 'info',
      message: `${lowConfidenceImages.length} image(s) have low confidence text extraction. Consider using clearer images.`,
      imageIndices: lowConfidenceImages.map(r => r.imageIndex),
    });
  }

  if (failedImages.length > 0) {
    recommendations.push({
      type: 'error',
      message: `${failedImages.length} image(s) failed to process. Please try different images.`,
      imageIndices: failedImages.map(r => r.imageIndex),
    });
  }

  return recommendations;
}