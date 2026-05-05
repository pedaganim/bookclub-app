const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.SERVERLESS_OFFLINE === 'true' || process.env.NODE_ENV === 'test';

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
      advancedMetadata: bookData.advancedMetadata || null,
      clubId: bookData.clubId || null,
      category: bookData.category || 'book', // Default to book for backward compatibility
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

  static async listByUser(userId, limit = 10, nextToken = null, category = null) {
    if (isOffline()) {
      let result = await LocalStorage().listBooks(userId);
      if (category) {
        result = result.filter(b => b.category === category);
      }
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

    if (category) {
      params.ExpressionAttributeNames = { '#cat': 'category' };
      params.ExpressionAttributeValues[':category'] = category;
      // For books: also include legacy items where category attribute is absent
      if (category === 'book') {
        params.FilterExpression = '(#cat = :category OR attribute_not_exists(#cat))';
      } else {
        params.FilterExpression = '#cat = :category';
      }
    }

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

  static async listByLentToUser(lentToUserId, limit = 10, nextToken = null) {
    if (isOffline()) {
      const result = await LocalStorage().listBooks();
      const filtered = result.filter(b => b.lentToUserId === lentToUserId);
      return {
        items: filtered.slice(0, limit),
        nextToken: filtered.length > limit ? 'has-more' : null,
      };
    }

    const params = {
      TableName: getTableName('books'),
      IndexName: 'LentToUserIdIndex',
      KeyConditionExpression: 'lentToUserId = :lentToUserId',
      ExpressionAttributeValues: {
        ':lentToUserId': lentToUserId,
      },
      Limit: limit,
      ScanIndexForward: false, // Sort by most recent first
    };

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }

    try {
      const result = await dynamoDb.query(params);
      return {
        items: result.Items || [],
        nextToken: result.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
          : null,
      };
    } catch (err) {
      if (err.code === 'ValidationException' && err.message && err.message.includes('index')) {
        console.warn('[listByLentToUser] LentToUserIdIndex not available yet, returning empty:', err.message);
        return { items: [], nextToken: null };
      }
      throw err;
    }
  }

  static async listAll(limit = 10, nextToken = null, searchQuery = null, ageGroupFine = null, options = undefined) {
    const categoryFilter = options?.category || null;

    if (isOffline()) {
      return this._listAllOffline(limit, searchQuery, ageGroupFine, options, categoryFilter);
    }

    return this._listAllDynamo(limit, nextToken, searchQuery, ageGroupFine, options, categoryFilter);
  }

  static async _listAllOffline(limit, searchQuery, ageGroupFine, options, categoryFilter) {
    let result = await LocalStorage().listBooks();

    if (categoryFilter) {
      result = result.filter(book => (book.category || 'book') === categoryFilter);
    }

    result = this._applyInMemoryFilters(result, searchQuery, ageGroupFine, options);

    return {
      items: result.slice(0, limit),
      nextToken: result.length > limit ? 'has-more' : null,
    };
  }

  static async _listAllDynamo(limit, nextToken, searchQuery, ageGroupFine, options, categoryFilter) {
    const params = {
      TableName: getTableName('books'),
      Limit: limit,
      ScanIndexForward: false,
    };

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }

    if (categoryFilter) {
      params.ExpressionAttributeNames = { '#cat': 'category' };
      params.ExpressionAttributeValues = { ':category': categoryFilter };
      params.FilterExpression = categoryFilter === 'book'
        ? '(#cat = :category OR attribute_not_exists(#cat))'
        : '#cat = :category';
    }

    let result;
    if (options && options.clubId) {
      try {
        params.IndexName = 'ClubIdIndex';
        params.KeyConditionExpression = 'clubId = :clubId';
        params.ExpressionAttributeValues = { ':clubId': options.clubId };
        result = await dynamoDb.query(params);
      } catch (err) {
        if (err.code === 'ValidationException' && err.message && err.message.includes('index')) {
          console.warn('[listAll] ClubIdIndex not available yet, falling back to scan:', err.message);
          delete params.IndexName;
          delete params.KeyConditionExpression;
          delete params.ExpressionAttributeValues;
          result = await dynamoDb.scan(params);
        } else {
          throw err;
        }
      }
    } else {
      result = await dynamoDb.scan(params);
    }

    let items = this._applyInMemoryFilters(result.Items || [], searchQuery, ageGroupFine, options);

    const paginationToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;

    if (options && options.bare) {
      return { items, nextToken: paginationToken };
    }

    let enrichedBooks = await this.enrichBooksWithUserNames(items);
    enrichedBooks = await this.enrichBooksWithClubInfo(enrichedBooks);
    return { items: enrichedBooks, nextToken: paginationToken };
  }

  static _applyInMemoryFilters(items, searchQuery, ageGroupFine, options) {
    if (searchQuery) {
      const searchTerms = String(searchQuery).toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
      if (searchTerms.length > 0) {
        items = items.filter(book => {
          const md = (book.advancedMetadata && book.advancedMetadata.metadata) || book.advancedMetadata || {};
          const fields = [
            book.description, book.title, book.author, book.publisher, book.isbn10, book.isbn13,
            md.description, md.title, md.author, md.publisher, md.subtitle, md.series, md.edition, md.language,
          ];
          const categories = []
            .concat(Array.isArray(book.categories) ? book.categories : [])
            .concat(Array.isArray(md.categories) ? md.categories : []);
          const allText = [...fields, ...categories]
            .filter(v => typeof v === 'string')
            .map(v => v.toLowerCase().replace(/[^\w\s]/g, ''))
            .join(' ');
          return searchTerms.every(term => allText.includes(term));
        });
      }
    }

    if (ageGroupFine) {
      const target = String(ageGroupFine).toLowerCase();
      items = items.filter(book => {
        const md = (book.advancedMetadata && book.advancedMetadata.metadata) || {};
        const v = (book.ageGroupFine || md.ageGroupFine || '').toLowerCase();
        return v === target;
      });
    }

    if (options && options.clubId) {
      items = items.filter(book => book.clubId === options.clubId);
    }

    if (options && 'memberClubIds' in options) {
      const memberClubIds = options.memberClubIds;
      items = items.filter(book => {
        if (book.clubId) {
          return memberClubIds !== null && memberClubIds.has(book.clubId);
        }
        return true;
      });
    }

    return items;
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
    if (!books || books.length === 0) return books;
    
    // Get unique club IDs
    const clubIds = [...new Set(books.filter(b => b.clubId).map(b => b.clubId))];
    if (clubIds.length === 0) return books;
    
    // Fetch club information
    const BookClub = require('./bookclub');
    const clubMap = {};
    
    await Promise.all(clubIds.map(async (clubId) => {
      try {
        const club = await BookClub.getById(clubId);
        clubMap[clubId] = club ? { name: club.name, isPrivate: club.isPrivate } : null;
      } catch (error) {
        console.warn(`Failed to fetch club ${clubId}:`, error.message);
        clubMap[clubId] = null;
      }
    }));
    
    // Add club info to books
    return books.map(book => {
      const clubInfo = book.clubId ? clubMap[book.clubId] : null;
      return {
        ...book,
        clubName: clubInfo ? clubInfo.name : null,
        clubIsPrivate: clubInfo ? clubInfo.isPrivate : false
      };
    });
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

  static async getSummary(userId) {
    if (isOffline()) {
      const all = await LocalStorage().listBooks();
      const owned = all.filter(b => b.userId === userId);
      return {
        total: owned.length,
        lent: owned.filter(b => b.status === 'borrowed').length,
        borrowed: all.filter(b => b.lentToUserId === userId).length,
      };
    }

    const [ownedRes, lentRes, borrowedRes] = await Promise.all([
      // Total owned
      dynamoDb.query({
        TableName: getTableName('books'),
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        Select: 'COUNT',
      }),
      // Lent out (owned by me, but status is borrowed)
      // Note: If we don't have a GSI for (userId, status), we might have to filter
      // or just fetch all and count. But for performance, a FilterExpression with Select: COUNT works.
      dynamoDb.query({
        TableName: getTableName('books'),
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        FilterExpression: '#s = :status',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':userId': userId, ':status': 'borrowed' },
        Select: 'COUNT',
      }),
      // Borrowed from others
      dynamoDb.query({
        TableName: getTableName('books'),
        IndexName: 'LentToUserIdIndex',
        KeyConditionExpression: 'lentToUserId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        Select: 'COUNT',
      }),
    ]);

    return {
      total: ownedRes.Count || 0,
      lent: lentRes.Count || 0,
      borrowed: borrowedRes.Count || 0,
    };
  }
}

module.exports = Book;
