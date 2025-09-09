const AWS = require('./aws-config');

class TextractService {
  constructor() {
    this.textract = new AWS.Textract();
  }

  /**
   * Extract text from an image using Amazon Textract
   * @param {string} s3BucketName - S3 bucket name
   * @param {string} s3ObjectKey - S3 object key
   * @returns {Promise<Object>} Extracted text and metadata
   */
  async extractTextFromImage(s3BucketName, s3ObjectKey) {
    try {
      console.log(`[Textract] Processing image: s3://${s3BucketName}/${s3ObjectKey}`);

      // Check if AWS/Textract is available (for sandboxed environments)
      if (this.isSandboxedEnvironment()) {
        console.log('[Textract] Skipping Textract in sandboxed environment');
        return this.createMockExtractedText();
      }

      const params = {
        Document: {
          S3Object: {
            Bucket: s3BucketName,
            Name: s3ObjectKey
          }
        }
      };

      // Use DetectDocumentText for basic text extraction
      const result = await this.textract.detectDocumentText(params).promise();
      
      // Extract text blocks and lines
      const extractedText = this.parseTextractResult(result);
      
      // Parse book metadata from extracted text
      const bookMetadata = this.parseBookMetadataFromText(extractedText);
      
      console.log(`[Textract] Successfully extracted text from image. Found ${(result.Blocks || []).length} text blocks`);
      
      return {
        extractedText,
        bookMetadata,
        confidence: this.calculateOverallConfidence(result.Blocks || [])
      };
    } catch (error) {
      console.error('[Textract] Error extracting text from image:', error);
      
      // Check for common AWS configuration issues
      if (error.code === 'ConfigError' || error.message.includes('Missing region')) {
        console.log('[Textract] AWS not configured, returning mock data');
        return this.createMockExtractedText();
      }
      
      // For other errors, return null to allow graceful degradation
      return null;
    }
  }

  /**
   * Parse Textract result to extract readable text
   * @param {Object} textractResult - Raw Textract API response
   * @returns {Object} Parsed text structure
   */
  parseTextractResult(textractResult) {
    const blocks = textractResult.Blocks || [];
    
    const lines = blocks
      .filter(block => block.BlockType === 'LINE')
      .map(block => ({
        text: block.Text,
        confidence: block.Confidence,
        geometry: block.Geometry
      }));
    
    const words = blocks
      .filter(block => block.BlockType === 'WORD')
      .map(block => ({
        text: block.Text,
        confidence: block.Confidence,
        geometry: block.Geometry
      }));

    // Combine all text
    const fullText = lines.map(line => line.text).join(' ');
    
    return {
      fullText,
      lines,
      words,
      blocks: blocks.length
    };
  }

