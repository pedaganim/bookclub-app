const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const dynamoDb = require('../lib/dynamodb');
const { getTableName } = require('../lib/table-names');

function makeConversationId(userAId, userBId) {
  const [a, b] = [userAId, userBId].sort();
  const base = `${a}#${b}`;
  return crypto.createHash('sha256').update(base).digest('hex').slice(0, 32);
}

async function ensureConversation(userAId, userBId) {
  const conversationId = makeConversationId(userAId, userBId);
  const table = getTableName('dm-conversations');
  const existing = await dynamoDb.get(table, { conversationId });
  const now = new Date().toISOString();
  if (existing) return existing;
  const item = {
    conversationId,
    userAId: [userAId, userBId].sort()[0],
    userBId: [userAId, userBId].sort()[1],
    lastMessageAt: now,
    lastMessageSnippet: '',
    unreadCountForUserA: 0,
    unreadCountForUserB: 0,
    createdAt: now,
    updatedAt: now,
  };
  await dynamoDb.put(table, item);
  return item;
}

async function updateConversationSummary(conversationId, lastMessageAt, snippet, recipientId) {
  const table = getTableName('dm-conversations');
  // Fetch to know whether recipient is A or B
  const conv = await dynamoDb.get(table, { conversationId });
  if (!conv) return;
  const isRecipientA = conv.userAId === recipientId;
  const updates = {
    lastMessageAt,
    lastMessageSnippet: snippet,
    updatedAt: lastMessageAt,
    unreadCountForUserA: isRecipientA ? (conv.unreadCountForUserA + 1) : conv.unreadCountForUserA,
    unreadCountForUserB: !isRecipientA ? (conv.unreadCountForUserB + 1) : conv.unreadCountForUserB,
  };
  const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = dynamoDb.generateUpdateExpression(updates);
  await dynamoDb.update({
    TableName: table,
    Key: { conversationId },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'NONE',
  });
}

async function markRead(conversationId, userId) {
  const table = getTableName('dm-conversations');
  const conv = await dynamoDb.get(table, { conversationId });
  if (!conv) return;
  const isA = conv.userAId === userId;
  const updates = isA ? { unreadCountForUserA: 0 } : { unreadCountForUserB: 0 };
  const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = dynamoDb.generateUpdateExpression({ ...updates, updatedAt: new Date().toISOString() });
  await dynamoDb.update({
    TableName: table,
    Key: { conversationId },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'NONE',
  });
}

async function listConversationsForUser(userId, limit = 20, lastKey) {
  const table = getTableName('dm-conversations');
  const indexA = 'UserAIndex';
  const indexB = 'UserBIndex';
  const paramsA = {
    TableName: table,
    IndexName: indexA,
    KeyConditionExpression: 'userAId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    Limit: limit,
    ScanIndexForward: false,
  };
  const paramsB = {
    TableName: table,
    IndexName: indexB,
    KeyConditionExpression: 'userBId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    Limit: limit,
    ScanIndexForward: false,
  };
  const [resA, resB] = await Promise.all([
    dynamoDb.query(paramsA),
    dynamoDb.query(paramsB),
  ]);
  // Merge and sort by lastMessageAt desc
  const items = [...(resA.Items || []), ...(resB.Items || [])]
    .sort((x, y) => (y.lastMessageAt || '').localeCompare(x.lastMessageAt || ''))
    .slice(0, limit);
  return { items };
}

async function sendMessage({ conversationId, fromUserId, toUserId, content }) {
  const table = getTableName('dm-messages');
  const now = new Date().toISOString();
  const messageId = `${now}#${uuidv4()}`;
  const item = {
    conversationId,
    messageId,
    createdAt: now,
    fromUserId,
    toUserId,
    content,
  };
  await dynamoDb.put(table, item);
  await updateConversationSummary(conversationId, now, content.slice(0, 140), toUserId);
  return item;
}

async function listMessages(conversationId, limit = 20, nextToken) {
  const table = getTableName('dm-messages');
  const params = {
    TableName: table,
    IndexName: 'ConversationCreatedAtIndex',
    KeyConditionExpression: 'conversationId = :cid',
    ExpressionAttributeValues: { ':cid': conversationId },
    Limit: limit,
    ScanIndexForward: false,
  };
  if (nextToken) params.ExclusiveStartKey = nextToken;
  const res = await dynamoDb.query(params);
  return { items: res.Items || [], nextToken: res.LastEvaluatedKey };
}

module.exports = {
  makeConversationId,
  ensureConversation,
  listConversationsForUser,
  sendMessage,
  listMessages,
  markRead,
};
