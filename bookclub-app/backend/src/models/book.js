const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');
const LocalStorage = require('../lib/local-storage');

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development';

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
      // Additional metadata fields (optional)
      isbn10: bookData.isbn10 || null,
      isbn13: bookData.isbn13 || null,
      publishedDate: bookData.publishedDate || null,
      pageCount: bookData.pageCount || null,
      categories: bookData.categories || null,
      language: bookData.language || null,
      publisher: bookData.publisher || null,
      metadataSource: bookData.metadataSource || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (isOffline()) {
      await LocalStorage.createBook(book);
      return book;
    }

    await dynamoDb.put(getTableName('books'), book);
    return book;
  }

  static async getById(bookId) {
    if (isOffline()) {
      return LocalStorage.getBook(bookId);
    }
    return dynamoDb.get(getTableName('books'), { bookId });
  }

  static async listByUser(userId, limit = 10, nextToken = null) {
    if (isOffline()) {
      const result = await LocalStorage.listBooks(userId);
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
      let result = await LocalStorage.listBooks();
      
      // Apply search filter if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(book => 
          book.description && book.description.toLowerCase().includes(query)
        );
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

    // Add search filter if provided
    if (searchQuery) {
      params.FilterExpression = 'contains(#desc, :searchQuery)';
      params.ExpressionAttributeNames = {
        '#desc': 'description'
      };
      params.ExpressionAttributeValues = {
        ':searchQuery': searchQuery
      };
    }

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }

    const result = await dynamoDb.scan(params);
    
    // Enrich books with user names
    const enrichedBooks = await this.enrichBooksWithUserNames(result.Items || []);
    
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

  static async update(bookId, userId, updates) {
    const timestamp = new Date().toISOString();
    const updateData = {
      ...updates,
      updatedAt: timestamp,
    };

    if (isOffline()) {
      return LocalStorage.updateBook(bookId, updateData);
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
      return LocalStorage.deleteBook(bookId);
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
      await dynamoDb.deleteItem(params);
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
