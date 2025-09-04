/**
 * Book model class for DynamoDB operations
 * Handles CRUD operations for book entities in the database
 */
const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');

/**
 * Book model class providing database operations for book entities
 */
class Book {
  /**
   * Creates a new book in the database
   * @param {Object} bookData - Book information
   * @param {string} bookData.title - Book title
   * @param {string} bookData.author - Book author
   * @param {string} bookData.description - Book description (optional)
   * @param {string} bookData.coverImage - Book cover image URL (optional)
   * @param {string} bookData.status - Book status, defaults to 'available'
   * @param {string} userId - ID of the user creating the book
   * @returns {Promise<Object>} Created book object with generated ID and timestamps
   */
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
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dynamoDb.put(getTableName('books'), book);
    return book;
  }

  /**
   * Retrieves a book by its ID
   * @param {string} bookId - Unique identifier of the book
   * @returns {Promise<Object|null>} Book object if found, null otherwise
   */
  static async getById(bookId) {
    return dynamoDb.get(getTableName('books'), { bookId });
  }

  /**
   * Lists books belonging to a specific user with pagination
   * @param {string} userId - User ID to filter books by
   * @param {number} limit - Maximum number of books to return, defaults to 10
   * @param {string|null} nextToken - Pagination token for next page
   * @returns {Promise<Object>} Object containing books array and next page token
   */
  static async listByUser(userId, limit = 10, nextToken = null) {
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
      items: result.Items,
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null,
    };
  }

  /**
   * Lists all books in the database with pagination
   * @param {number} limit - Maximum number of books to return, defaults to 10
   * @param {string|null} nextToken - Pagination token for next page
   * @returns {Promise<Object>} Object containing books array and next page token
   */
  static async listAll(limit = 10, nextToken = null) {
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

  /**
   * Updates an existing book with new data
   * @param {string} bookId - Unique identifier of the book to update
   * @param {string} userId - ID of the user requesting the update (must be book owner)
   * @param {Object} updates - Object containing fields to update
   * @returns {Promise<Object>} Updated book object
   * @throws {Error} If book not found or user lacks permission
   */
  static async update(bookId, userId, updates) {
    const timestamp = new Date().toISOString();
    const updateData = {
      ...updates,
      updatedAt: timestamp,
    };

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

  /**
   * Deletes a book from the database
   * @param {string} bookId - Unique identifier of the book to delete
   * @param {string} userId - ID of the user requesting the deletion (must be book owner)
   * @returns {Promise<Object>} Success confirmation object
   * @throws {Error} If book not found or user lacks permission
   */
  static async delete(bookId, userId) {
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
