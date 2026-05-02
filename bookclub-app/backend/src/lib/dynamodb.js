const AWS = require('./aws-config');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// DynamoDB does not accept null attribute values — strip them before writing.
function stripNulls(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
  );
}

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
    return result; // includes Items and LastEvaluatedKey
  },

  async scan(params) {
    const result = await dynamoDb.scan(params).promise();
    return result; // includes Items and LastEvaluatedKey
  },

  async put(tableName, item) {
    const params = {
      TableName: tableName,
      // Local DynamoDB rejects null attribute values; strip them only in local dev.
      Item: process.env.APP_ENV === 'local' ? stripNulls(item) : item,
    };
    await dynamoDb.put(params).promise();
    return item;
  },

  async update(params) {
    return dynamoDb.update(params).promise();
  },

  async delete(tableNameOrParams, key) {
    let params;
    
    // Support both signatures: delete(tableName, key) and delete(params)
    if (typeof tableNameOrParams === 'string') {
      // Legacy signature: delete(tableName, key)
      params = {
        TableName: tableNameOrParams,
        Key: key,
      };
    } else {
      // New signature: delete(params) - supports conditional expressions
      params = tableNameOrParams;
    }
    
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
