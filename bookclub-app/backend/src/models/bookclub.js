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
      location: clubData.location,
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

  static async listPendingRequests(clubId) {
    if (isOffline()) {
      const all = await LocalStorage.getClubMembers(clubId);
      return (all || []).filter(m => m.status === 'pending');
    }
    const params = {
      TableName: getTableName('bookclub-members'),
      KeyConditionExpression: 'clubId = :clubId',
      ExpressionAttributeValues: { ':clubId': clubId },
      FilterExpression: '#status = :pending',
      ExpressionAttributeNames: { '#status': 'status' },
    };
    const result = await dynamoDb.query(params);
    return result.Items || [];
  }

  static async approveJoinRequest(clubId, userId) {
    const timestamp = new Date().toISOString();
    if (isOffline()) {
      const member = await LocalStorage.getClubMember(clubId, userId);
      const updated = { ...(member || { clubId, userId, role: 'member' }), status: 'active', joinedAt: timestamp };
      await LocalStorage.createClubMember(updated);
      return updated;
    }
    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = dynamoDb.generateUpdateExpression({ status: 'active', joinedAt: timestamp });
    const params = {
      TableName: getTableName('bookclub-members'),
      Key: { clubId, userId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    const result = await dynamoDb.update(params);
    return result.Attributes;
  }

  static async rejectJoinRequest(clubId, userId) {
    if (isOffline()) {
      await LocalStorage.deleteClubMember(clubId, userId);
      return { success: true };
    }
    await dynamoDb.delete(getTableName('bookclub-members'), { clubId, userId });
    return { success: true };
  }

  static async listPublicClubs(limit = 10, nextToken = null, search = null) {
    if (isOffline()) {
      let clubs = await LocalStorage.listClubs();
      clubs = (clubs || []).filter(c => !c.isPrivate);
      if (search) {
        const q = search.toLowerCase();
        clubs = clubs.filter(c => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.location?.toLowerCase().includes(q));
      }
      return { items: clubs.slice(0, limit), nextToken: clubs.length > limit ? 'has-more' : null };
    }
    const params = {
      TableName: getTableName('bookclub-groups'),
      Limit: limit,
      FilterExpression: 'attribute_not_exists(isPrivate) OR isPrivate = :false',
      ExpressionAttributeValues: { ':false': false },
    };
    if (search) {
      params.FilterExpression += ' AND (contains(#name, :q) OR contains(#desc, :q) OR contains(#loc, :q))';
      params.ExpressionAttributeNames = { ...(params.ExpressionAttributeNames || {}), '#name': 'name', '#desc': 'description', '#loc': 'location' };
      params.ExpressionAttributeValues[':q'] = search;
    }
    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }
    const result = await dynamoDb.scan(params);
    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : null,
    };
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
    return (result.Items && result.Items[0]) || null;
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
      status: 'active',
    };

    if (isOffline()) {
      await LocalStorage.createClubMember(membership);
      return membership;
    }

    await dynamoDb.put(getTableName('bookclub-members'), membership);
    return membership;
  }

  static async createJoinRequest(clubId, userId) {
    const timestamp = new Date().toISOString();
    const record = {
      clubId,
      userId,
      role: 'member',
      joinedAt: null,
      status: 'pending',
      requestedAt: timestamp,
    };

    if (isOffline()) {
      // In offline, overwrite or create a pending record
      await LocalStorage.createClubMember(record);
      return record;
    }

    // Check if already a member
    const existing = await dynamoDb.get(getTableName('bookclub-members'), { clubId, userId });
    if (existing && existing.status === 'active') {
      const err = new Error('Already a member of this club');
      err.code = 'AlreadyMember';
      throw err;
    }

    await dynamoDb.put(getTableName('bookclub-members'), record);
    return record;
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
    const result = await dynamoDb.query(params);
    return result.Items || [];
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
    const items = memberships.Items || [];

    // Get club details for each membership
    const clubs = [];
    for (const membership of items) {
      const club = await this.getById(membership.clubId);
      if (club) {
        clubs.push({
          ...club,
          userRole: membership.role,
          joinedAt: membership.joinedAt,
          userStatus: membership.status || 'active',
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