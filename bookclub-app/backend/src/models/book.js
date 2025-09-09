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

  static async listAll(limit = 10, nextToken = null) {
    if (isOffline()) {
      const result = await LocalStorage.listBooks();
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
    
    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null,
    };
  }

  static async search(query, limit = 10, nextToken = null) {
    if (isOffline()) {
      const allBooks = await LocalStorage.listBooks();
      const filteredBooks = allBooks.filter(book => {
        if (!query || query.trim() === '') {
          return true;
        }
        
        const searchTerm = query.toLowerCase().trim();
        const searchableFields = [
          book.title,
          book.author,
          book.description,
          book.publisher,
          book.categories,
          book.isbn10,
          book.isbn13
        ];
        
        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchTerm)
        );
      });
      
      return {
        items: filteredBooks.slice(0, limit),
        nextToken: filteredBooks.length > limit ? 'has-more' : null,
      };
    }

    // If no query provided, return all books
    if (!query || query.trim() === '') {
      return this.listAll(limit, nextToken);
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Build filter expression for DynamoDB scan
    const filterExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    
    // Search across multiple fields
    const searchFields = [
      { field: 'title', attribute: '#title' },
      { field: 'author', attribute: '#author' },
      { field: 'description', attribute: '#description' },
      { field: 'publisher', attribute: '#publisher' },
      { field: 'categories', attribute: '#categories' },
      { field: 'isbn10', attribute: '#isbn10' },
      { field: 'isbn13', attribute: '#isbn13' }
    ];

    searchFields.forEach((fieldInfo, index) => {
      const { field, attribute } = fieldInfo;
      expressionAttributeNames[attribute] = field;
      const valueKey = `:searchValue${index}`;
      expressionAttributeValues[valueKey] = searchTerm;
      filterExpressions.push(`contains(${attribute}, ${valueKey})`);
    });

    const params = {
      TableName: getTableName('books'),
      FilterExpression: filterExpressions.join(' OR '),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
    };

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }

    const result = await dynamoDb.scan(params);
    
    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null,
    };
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
