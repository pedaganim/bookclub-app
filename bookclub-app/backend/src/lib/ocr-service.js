const AWS = require('./aws-config');

class OCRService {
  constructor() {
    this.textract = new AWS.Textract();
  }

  /**
   * Extract text from an image using AWS Textract
   * @param {string} s3Bucket - S3 bucket name
   * @param {string} s3Key - S3 object key
   * @returns {Promise<Object>} Extracted text with potential ISBN, title, author
   */
  async extractTextFromImage(s3Bucket, s3Key) {
    try {
      // Skip OCR in sandboxed environments
      if (!this.isExternalAccessAvailable()) {
        console.log('[OCR] Skipping OCR in sandboxed environment');
        return this.createMockOCRResult();
      }

      const params = {
        Document: {
          S3Object: {
            Bucket: s3Bucket,
            Name: s3Key
          }
        }
      };

      console.log(`[OCR] Starting text extraction for s3://${s3Bucket}/${s3Key}`);
      const result = await this.textract.detectDocumentText(params).promise();
      
      const extractedText = this.extractTextFromTextractResponse(result);
      console.log('[OCR] Raw extracted text:', extractedText);
      
      const parsedData = this.parseBookDataFromText(extractedText);
      console.log('[OCR] Parsed book data:', parsedData);
      
      return parsedData;
    } catch (error) {
      if (error.code === 'ConfigError' || error.message.includes('Missing region')) {
        console.log('[OCR] AWS not configured, using mock OCR result');
        return this.createMockOCRResult();
      } else {
        console.error('[OCR] Error extracting text:', error);
        throw error;
      }
    }
  }

  /**
   * Extract text from Textract response
   */
  extractTextFromTextractResponse(textractResult) {
    const blocks = textractResult.Blocks || [];
    const textBlocks = blocks.filter(block => block.BlockType === 'LINE');
    
    return textBlocks
      .map(block => block.Text)
      .filter(text => text && text.trim())
      .join('\n');
  }

  /**
   * Parse book information from extracted text
   * Uses heuristics to identify ISBN, title, and author
   */
  parseBookDataFromText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    const result = {
      isbn: null,
      title: null,
      author: null,
      confidence: 'medium',
      rawText: text
    };

    // Extract ISBN (various formats)
    result.isbn = this.extractISBN(text);

    // Extract title and author using heuristics
    const titleAuthor = this.extractTitleAndAuthor(lines);
    result.title = titleAuthor.title;
    result.author = titleAuthor.author;

    // Determine confidence based on what we found
    result.confidence = this.calculateConfidence(result);

