const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const { DynamoDB } = require('../lib/aws-config');

const TABLE_KEY = 'bookclub-app-bookclub-posts';

class Post {
  /**
   * Create a new club post.
   * Fields stored: postId, clubId, userId, content, createdAt, createdAt_postId
   *
   * createdAt_postId is a composite key (createdAt#postId) used by the ClubIdIndex GSI
   * to support efficient pagination sorted by time.
   */
  static async create(data, userId) {
    const postId = uuidv4();
    const createdAt = new Date().toISOString();

    const post = {
      postId,
      clubId: data.clubId,
      userId,
      content: data.content || '',
      // Composite sort key for GSI: enables sorted queries per club
      createdAt_postId: `${createdAt}#${postId}`,
      createdAt,
    };

    const dynamo = new DynamoDB.DocumentClient();
    await dynamo.put({
      TableName: getTableName(TABLE_KEY),
      Item: post,
    }).promise();

    return post;
  }

  /**
   * Get a single post by ID.
   */
  static async getById(postId) {
    const dynamo = new DynamoDB.DocumentClient();
    const result = await dynamo.get({
      TableName: getTableName(TABLE_KEY),
      Key: { postId },
    }).promise();
    return result.Item || null;
  }

  /**
   * List posts for a club, sorted by createdAt descending.
   * Queries the ClubIdIndex GSI using clubId (HASH) + createdAt_postId (RANGE).
   *
   * @param {string} clubId
   * @param {Object} options - { limit, lastEvaluatedKey }
   */
  static async listByClub(clubId, options = {}) {
    const { limit = 20, lastEvaluatedKey = null } = options;

    const dynamo = new DynamoDB.DocumentClient();
    const params = {
      TableName: getTableName(TABLE_KEY),
      IndexName: 'ClubIdIndex',
      KeyConditionExpression: 'clubId = :clubId',
      ExpressionAttributeValues: { ':clubId': clubId },
      ScanIndexForward: false, // newest first via createdAt_postId range key
      Limit: limit,
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await dynamo.query(params).promise();
    return {
      items: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey || null,
    };
  }

  /**
   * Delete a post.
   */
  static async delete(postId) {
    const dynamo = new DynamoDB.DocumentClient();
    await dynamo.delete({
      TableName: getTableName(TABLE_KEY),
      Key: { postId },
    }).promise();
    return true;
  }
}

module.exports = Post;
