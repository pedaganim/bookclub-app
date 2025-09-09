const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');
const LocalStorage = require('../lib/local-storage');

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development';

class BookClub {
  static async create(clubData, createdBy) {
    const clubId = uuidv4();
    const inviteCode = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const timestamp = new Date().toISOString();

    const club = {
      clubId,
      name: clubData.name,
      description: clubData.description || '',
      createdBy,
      inviteCode,
      isPrivate: clubData.isPrivate || false,
      memberLimit: clubData.memberLimit || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (isOffline()) {
      await LocalStorage.createClub(club);
      // Add creator as admin member
      await this.addMember(clubId, createdBy, 'admin');
      return club;
    }

    await dynamoDb.put(getTableName('bookclub-groups'), club);
    // Add creator as admin member
    await this.addMember(clubId, createdBy, 'admin');
    return club;
  }

  static async getById(clubId) {
    if (isOffline()) {
      return LocalStorage.getClubById(clubId);
    }
    return dynamoDb.get(getTableName('bookclub-groups'), { clubId });
  }

  static async getByInviteCode(inviteCode) {
    if (isOffline()) {
      return LocalStorage.getClubByInviteCode(inviteCode);
    }
    const params = {
      TableName: getTableName('bookclub-groups'),
      IndexName: 'InviteCodeIndex',
      KeyConditionExpression: 'inviteCode = :inviteCode',
      ExpressionAttributeValues: { ':inviteCode': inviteCode },
      Limit: 1,
    };
    const result = await dynamoDb.query(params);
    return result[0] || null;
  }

  static async update(clubId, updates) {
    const timestamp = new Date().toISOString();
    if (isOffline()) {
      const existing = await LocalStorage.getClubById(clubId);
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: timestamp };
      await LocalStorage.createClub(updated);
      return updated;
    }

    const updateData = { ...updates, updatedAt: timestamp };
    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
      dynamoDb.generateUpdateExpression(updateData);
    const params = {
      TableName: getTableName('bookclub-groups'),
      Key: { clubId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    const result = await dynamoDb.update(params);
    return result.Attributes;
  }

  static async delete(clubId) {
    if (isOffline()) {
      await LocalStorage.deleteClub(clubId);
      await LocalStorage.deleteAllClubMembers(clubId);
      return;
    }

    // Delete all members first
    await this.deleteAllMembers(clubId);
    // Then delete the club
    await dynamoDb.delete(getTableName('bookclub-groups'), { clubId });
  }

  static async addMember(clubId, userId, role = 'member') {
    const timestamp = new Date().toISOString();
    const membership = {
      clubId,
      userId,
      role,
      joinedAt: timestamp,
    };

    if (isOffline()) {
      await LocalStorage.createClubMember(membership);
      return membership;
    }

    await dynamoDb.put(getTableName('bookclub-members'), membership);
    return membership;
  }

  static async removeMember(clubId, userId) {
    if (isOffline()) {
      await LocalStorage.deleteClubMember(clubId, userId);
      return;
    }

    await dynamoDb.delete(getTableName('bookclub-members'), { clubId, userId });
  }

  static async getMembers(clubId) {
    if (isOffline()) {
      return LocalStorage.getClubMembers(clubId);
    }

    const params = {
      TableName: getTableName('bookclub-members'),
      KeyConditionExpression: 'clubId = :clubId',
      ExpressionAttributeValues: { ':clubId': clubId },
    };
    return dynamoDb.query(params);
  }

  static async getUserClubs(userId) {
    if (isOffline()) {
      const memberships = await LocalStorage.getUserClubs(userId);
      // Get club details for each membership
      const clubs = [];
      for (const membership of memberships) {
        const club = await LocalStorage.getClubById(membership.clubId);
        if (club) {
          clubs.push({
            ...club,
            userRole: membership.role,
            joinedAt: membership.joinedAt,
          });
        }
      }
      return clubs;
    }

    const params = {
      TableName: getTableName('bookclub-members'),
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    };
    const memberships = await dynamoDb.query(params);
    
    // Get club details for each membership
    const clubs = [];
    for (const membership of memberships) {
      const club = await this.getById(membership.clubId);
      if (club) {
        clubs.push({
          ...club,
          userRole: membership.role,
          joinedAt: membership.joinedAt,
        });
      }
    }
    return clubs;
  }

  static async isMember(clubId, userId) {
    if (isOffline()) {
      return LocalStorage.isClubMember(clubId, userId);
    }

    const result = await dynamoDb.get(getTableName('bookclub-members'), { clubId, userId });
    return result !== null;
  }

  static async getMemberRole(clubId, userId) {
    if (isOffline()) {
      const member = await LocalStorage.getClubMember(clubId, userId);
      return member?.role || null;
    }

    const result = await dynamoDb.get(getTableName('bookclub-members'), { clubId, userId });
    return result?.role || null;
  }

  static async deleteAllMembers(clubId) {
    if (isOffline()) {
      await LocalStorage.deleteAllClubMembers(clubId);
      return;
    }

    const members = await this.getMembers(clubId);
    for (const member of members) {
      await this.removeMember(clubId, member.userId);
    }
  }

  static async regenerateInviteCode(clubId) {
    const newInviteCode = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    return this.update(clubId, { inviteCode: newInviteCode });
  }
}

module.exports = BookClub;