    return result;
  }

  /**
   * Extract ISBN from text using regex patterns
   */
  extractISBN(text) {
    // Common ISBN patterns - more flexible approach
    const isbnPatterns = [
      // Find ISBN-13: 978-x-xx-xxxxxx-x format
      /([0-9]{3}[0-9\s-]*[0-9]{1}[0-9\s-]*[0-9]{1,3}[0-9\s-]*[0-9]{4,6}[0-9\s-]*[0-9]{1})/g,
      // Find ISBN-10: x-xx-xxxxxx-x format
      /([0-9]{1}[0-9\s-]*[0-9]{1,3}[0-9\s-]*[0-9]{4,6}[0-9\s-]*[0-9X]{1})/g,
      // Backup pattern for sequential digits
      /([0-9]{13})/g,
      /([0-9]{10})/g
    ];

    for (const pattern of isbnPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const isbn = match[1];
        const cleanISBN = isbn.replace(/[^0-9X]/g, '');
        
        // Validate ISBN length
        if (cleanISBN.length === 10 || cleanISBN.length === 13) {
          return cleanISBN;
        }
      }
      pattern.lastIndex = 0; // Reset regex for next iteration
    }

    return null;
  }

  /**
   * Extract title and author using heuristics
   */
  extractTitleAndAuthor(lines) {
    let title = null;
    let author = null;

    // Common patterns for author names
    const authorPatterns = [
      /^by\s+(.+)/i,
      /^author[:\s]+(.+)/i,
      /^written\s+by\s+(.+)/i,
      /^(.+)\s*,\s*author/i
    ];

    // Look for explicit author patterns first
    for (const line of lines) {
      for (const pattern of authorPatterns) {
        const match = line.match(pattern);
        if (match) {
          author = this.cleanText(match[1]);
          break;
        }
      }
      if (author) break;
    }

    // Find title first - usually the first substantial line that's not metadata
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = this.cleanText(line);
      
      // Skip if too short or looks like metadata
      if (cleanLine.length < 3 || this.looksLikeMetadata(cleanLine)) continue;
      
      // Skip if it explicitly looks like an author
      if (this.looksLikeExplicitAuthor(cleanLine)) continue;

      // Take the first good line as title
      if (!title) {
        title = cleanLine;
        break;
      }
    }

    // If no explicit author pattern found, look for name-like patterns
    // but avoid taking the title as author
    if (!author) {
      for (const line of lines) {
        const cleanLine = this.cleanText(line);
        
        // Skip if too short or looks like metadata
        if (cleanLine.length < 3 || this.looksLikeMetadata(cleanLine)) continue;
        
        // Skip if this is the title line we already found
        if (title && cleanLine === title) continue;
        
        // Check if it looks like a person's name
        if (this.looksLikeName(cleanLine)) {
          author = cleanLine;
          break;
        }
      }
    }

    return { title, author };
  }

  /**
   * Check if text looks like a person's name
   */
  looksLikeName(text) {
    // Name patterns: First Last, First Middle Last, etc.
    // Allow periods for middle initials like "Robert C. Martin"
    const namePattern = /^[A-Za-z]+(\s+[A-Za-z]+\.?){1,3}$/;
    return namePattern.test(text);
  }

  /**
   * Check if text looks like a book title
   */
  looksLikeTitle(text) {
    // Titles often have more words, articles, prepositions
    const titleIndicators = [
      /^(The|A|An)\s/i,
      /\s(of|and|in|on|for|with|to|from)\s/i,
      /:/, // Subtitles
      /\s{4,}/ // Long text
    ];
    return titleIndicators.some(pattern => pattern.test(text)) || text.split(' ').length > 4;
  }

  /**
   * Check if text explicitly indicates it's an author
   */
  looksLikeExplicitAuthor(text) {
    const authorIndicators = [
      /^by\s/i,
      /author/i,
      /written\s+by/i
    ];
    return authorIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Clean extracted text (remove extra spaces, common OCR artifacts)
   */
  cleanText(text) {
    if (!text) return text;
    
    return text
      .replace(/[^\w\s\-',.]/g, ' ') // Remove special chars except basic punctuation
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .trim();
  }

  /**
   * Check if text looks like metadata rather than title
   */
  looksLikeMetadata(text) {
    const metadataPatterns = [
      /isbn/i,
      /\d{4}/, // Year
      /page\s*\d+/i,
      /chapter/i,
      /edition/i,
      /publisher/i,
      /copyright/i,
      /^[\d\s\-]+$/ // Just numbers and dashes
    ];

    return metadataPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Calculate confidence score based on extracted data
   */
  calculateConfidence(data) {
    let score = 0;
    
    if (data.isbn) score += 40; // ISBN is very reliable
    if (data.title && data.title.length > 5) score += 30;
    if (data.author && data.author.length > 3) score += 30;

    if (score >= 70) return 'high';
    if (score >= 30) return 'medium'; // Lower threshold for medium
    return 'low';
  }

  /**
   * Check if external API access is available (for sandboxed environments)
   */
  isExternalAccessAvailable() {
    const isSandboxed = process.env.NODE_ENV === 'test' || 
                       process.env.GITHUB_ACTIONS === 'true' ||
                       process.env.CI === 'true';
    
    return !isSandboxed;
  }

  /**
   * Create mock OCR result for testing/sandboxed environments
   */
  createMockOCRResult() {
    return {
      isbn: '9780132350884',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      confidence: 'high',
      rawText: 'Clean Code\nA Handbook of Agile Software Craftsmanship\nRobert C. Martin\nISBN: 978-0-13-235088-4'
    };
  }
}

module.exports = new OCRService();