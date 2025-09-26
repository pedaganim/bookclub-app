const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development';

// Lazy loader to avoid requiring local-storage in AWS Lambda
let _LocalStorage = null;
function LocalStorage() {
  if (!_LocalStorage) {
    // Require only when actually needed in offline/dev
    // This prevents `.local-storage` mkdir attempts in Lambda runtime
    // where the filesystem path is not writable.
    // eslint-disable-next-line global-require
    _LocalStorage = require('../lib/local-storage');
  }
  return _LocalStorage;
}

class Book {
  static async create(bookData, userId) {
    const bookId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const book = {
      bookId,
      userId,
      title: bookData.title,
      author: bookData.author,
      description: bookData.description || '',
      coverImage: bookData.coverImage || null,
      images: bookData.images || null, // Additional images beyond cover
      status: bookData.status || 'available', // available, borrowed, reading
      // Persist original upload location for downstream processors (Textract, etc.)
      s3Bucket: bookData.s3Bucket || null,
      s3Key: bookData.s3Key || null,
      // Additional metadata fields (optional)
      isbn10: bookData.isbn10 || null,
      isbn13: bookData.isbn13 || null,
      publishedDate: bookData.publishedDate || null,
      pageCount: bookData.pageCount || null,
      categories: bookData.categories || null,
      language: bookData.language || null,
      publisher: bookData.publisher || null,
      metadataSource: bookData.metadataSource || null,
      // New advanced metadata column for EventBridge-triggered extraction
      advancedMetadata: bookData.advancedMetadata || null,
      lastMetadataExtraction: bookData.lastMetadataExtraction || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (isOffline()) {
      await LocalStorage().createBook(book);
      return book;
    }

    await dynamoDb.put(getTableName('books'), book);
    return book;
  }

  static async getById(bookId) {
    if (isOffline()) {
      return LocalStorage().getBook(bookId);
    }
    return dynamoDb.get(getTableName('books'), { bookId });
  }

  static async listByUser(userId, limit = 10, nextToken = null) {
    if (isOffline()) {
      const result = await LocalStorage().listBooks(userId);
      // For offline mode, we'll implement simple pagination later if needed
      return {
        items: result.slice(0, limit),
        nextToken: result.length > limit ? 'has-more' : null,
      };
    }

    const params = {
      TableName: getTableName('books'),
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: limit,
      ScanIndexForward: false, // Sort by most recent first
    };

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }

    const result = await dynamoDb.query(params);

    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null,
    };
  }

  static async listAll(limit = 10, nextToken = null, searchQuery = null) {
    if (isOffline()) {
      let result = await LocalStorage().listBooks();
      
      // Apply search filter if provided
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(book => {
          const md = book.advancedMetadata && book.advancedMetadata.metadata ? book.advancedMetadata.metadata : {};
          const fields = [
            book.description,
            book.title,
            book.author,
            book.publisher,
            book.isbn10,
            book.isbn13,
            md && md.title,
            md && md.author,
            md && md.publisher,
            md && md.subtitle,
            md && md.series,
            md && md.edition,
            md && md.language,
          ];
          const categories = []
            .concat(Array.isArray(book.categories) ? book.categories : [])
            .concat(Array.isArray(md.categories) ? md.categories : []);
          return (
            fields.some(v => typeof v === 'string' && v.toLowerCase().includes(q)) ||
            categories.some(v => typeof v === 'string' && v.toLowerCase().includes(q))
          );
        });
      }
      
      // For offline mode, we'll implement simple pagination later if needed
      return {
        items: result.slice(0, limit),
        nextToken: result.length > limit ? 'has-more' : null,
      };
    }

    const params = {
      TableName: getTableName('books'),
      Limit: limit,
      ScanIndexForward: false,
    };

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }

    const result = await dynamoDb.scan(params);

    // Apply in-memory filtering for case-insensitive search against multiple fields
    let items = result.Items || [];
    if (searchQuery) {
      const q = String(searchQuery).toLowerCase();
      items = items.filter((book) => {
        const md = book && book.advancedMetadata && book.advancedMetadata.metadata ? book.advancedMetadata.metadata : {};
        const fields = [
          book && book.description,
          book && book.title,
          book && book.author,
          book && book.publisher,
          book && book.isbn10,
          book && book.isbn13,
          md && md.title,
          md && md.author,
          md && md.publisher,
          md && md.subtitle,
          md && md.series,
          md && md.edition,
          md && md.language,
        ];
        const categories = []
          .concat(Array.isArray(book && book.categories) ? book.categories : [])
          .concat(Array.isArray(md && md.categories) ? md.categories : []);
        return (
          fields.some(v => typeof v === 'string' && v.toLowerCase().includes(q)) ||
          categories.some(v => typeof v === 'string' && v.toLowerCase().includes(q))
        );
      });
    }

    // Enrich books with user names
    let enrichedBooks = await this.enrichBooksWithUserNames(items);
    // Enrich with club info when available
    enrichedBooks = await this.enrichBooksWithClubInfo(enrichedBooks);
    
    return {
      items: enrichedBooks,
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null,
    };
  }

  static async enrichBooksWithUserNames(books) {
    if (!books || books.length === 0) return books;
    
    // Get unique user IDs
    const userIds = [...new Set(books.map(book => book.userId))];
    
    // Fetch user information
    const User = require('./user');
    const userMap = {};
    
    await Promise.all(userIds.map(async (userId) => {
      try {
        const user = await User.getById(userId);
        userMap[userId] = user ? user.name : null;
      } catch (error) {
        console.warn(`Failed to fetch user ${userId}:`, error.message);
        userMap[userId] = null;
      }
    }));
    
    // Add user names to books
    return books.map(book => ({
      ...book,
      userName: userMap[book.userId] || null
    }));
  }

  // Enrich books with club info when available. For now this is a no-op passthrough
  // to ensure compatibility with existing data where club fields may be absent.
  // Future enhancement: look up club details by clubId from the bookclub-groups table
  // and attach clubName/clubIsPrivate, etc.
  static async enrichBooksWithClubInfo(books) {
    if (!Array.isArray(books) || books.length === 0) return books;
    return books;
  }

  static async update(bookId, userId, updates) {
    const timestamp = new Date().toISOString();
    const updateData = {
      ...updates,
      updatedAt: timestamp,
    };

    if (isOffline()) {
      return LocalStorage().updateBook(bookId, updateData);
    }

    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = 
      dynamoDb.generateUpdateExpression(updateData);

    const params = {
      TableName: getTableName('books'),
      Key: { bookId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ConditionExpression: 'userId = :userId',
      ReturnValues: 'ALL_NEW',
    };

    ExpressionAttributeValues[':userId'] = userId;

    try {
      const result = await dynamoDb.update(params);
      return result.Attributes;
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        throw new Error('Book not found or you do not have permission to update it');
      }
      throw error;
    }
  }

  static async delete(bookId, userId) {
    if (isOffline()) {
      return LocalStorage().deleteBook(bookId);
    }

    const params = {
      TableName: getTableName('books'),
      Key: { bookId },
      ConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    };

    try {
      await dynamoDb.delete(params);
      return { success: true };
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        throw new Error('Book not found or you do not have permission to delete it');
      }
      throw error;
    }
  }
}

module.exports = Book;
