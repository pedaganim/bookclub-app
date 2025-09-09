const response = require('../../lib/response');
const Book = require('../../models/book');
const bookMetadataService = require('../../lib/book-metadata');
const textractService = require('../../lib/textract-service');

module.exports.handler = async (event) => {
  try {
    // Derive userId from Cognito authorizer claims (configured in API Gateway)
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    const data = JSON.parse(event.body);

    // Validate input - title and author are required unless extracting from image
    const isExtractingFromImage = data.extractFromImage && data.s3Bucket && data.s3Key;
    
    if (!isExtractingFromImage && (!data.title || !data.author)) {
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

    // Textract image metadata extraction
    if (data.extractFromImage && data.s3Bucket && data.s3Key) {
      try {
        console.log('[BookCreate] Attempting Textract metadata extraction...');
        const extractionResult = await textractService.extractTextFromImage(data.s3Bucket, data.s3Key);
        
        if (extractionResult && extractionResult.bookMetadata) {
          const { bookMetadata, extractedText } = extractionResult;
          console.log('[BookCreate] Textract extraction successful');
          
          // Merge Textract metadata, preserving user input and previous metadata
          bookData = {
            ...bookData,
            // Use Textract data only for empty fields, prioritizing user input
            title: bookData.title || bookMetadata.title,
            author: bookData.author || bookMetadata.author,
            description: bookData.description || bookMetadata.description,
            isbn10: bookData.isbn10 || (bookMetadata.isbn && bookMetadata.isbn.length === 10 ? bookMetadata.isbn : null),
            isbn13: bookData.isbn13 || (bookMetadata.isbn && bookMetadata.isbn.length === 13 ? bookMetadata.isbn : null),
            publisher: bookData.publisher || bookMetadata.publisher,
            publishedDate: bookData.publishedDate || bookMetadata.publishedDate,
            textractExtractedText: extractedText.fullText,
            textractConfidence: extractionResult.confidence,
            textractSource: bookMetadata.extractionSource,
          };
        }
      } catch (error) {
        console.error('[BookCreate] Textract extraction failed:', error);
        // Continue with original data - Textract failure shouldn't break book creation
      }
    }

    // Final validation - ensure we have at least title and author after all enrichment
    if (!bookData.title || !bookData.author) {
      const missingFields = [];
      if (!bookData.title) missingFields.push('title');
      if (!bookData.author) missingFields.push('author');
      
      return response.validationError({
        extraction: `Could not extract required fields: ${missingFields.join(', ')}. Please provide them manually or try a different image.`
      });
    }

    const created = await Book.create(bookData, userId);

    return response.success(created, 201);
  } catch (error) {
    return response.error(error);
  }
};
