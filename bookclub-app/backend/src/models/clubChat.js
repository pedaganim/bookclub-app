const { v4: uuidv4 } = require('uuid');
const dynamoDb = require('../lib/dynamodb');
const { getTableName } = require('../lib/table-names');

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.SERVERLESS_OFFLINE === 'true' || process.env.NODE_ENV === 'test';

async function sendMessage({ clubId, fromUserId, content }) {
  if (isOffline()) {
    const now = new Date().toISOString();
    return { clubId, messageId: `${now}#offline`, createdAt: now, fromUserId, content };
  }
  const table = getTableName('club-messages');
  const now = new Date().toISOString();
  const messageId = `${now}#${uuidv4()}`;
  const item = {
    clubId,
    messageId,
    createdAt: now,
    fromUserId,
    content,
  };
  await dynamoDb.put(table, item);
  return item;
}

async function listMessages(clubId, limit = 50, nextToken) {
  if (isOffline()) return { items: [], nextToken: null };
  const table = getTableName('club-messages');
  const params = {
    TableName: table,
    IndexName: 'ClubCreatedAtIndex',
    KeyConditionExpression: 'clubId = :cid',
    ExpressionAttributeValues: { ':cid': clubId },
    Limit: limit,
    ScanIndexForward: false, // Descending order (newest first)
  };
  if (nextToken) params.ExclusiveStartKey = nextToken;
  const res = await dynamoDb.query(params);
  return { items: res.Items || [], nextToken: res.LastEvaluatedKey };
}

module.exports = {
  sendMessage,
  listMessages,
};
