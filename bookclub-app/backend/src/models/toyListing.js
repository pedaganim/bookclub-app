const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');

const isOffline = () =>
  process.env.APP_ENV !== 'local' &&
  (process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development');

// Lazy loader to avoid requiring local-storage in AWS Lambda
let _LocalStorage = null;
function LocalStorage() {
  if (!_LocalStorage) {
    // eslint-disable-next-line global-require
    _LocalStorage = require('../lib/local-storage');
  }
  return _LocalStorage;
}

class ToyListing {
  /**
   * Create a new toy listing.
   * @param {Object} data
   * @param {string} userId - The authenticated user's ID.
   */
  static async create(data, userId) {
    const listingId = uuidv4();
    const timestamp = new Date().toISOString();

    const listing = {
      listingId,
      userId,
      // libraryType distinguishes toy / tool / event / game listings in the shared table
      libraryType: data.libraryType || 'toy',
      title: data.title,
      description: data.description || '',
      condition: data.condition || 'good', // new | like_new | good | fair
      category: data.category || null,
      images: data.images || null,
      status: 'available',
      location: data.location || null,
      wantInReturn: data.wantInReturn || null,
      // Denormalised owner name so cards can display it without a join
      userName: data.userName || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (isOffline()) {
      await LocalStorage().createToyListing(listing);
      return listing;
    }

    await dynamoDb.put(getTableName('toy-listings'), listing);
    return listing;
  }

  /**
   * Get a single listing by ID.
   */
  static async getById(listingId) {
    if (isOffline()) {
      return LocalStorage().getToyListing(listingId);
    }
    return dynamoDb.get(getTableName('toy-listings'), { listingId });
  }

  /**
   * List all listings (public browse), with optional libraryType filter and pagination.
   * @param {number} limit
   * @param {string|null} nextToken
   * @param {string|null} libraryType - filter to a specific library type
   */
  static async listAll(limit = 20, nextToken = null, libraryType = null) {
    if (isOffline()) {
      let all = await LocalStorage().listToyListings();
      if (libraryType) all = all.filter((l) => l.libraryType === libraryType);
      return {
        items: all.slice(0, limit),
        nextToken: all.length > limit ? 'has-more' : null,
      };
    }

    const params = {
      TableName: getTableName('toy-listings'),
      Limit: limit,
    };

    if (libraryType) {
      params.FilterExpression = 'libraryType = :libraryType';
      params.ExpressionAttributeValues = { ':libraryType': libraryType };
    }

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(
        Buffer.from(nextToken, 'base64').toString('utf-8')
      );
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
   * List listings for a specific user (via GSI UserIdIndex).
   * @param {string} userId
   * @param {number} limit
   * @param {string|null} nextToken
   * @param {string|null} libraryType - optional filter
   */
  static async listByUser(userId, limit = 50, nextToken = null, libraryType = null) {
    if (isOffline()) {
      let all = await LocalStorage().listToyListings(userId);
      if (libraryType) all = all.filter((l) => l.libraryType === libraryType);
      return {
        items: all.slice(0, limit),
        nextToken: all.length > limit ? 'has-more' : null,
      };
    }

    const params = {
      TableName: getTableName('toy-listings'),
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: limit,
      ScanIndexForward: false,
    };

    if (libraryType) {
      params.FilterExpression = 'libraryType = :libraryType';
      params.ExpressionAttributeValues[':libraryType'] = libraryType;
    }

    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(
        Buffer.from(nextToken, 'base64').toString('utf-8')
      );
    }

    const result = await dynamoDb.query(params);
    return {
      items: result.Items || [],
      nextToken: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : null,
    };
  }

  /**
   * Update a listing. Only the owner can update (ConditionExpression).
   */
  static async update(listingId, userId, updates) {
    const timestamp = new Date().toISOString();
    const updateData = { ...updates, updatedAt: timestamp };

    if (isOffline()) {
      // Verify ownership in offline mode
      const existing = await LocalStorage().getToyListing(listingId);
      if (!existing) throw new Error('Listing not found');
      if (existing.userId !== userId) throw new Error('Not authorised');
      return LocalStorage().updateToyListing(listingId, updateData);
    }

    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
      dynamoDb.generateUpdateExpression(updateData);

    const params = {
      TableName: getTableName('toy-listings'),
      Key: { listingId },
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
    } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') {
        throw new Error('Listing not found or you do not have permission to update it');
      }
      throw err;
    }
  }

  /**
   * Delete a listing. Only the owner can delete.
   */
  static async delete(listingId, userId) {
    if (isOffline()) {
      const existing = await LocalStorage().getToyListing(listingId);
      if (!existing) throw new Error('Listing not found');
      if (existing.userId !== userId) throw new Error('Not authorised');
      return LocalStorage().deleteToyListing(listingId);
    }

    const params = {
      TableName: getTableName('toy-listings'),
      Key: { listingId },
      ConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    };

    try {
      await dynamoDb.delete(params);
      return { success: true };
    } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') {
        throw new Error('Listing not found or you do not have permission to delete it');
      }
      throw err;
    }
  }
  /**
   * System-level update — bypasses ownership check.
   * Called only by internal workers (Bedrock analyzer) that don't hold a userId.
   */
  static async systemUpdate(listingId, updates) {
    const timestamp = new Date().toISOString();
    const updateData = { ...updates, updatedAt: timestamp };

    if (isOffline()) {
      const existing = await LocalStorage().getToyListing(listingId);
      if (!existing) throw new Error('Listing not found');
      return LocalStorage().updateToyListing(listingId, updateData);
    }

    const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
      dynamoDb.generateUpdateExpression(updateData);

    const params = {
      TableName: getTableName('toy-listings'),
      Key: { listingId },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDb.update(params);
    return result.Attributes;
  }
}

module.exports = ToyListing;
