const Book = require('../models/book');
const BookClub = require('../models/bookclub');
const bookMetadataService = require('../lib/book-metadata');
const textractService = require('../lib/textract-service');
const imageMetadataService = require('../lib/image-metadata-service');
const { DynamoDB } = require('../lib/aws-config');
const { getTableName } = require('../lib/table-names');
const { publishEvent } = require('../lib/event-bus');
const config = require('../lib/config');
const logger = require('../lib/logger');

class BookService {
  /**
   * Creates a new book and handles enrichment/extraction logic.
   * @param {Object} data - Raw input data.
   * @param {string} userId - ID of the user creating the book.
   * @returns {Promise<Object>} The created book record.
   */
  static async create(data, userId) {
    logger.info({ userId, category: data.category }, 'Initiating book creation');

    const isExtractingFromImage = !!(data.extractFromImage && data.s3Bucket && data.s3Key);

    // 1. Idempotency Check
    if (isExtractingFromImage && process.env.NODE_ENV !== 'test') {
      const existingId = await this.getMappedBookId(data.s3Bucket, data.s3Key);
      if (existingId) {
        const existing = await Book.getById(existingId);
        if (existing) {
          logger.info({ bookId: existingId }, 'Reusing existing book mapping (idempotency)');
          return existing;
        }
      }
    }

    // 2. Club Access Validation (for Lost & Found)
    await this.validateClubAccess(data, userId);

    // 3. Build & Enrich Data
    let bookData = this.buildInitialBookData(data);
    
    if (isExtractingFromImage && !bookData.metadataSource) {
      bookData.metadataSource = 'image-upload-pending';
    }

    bookData = await this.maybeEnrichWithMetadata(data, bookData);
    bookData = await this.maybeApplyTextractExtraction(data, bookData);

    // 4. Final Validation
    this.validateFinalData(bookData, isExtractingFromImage);

    // 5. Save to DB
    const created = await Book.create(bookData, userId);

    // 6. Update Mappings
    if (isExtractingFromImage && data.s3Bucket && data.s3Key && process.env.NODE_ENV !== 'test') {
      await this.setMappedBookId(data.s3Bucket, data.s3Key, created.bookId, userId);
    }

    // 7. Publish Events
    try {
      // Standard creation event
      if (bookData.metadataSource !== 'image-upload-pending') {
        await publishEvent('Book.Created', {
          bookId: created.bookId,
          userId,
          clubId: created.clubId,
          title: created.title,
          category: created.category
        });
      }

      // Trigger Bedrock Image Analysis if images are present
      if (created.images && created.images.length > 0) {
        await publishEvent('Book.ImageAnalysisRequested', {
          bookId: created.bookId,
          itemId: created.bookId, // For backward compatibility
          clubId: created.clubId,
          userId,
          category: created.category,
          libraryType: created.category, // For worker compatibility
          images: created.images
        });
      }
    } catch (err) {
      logger.error({ err, bookId: created.bookId }, 'Failed to publish post-creation events');
    }

    return created;
  }

  // --- Helper Methods ---

  static buildInitialBookData(data) {
    return {
      title: data.title,
      author: data.author,
      description: data.description,
      category: data.category || data.libraryType || 'book',
      coverImage: data.coverImage,
      images: data.images,
      status: data.status,
      s3Bucket: data.s3Bucket,
      s3Key: data.s3Key,
      clubId: data.clubId || null,
      metadataSource: data.metadataSource,
    };
  }

  static async validateClubAccess(data, userId) {
    const category = data.category || data.libraryType || 'book';
    if (category !== 'lost_found') return;

    if (!data.clubId) {
      throw new Error('VALIDATION_ERROR:clubId is required for Lost & Found posts');
    }

    const club = await BookClub.getById(data.clubId);
    if (!club) throw new Error('NOT_FOUND:Club not found');

    const isMember = await BookClub.isMember(data.clubId, userId);
    if (!isMember) throw new Error('FORBIDDEN:You must be an active club member to post Lost & Found items');
  }