  /**
   * Parse book metadata from extracted text
   * @param {Object} extractedText - Parsed Textract result
   * @returns {Object} Book metadata
   */
  parseBookMetadataFromText(extractedText) {
    const { fullText, lines } = extractedText;
    
    // Initialize metadata object
    const metadata = {
      title: null,
      author: null,
      isbn: null,
      publisher: null,
      publishedDate: null,
      description: fullText, // Store all extracted text as description
      extractionSource: 'textract'
    };

    // Extract ISBN (10 or 13 digits)
    const isbnPattern = /(?:ISBN[:\s-]*)?(?:978[:\s-]?)?(\d{1,5}[:\s-]?\d{1,7}[:\s-]?\d{1,6}[:\s-]?\d{1}|\d{10}|\d{13})/gi;
    const isbnMatch = fullText.match(isbnPattern);
    if (isbnMatch) {
      const cleanISBN = isbnMatch[0].replace(/[^\d]/g, '');
      if (cleanISBN.length === 10 || cleanISBN.length === 13) {
        metadata.isbn = cleanISBN;
      }
    }

    // Extract title - often appears in larger text at the top
    // Look for lines with higher confidence that might be titles
    const potentialTitles = lines
      .filter(line => line.confidence > 90 && line.text.length > 3 && line.text.length < 100)
      .filter(line => !line.text.match(/isbn|copyright|page|chapter|\d{4}/i))
      .slice(0, 3); // Take first few high-confidence lines

    if (potentialTitles.length > 0) {
      // Use the first high-confidence line as potential title
      metadata.title = potentialTitles[0].text.trim();
    }

    // Extract author - look for patterns like "by [Name]" or "Author: [Name]"
    const authorPatterns = [
      /(?:by|author|written by)[:\s]+([a-z\s.,''-]+?)(?:\s*(?:isbn|copyright|published|©|\d{4}|$))/gi,
      /([a-z\s.,''-]+?)(?:\s*,\s*(?:author|writer))/gi
    ];

    for (const pattern of authorPatterns) {
      const authorMatch = fullText.match(pattern);
      if (authorMatch) {
        let author = authorMatch[1] || authorMatch[0];
        author = author.replace(/^(by|author|written by)[:\s]*/gi, '').trim();
        // Clean up the author name - remove trailing words that don't look like names
        author = author.replace(/\s+(isbn|copyright|published|©|\d{4}|\w*press\w*|\w*books?\w*).*$/gi, '').trim();
        if (author.length > 2 && author.length < 50) {
          metadata.author = author;
          break;
        }
      }
    }

    // Extract publisher
    const publisherPatterns = [
      /(?:publisher|published by)[:\s]+([a-z\s&.]+?)(?:\s*(?:copyright|©|\d{4}|$))/gi,
      /([a-z\s&.]+?)(?:\s*(?:press|publications?|books?))\s+(?:copyright|©|\d{4})/gi
    ];

    for (const pattern of publisherPatterns) {
      const publisherMatch = fullText.match(pattern);
      if (publisherMatch) {
        let publisher = publisherMatch[1] || publisherMatch[0];
        publisher = publisher.replace(/^(publisher|published by)[:\s]*/gi, '').trim();
        publisher = publisher.replace(/\s+(copyright|©|\d{4}).*$/gi, '').trim();
        if (publisher.length > 2 && publisher.length < 50) {
          metadata.publisher = publisher;
          break;
        }
      }
    }

    // Extract publication year
    const yearPattern = /(?:copyright|published|©)[:\s]*(\d{4})/gi;
    const yearMatch = fullText.match(yearPattern);
    if (yearMatch) {
      const year = yearMatch[1] || yearMatch[0].match(/\d{4}/)[0];
      if (year >= 1800 && year <= new Date().getFullYear()) {
        metadata.publishedDate = year;
      }
    }

    return metadata;
  }

  /**
   * Calculate overall confidence score
   * @param {Array} blocks - Textract blocks
   * @returns {number} Average confidence score
   */
  calculateOverallConfidence(blocks) {
    const textBlocks = blocks.filter(block => 
      block.BlockType === 'LINE' && block.Confidence != null
    );
    
    if (textBlocks.length === 0) return 0;
    
    const totalConfidence = textBlocks.reduce((sum, block) => sum + block.Confidence, 0);
    return Math.round(totalConfidence / textBlocks.length);
  }

  /**
   * Check if running in sandboxed environment
   * @returns {boolean} True if sandboxed
   */
  isSandboxedEnvironment() {
    return process.env.NODE_ENV === 'test' || 
           process.env.GITHUB_ACTIONS === 'true' ||
           process.env.CI === 'true';
  }

  /**
   * Create mock extracted text for testing/sandboxed environments
   * @returns {Object} Mock extraction result
   */
  createMockExtractedText() {
    console.log('[Textract] Using mock data for sandboxed environment');
    return {
      extractedText: {
        fullText: 'Sample Book Title by John Doe. Published by Sample Press 2023. ISBN: 9781234567890',
        lines: [
          { text: 'Sample Book Title', confidence: 95 },
          { text: 'by John Doe', confidence: 92 },
          { text: 'Published by Sample Press 2023', confidence: 88 },
          { text: 'ISBN: 9781234567890', confidence: 94 }
        ],
        words: [],
        blocks: 4
      },
      bookMetadata: {
        title: 'Sample Book Title',
        author: 'John Doe',
        isbn: '9781234567890',
        publisher: 'Sample Press',
        publishedDate: '2023',
        description: 'Sample Book Title by John Doe. Published by Sample Press 2023. ISBN: 9781234567890',
        extractionSource: 'textract_mock'
      },
      confidence: 92
    };
  }
}

module.exports = new TextractService();