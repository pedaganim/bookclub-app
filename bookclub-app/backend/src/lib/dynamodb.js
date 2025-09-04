/**
 * DynamoDB wrapper utility providing simplified database operations
 * Offers convenient methods for CRUD operations and query building
 */
const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports = {
  /**
   * Retrieves a single item from DynamoDB by key
   * @param {string} tableName - Name of the DynamoDB table
   * @param {Object} key - Primary key object to search for
   * @returns {Promise<Object|undefined>} Item if found, undefined otherwise
   */
  async get(tableName, key) {
    const params = {
      TableName: tableName,
      Key: key,
    };
    const result = await dynamoDb.get(params).promise();
    return result.Item;
  },

  /**
   * Executes a query operation on DynamoDB
   * @param {Object} params - DynamoDB query parameters
   * @returns {Promise<Array>} Array of items matching the query
   */
  async query(params) {
    const result = await dynamoDb.query(params).promise();
    return result.Items || [];
  },

  /**
   * Executes a scan operation on DynamoDB
   * @param {Object} params - DynamoDB scan parameters
   * @returns {Promise<Array>} Array of items from the scan
   */
  async scan(params) {
    const result = await dynamoDb.scan(params).promise();
    return result.Items || [];
  },

  /**
   * Inserts or updates an item in DynamoDB
   * @param {string} tableName - Name of the DynamoDB table
   * @param {Object} item - Item data to store
   * @returns {Promise<Object>} The stored item
   */
  async put(tableName, item) {
    const params = {
      TableName: tableName,
      Item: item,
    };
    await dynamoDb.put(params).promise();
    return item;
  },

  /**
   * Updates an existing item in DynamoDB
   * @param {Object} params - DynamoDB update parameters
   * @returns {Promise<Object>} DynamoDB update result
   */
  async update(params) {
    return dynamoDb.update(params).promise();
  },

  /**
   * Deletes an item from DynamoDB
   * @param {string} tableName - Name of the DynamoDB table
   * @param {Object} key - Primary key of the item to delete
   * @returns {Promise<Object>} Success confirmation object
   */
  async delete(tableName, key) {
    const params = {
      TableName: tableName,
      Key: key,
    };
    await dynamoDb.delete(params).promise();
    return { success: true };
  },

  /**
   * Deletes an item from DynamoDB with additional parameters
   * @param {Object} params - Full DynamoDB delete parameters including conditions
   * @returns {Promise<Object>} Success confirmation object
   */
  async deleteItem(params) {
    await dynamoDb.delete(params).promise();
    return { success: true };
  },

  /**
   * Generates DynamoDB update expression from an input object
   * @param {Object} input - Object containing fields to update
   * @returns {Object} Object with UpdateExpression, ExpressionAttributeNames, and ExpressionAttributeValues
   */
  generateUpdateExpression(input) {
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};
    const updates = [];

    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        
        ExpressionAttributeNames[attrName] = key;
        ExpressionAttributeValues[attrValue] = value;
        updates.push(`${attrName} = ${attrValue}`);
      }
    });

    return {
      UpdateExpression: `SET ${updates.join(', ')}`,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    };
  },
};