  static async maybeEnrichWithMetadata(data, bookData) {
    const enabled = process.env.NODE_ENV === 'test' || String(process.env.ENABLE_CREATE_ENRICHMENT || 'false') === 'true';
    if (!enabled || !(data.enrichWithMetadata || data.isbn || (data.title && data.author))) {
      return bookData;
    }

    try {
      const metadata = await bookMetadataService.searchBookMetadata({
        isbn: data.isbn,
        title: data.title,
        author: data.author,
      });

      if (!metadata) return bookData;

      return {
        ...bookData,
        description: bookData.description || metadata.description,
        coverImage: bookData.coverImage || metadata.thumbnail,
        isbn10: metadata.isbn10,
        isbn13: metadata.isbn13,
        publishedDate: metadata.publishedDate,
        pageCount: metadata.pageCount,
        categories: metadata.categories,
        language: metadata.language,
        publisher: metadata.publisher,
        metadataSource: metadata.source,
      };
    } catch (error) {
      logger.warn({ error }, 'Metadata enrichment failed');
      return bookData;
    }
  }

  static async maybeApplyTextractExtraction(data, bookData) {
    const enabled = process.env.NODE_ENV === 'test' || String(process.env.ENABLE_CREATE_ENRICHMENT || 'false') === 'true';
    const isTextractFlow = !!(data.extractFromImage && data.s3Bucket && data.s3Key);
    
    if (!enabled || !isTextractFlow) return bookData;

    try {
      let extractionResult = await imageMetadataService.getExtractedMetadata(data.s3Bucket, data.s3Key);
      if (!extractionResult) {
        extractionResult = await textractService.extractTextFromImage(data.s3Bucket, data.s3Key);
      }

      if (extractionResult && extractionResult.bookMetadata) {
        const { bookMetadata, extractedText } = extractionResult;
        
        return {
          ...bookData,
          title: bookData.title || bookMetadata.title,
          author: bookData.author || bookMetadata.author,
          description: bookData.description || bookMetadata.description || (extractedText?.fullText || extractedText),
          isbn10: bookData.isbn10 || (bookMetadata.isbn?.length === 10 ? bookMetadata.isbn : null),
          isbn13: bookData.isbn13 || (bookMetadata.isbn?.length === 13 ? bookMetadata.isbn : null),
          publisher: bookData.publisher || bookMetadata.publisher,
          publishedDate: bookData.publishedDate || bookMetadata.publishedDate,
          textractExtractedText: extractedText?.fullText || extractedText,
          textractExtractedAt: extractionResult.extractedAt,
        };
      }
      return bookData;
    } catch (error) {
      logger.warn({ error }, 'Textract extraction failed');
      return bookData;
    }
  }

