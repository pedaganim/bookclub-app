const { v4: uuidv4 } = require('uuid');
const LocalStorage = require('../lib/local-storage');
const dynamoDb = require('../lib/dynamodb');
const { getTableName } = require('../lib/table-names');

const isOffline = () =>
  process.env.IS_OFFLINE === 'true' ||
  process.env.SERVERLESS_OFFLINE === 'true' ||
  process.env.APP_ENV === 'local' ||
  process.env.NODE_ENV === 'test';

const VALID_STATUSES = ['available', 'given_back', 'disposed', 'lent'];
const VALID_ITEM_TYPES = ['book', 'toy', 'tool', 'game', 'other', 'unknown'];

class LostFound {
  static async create(data, userId) {
    const now = new Date().toISOString();
    const item = {
      lostFoundId: uuidv4(),
      clubId: data.clubId,
      userId,
      title: data.title,
      description: data.description || '',
      itemType: VALID_ITEM_TYPES.includes(data.itemType) ? data.itemType : 'unknown',
      status: 'available',
      foundLocation: data.foundLocation || '',
      foundDate: data.foundDate || null,
      images: Array.isArray(data.images) ? data.images : [],
      claimedByUserId: null,
      createdAt: now,
      updatedAt: now,
    };

    if (isOffline()) {
      return LocalStorage.createLostFoundItem(item);
    }

    await dynamoDb.put(getTableName('lost-found'), item);
    return item;
  }

  static async getById(lostFoundId) {
    if (isOffline()) {
      return LocalStorage.getLostFoundItem(lostFoundId);
    }
    return dynamoDb.get(getTableName('lost-found'), { lostFoundId });
  }

  static async listByClub(clubId, opts = {}) {
    const { limit = 50, nextToken = null, status = null, search = null } = opts;

    if (isOffline()) {
      let items = await LocalStorage.listLostFoundByClub(clubId);
      if (status) items = items.filter(i => i.status === status);
      if (search) {
        const q = search.toLowerCase();
        items = items.filter(i =>
          (i.title || '').toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q) ||
          (i.foundLocation || '').toLowerCase().includes(q)
        );
      }
      return { items: items.slice(0, limit), nextToken: items.length > limit ? 'has-more' : null };
    }

    const params = {
      TableName: getTableName('lost-found'),
      IndexName: 'ClubIdIndex',
      KeyConditionExpression: 'clubId = :clubId',
      ExpressionAttributeValues: { ':clubId': clubId },
      ScanIndexForward: false,
      Limit: limit,
    };

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf-8'));
    }

    const filters = [];
    if (status) {
      params.ExpressionAttributeValues[':status'] = status;
      filters.push('#st = :status');
      params.ExpressionAttributeNames = { ...(params.ExpressionAttributeNames || {}), '#st': 'status' };
    }
    if (filters.length > 0) params.FilterExpression = filters.join(' AND ');

    const result = await dynamoDb.query(params);
    let items = result.Items || [];

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.foundLocation || '').toLowerCase().includes(q)
      );
    }

    const paginationToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;

    return { items, nextToken: paginationToken };
  }

  static async listByUser(userId, opts = {}) {
    const { limit = 100 } = opts;

    if (isOffline()) {
      const items = await LocalStorage.listLostFoundByUser(userId);
      return { items: items.slice(0, limit), nextToken: null };
    }

    const params = {
      TableName: getTableName('lost-found'),
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ScanIndexForward: false,
      Limit: limit,
    };

    const result = await dynamoDb.query(params);
    return { items: result.Items || [], nextToken: null };
  }

  static async update(lostFoundId, userId, patch, userRole = null) {
    const existing = await this.getById(lostFoundId);
    if (!existing) return null;

    const isOwner = existing.userId === userId;
    const isAdmin = userRole === 'admin' || userRole === 'moderator';
    if (!isOwner && !isAdmin) throw new Error('FORBIDDEN');

    const allowed = {};
    if (patch.status && VALID_STATUSES.includes(patch.status)) {
      allowed.status = patch.status;
      if (patch.status === 'given_back' && patch.claimedByUserId) {
        allowed.claimedByUserId = patch.claimedByUserId;
      }
    }
    if (patch.title !== undefined) allowed.title = patch.title;
    if (patch.description !== undefined) allowed.description = patch.description;
    if (patch.foundLocation !== undefined) allowed.foundLocation = patch.foundLocation;
    if (patch.foundDate !== undefined) allowed.foundDate = patch.foundDate;
    if (patch.itemType && VALID_ITEM_TYPES.includes(patch.itemType)) allowed.itemType = patch.itemType;
    if (Array.isArray(patch.images)) allowed.images = patch.images;

    if (isOffline()) {
      return LocalStorage.updateLostFoundItem(lostFoundId, allowed);
    }

    const now = new Date().toISOString();
    const updates = { ...allowed, updatedAt: now };
    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
      dynamoDb.generateUpdateExpression(updates);

    const result = await dynamoDb.update({
      TableName: getTableName('lost-found'),
      Key: { lostFoundId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    return result.Attributes;
  }

  static async delete(lostFoundId, userId, userRole = null) {
    const existing = await this.getById(lostFoundId);
    if (!existing) return false;

    const isOwner = existing.userId === userId;
    const isAdmin = userRole === 'admin' || userRole === 'moderator';
    if (!isOwner && !isAdmin) throw new Error('FORBIDDEN');

    if (isOffline()) {
      return LocalStorage.deleteLostFoundItem(lostFoundId);
    }

    await dynamoDb.delete(getTableName('lost-found'), { lostFoundId });
    return true;
  }
}

module.exports = LostFound;
