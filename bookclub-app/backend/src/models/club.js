const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');
const LocalStorage = require('../lib/local-storage');
const NotificationService = require('../lib/notification-service');

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development';

class Club {
  static async create(clubData, creatorId) {
    const clubId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const club = {
      clubId,
      name: clubData.name,
      description: clubData.description || '',
      creatorId,
      members: [creatorId], // Creator is automatically a member
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (isOffline()) {
      return await LocalStorage.createClub(club);
    }

    await dynamoDb.put(getTableName('clubs'), club);
    return club;
  }

  static async getById(clubId) {
    if (isOffline()) {
      return await LocalStorage.getClub(clubId);
    }
    
    return dynamoDb.get(getTableName('clubs'), { clubId });
  }

  static async addMember(clubId, userId) {
    if (isOffline()) {
      return await LocalStorage.addClubMember(clubId, userId);
    }

    const updateData = { 
      updatedAt: new Date().toISOString()
    };
    
    const params = {
      TableName: getTableName('clubs'),
      Key: { clubId },
      UpdateExpression: 'ADD members :userId SET updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':userId': new Set([userId]),
        ':updatedAt': updateData.updatedAt,
      },
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDb.update(params);
    return result.Attributes;
  }

  static async broadcastNotification(clubId, type, title, message, data = {}, excludeUserId = null) {
    const club = await this.getById(clubId);
    if (!club) {
      throw new Error('Club not found');
    }

    const notifications = [];
    for (const memberId of club.members) {
      if (memberId !== excludeUserId) {
        try {
          const notification = await NotificationService.sendNotification(
            memberId,
            type,
            title,
            message,
            { ...data, clubId, clubName: club.name }
          );
          if (notification) {
            notifications.push(notification);
          }
        } catch (error) {
          console.error(`Failed to send notification to member ${memberId}:`, error);
        }
      }
    }

    return notifications;
  }
}

module.exports = Club;