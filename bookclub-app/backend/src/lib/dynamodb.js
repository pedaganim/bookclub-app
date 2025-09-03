const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports = {
  async get(tableName, key) {
    const params = {
      TableName: tableName,
      Key: key,
    };
    const result = await dynamoDb.get(params).promise();
    return result.Item;
  },

  async query(params) {
    const result = await dynamoDb.query(params).promise();
    return result.Items || [];
  },

  async scan(params) {
    const result = await dynamoDb.scan(params).promise();
    return result.Items || [];
  },

  async put(tableName, item) {
    const params = {
      TableName: tableName,
      Item: item,
    };
    await dynamoDb.put(params).promise();
    return item;
  },

  async update(params) {
    return dynamoDb.update(params).promise();
  },

  async delete(tableName, key) {
    const params = {
      TableName: tableName,
      Key: key,
    };
    await dynamoDb.delete(params).promise();
    return { success: true };
  },

  // Helper to generate update expressions
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
