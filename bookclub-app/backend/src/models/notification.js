const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');
const LocalStorage = require('../lib/local-storage');

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development';

class Notification {
  static async create(notificationData) {
    const notificationId = uuidv4();
    const timestamp = new Date().toISOString();

    const notification = {
      notificationId,
      userId: notificationData.userId,
      type: notificationData.type, // 'book_proposal', 'vote', 'meeting_reminder', 'discussion_reply'
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data || {}, // Additional structured data
      read: false,
      emailSent: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (isOffline()) {
      return await LocalStorage.createNotification(notification);
    }

    await dynamoDb.put(getTableName('notifications'), notification);
    return notification;
  }

  static async getById(notificationId) {
    if (isOffline()) {
      return await LocalStorage.getNotification(notificationId);
    }

    const result = await dynamoDb.get(getTableName('notifications'), { notificationId });
    return result || null;
  }

  static async listByUser(userId, limit = 20, nextToken = null) {
    if (isOffline()) {
      return await LocalStorage.listNotificationsByUser(userId, limit, nextToken);
    }

    const params = {
      TableName: getTableName('notifications'),
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

  static async markAsRead(notificationId, userId) {
    const timestamp = new Date().toISOString();

    if (isOffline()) {
      return await LocalStorage.updateNotification(notificationId, { read: true, updatedAt: timestamp });
    }

    const updateData = { read: true, updatedAt: timestamp };
    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = 
      dynamoDb.generateUpdateExpression(updateData);

    const params = {
      TableName: getTableName('notifications'),
      Key: { notificationId },
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
        throw new Error('Notification not found or you do not have permission to update it');
      }
      throw error;
    }
  }

  static async markEmailSent(notificationId) {
    const timestamp = new Date().toISOString();

    if (isOffline()) {
      return await LocalStorage.updateNotification(notificationId, { emailSent: true, updatedAt: timestamp });
    }

    const updateData = { emailSent: true, updatedAt: timestamp };
    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = 
      dynamoDb.generateUpdateExpression(updateData);

    const params = {
      TableName: getTableName('notifications'),
      Key: { notificationId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDb.update(params);
    return result.Attributes;
  }

  static async getUnreadCount(userId) {
    if (isOffline()) {
      return await LocalStorage.getUnreadNotificationCount(userId);
    }

    const params = {
      TableName: getTableName('notifications'),
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: '#read = :false',
      ExpressionAttributeNames: {
        '#read': 'read',
      },
      ExpressionAttributeValues: {
        ':userId': userId,
        ':false': false,
      },
      Select: 'COUNT',
    };

    const result = await dynamoDb.query(params);
    return result.Count || 0;
  }
}

module.exports = Notification;