  static validateFinalData(bookData, isExtracting) {
    if (isExtracting || bookData.metadataSource === 'image-upload-pending') return;
    
    const isBook = !bookData.category || bookData.category === 'book';
    const missing = [];
    if (!bookData.title) missing.push('title');
    if (isBook && !bookData.author) missing.push('author');

    if (missing.length > 0) {
      throw new Error(`VALIDATION_ERROR:Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Updates an existing book or library item.
   * Handles permissions (Owner, Club Admin, SuperAdmin).
   */
  static async update(bookId, updates, actingUserId) {
    logger.info({ bookId, actingUserId }, 'Updating book');

    const book = await Book.getById(bookId);
    if (!book) throw new Error('NOT_FOUND:Book not found');

    // 1. Permission check
    const canEdit = await this.canUserEditBook(book, actingUserId);
    if (!canEdit) throw new Error('FORBIDDEN:You do not have permission to update this item');

    const updated = await Book.update(bookId, book.userId, updates);
    
    logger.info({ bookId }, 'Book updated successfully');
    return updated;
  }

  /**
   * Deletes a book or library item.
   */
  static async delete(bookId, actingUserId) {
    logger.info({ bookId, actingUserId }, 'Deleting book');

    const book = await Book.getById(bookId);
    if (!book) throw new Error('NOT_FOUND:Book not found');

    const canEdit = await this.canUserEditBook(book, actingUserId);
    if (!canEdit) throw new Error('FORBIDDEN:You do not have permission to delete this item');

    await Book.delete(bookId, book.userId);
    
    logger.info({ bookId }, 'Book deleted successfully');
    return true;
  }

  /**
   * Internal permission check for books/items.
   */
  static async canUserEditBook(book, userId) {
    if (book.userId === userId) return true;

    // Check role (Admin/SuperAdmin)
    const user = await require('./user-service').getById(userId);
    if (user?.role === 'superadmin') return true;

    // Check Club Admin
    if (book.clubId) {
      const role = await BookClub.getMemberRole(book.clubId, userId);
      if (role === 'admin') return true;
    }

    return false;
  }

  /**
   * Retrieves a single book by ID.
   */
  static async getById(bookId) {
    const book = await Book.getById(bookId);
    if (!book) throw new Error('NOT_FOUND:Book not found');
    return book;
  }

  /**
   * Lists books/items with various filters.
   */
  static async list(params, actingUserId) {
    const { 
      limit = 10, 
      nextToken, 
      search, 
      ageGroupFine, 
      bare = false, 
      filter, 
      clubId, 
      category,
      userId: targetUserId
    } = params;

    logger.info({ actingUserId, filter, clubId, category }, 'Listing books');

    let result;

    if (clubId) {
      result = await this.listByClub(clubId, limit, category, bare);
    } else if (filter === 'borrowed' && actingUserId) {
      result = await Book.listByLentToUser(actingUserId, limit, nextToken);
    } else if (targetUserId || (filter === 'mine' && actingUserId)) {
      const uid = targetUserId || actingUserId;
      result = await Book.listByUser(uid, limit, nextToken, category);
    } else {
      const options = { category, bare };
      if (bare && actingUserId) {
        try {
          const userClubs = await BookClub.getUserClubs(actingUserId);
          options.memberClubIds = new Set(
            (userClubs || []).filter(c => c.userStatus === 'active').map(c => c.clubId)
          );
        } catch (err) {
          logger.warn({ err }, 'Failed to fetch user clubs for list filtering');
        }
      }
      result = await Book.listAll(limit, nextToken, search, ageGroupFine, options);
    }

    return result;
  }

  static async listByClub(clubId, limit, category, bare) {
    // Check if we are offline for local storage logic
    if (config.IS_OFFLINE || process.env.NODE_ENV === 'test') {
      const LocalStorage = require('../lib/local-storage');
      let items = await LocalStorage.listBooksByClub(clubId, category || null);
      if (category !== 'lost_found') {
        items = items.filter(b => b.category !== 'lost_found');
      }
      return { items: items.slice(0, limit), nextToken: null };
    }

    const members = await BookClub.getMembers(clubId);
    const activeMembers = (members || []).filter(m => m.status === 'active');
    if (activeMembers.length === 0) return { items: [], nextToken: null };

    const perMember = Math.max(10, Math.ceil(limit / activeMembers.length));
    const results = await Promise.all(
      activeMembers.map(m => Book.listByUser(m.userId, perMember, null, category).catch(() => ({ items: [] })))
    );

    const items = results.flatMap(r => (r.items || []).map(book => ({ ...book, clubId })));
    return { items: items.slice(0, limit), nextToken: null };
  }

  // --- Persistence / Cache Helpers ---

  static async getMappedBookId(bucket, key) {
    try {
      const dynamodb = new DynamoDB.DocumentClient();
      const cacheKey = `bookForS3:${bucket}:${key}`;
      const res = await dynamodb.get({ TableName: getTableName('metadata-cache'), Key: { cacheKey } }).promise();
      return res.Item?.bookId || null;
    } catch (e) {
      return null;
    }
  }

  static async setMappedBookId(bucket, key, bookId, userId) {
    try {
      const dynamodb = new DynamoDB.DocumentClient();
      const cacheKey = `bookForS3:${bucket}:${key}`;
      const timestamp = new Date().toISOString();
      const ttl = Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000);
      await dynamodb.put({
        TableName: getTableName('metadata-cache'),
        Item: { cacheKey, bookId, userId, s3Bucket: bucket, s3Key: key, mappedAt: timestamp, ttl },
        ConditionExpression: 'attribute_not_exists(cacheKey)'
      }).promise().catch(() => {});
    } catch (e) {}
  }
}

module.exports = BookService;
