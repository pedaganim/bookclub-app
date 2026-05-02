/**
 * setup-local-dynamo.js
 *
 * Creates all DynamoDB tables (with GSIs) in a local DynamoDB instance.
 * Run once before starting the server: npm run local:setup
 *
 * Usage: APP_ENV=local node scripts/setup-local-dynamo.js
 */

'use strict';

const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');

// Load local config
const configPath = path.join(__dirname, '..', 'config', 'app.local.json');
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const ENDPOINT = cfg.dynamodbEndpoint || 'http://localhost:8000';
const STAGE = process.env.STAGE || 'local';
const SVC = 'bookclub-app';

const dynamo = new AWS.DynamoDB({
  region: cfg.region || 'us-east-1',
  accessKeyId: cfg.awsAccessKeyId || 'local',
  secretAccessKey: cfg.awsSecretAccessKey || 'local',
  endpoint: ENDPOINT,
});

function tableName(key) {
  return `${SVC}-${key}-${STAGE}`;
}

// Table definitions matching the production schema + all GSIs used in the codebase
const tables = [
  // ── books ──────────────────────────────────────────────────────────────────
  {
    TableName: tableName('books'),
    KeySchema: [{ AttributeName: 'bookId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'bookId',       AttributeType: 'S' },
      { AttributeName: 'userId',       AttributeType: 'S' },
      { AttributeName: 'lentToUserId', AttributeType: 'S' },
      { AttributeName: 'clubId',       AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIdIndex',
        KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'LentToUserIdIndex',
        KeySchema: [{ AttributeName: 'lentToUserId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'ClubIdIndex',
        KeySchema: [{ AttributeName: 'clubId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },

  // ── users ──────────────────────────────────────────────────────────────────
  {
    TableName: tableName('users'),
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'email',  AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },

  // ── bookclub-groups ────────────────────────────────────────────────────────
  {
    TableName: tableName('bookclub-groups'),
    KeySchema: [{ AttributeName: 'clubId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'clubId',     AttributeType: 'S' },
      { AttributeName: 'inviteCode', AttributeType: 'S' },
      { AttributeName: 'slug',       AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'InviteCodeIndex',
        KeySchema: [{ AttributeName: 'inviteCode', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'SlugIndex',
        KeySchema: [{ AttributeName: 'slug', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },

  // ── bookclub-members ───────────────────────────────────────────────────────
  {
    TableName: tableName('bookclub-members'),
    KeySchema: [
      { AttributeName: 'clubId', KeyType: 'HASH' },
      { AttributeName: 'userId', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'clubId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIdIndex',
        KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },

  // ── dm-conversations ───────────────────────────────────────────────────────
  {
    TableName: tableName('dm-conversations'),
    KeySchema: [{ AttributeName: 'conversationId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'conversationId', AttributeType: 'S' },
      { AttributeName: 'userId',         AttributeType: 'S' },
      { AttributeName: 'createdAt',      AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIdIndex',
        KeySchema: [
          { AttributeName: 'userId',    KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'ConversationCreatedAtIndex',
        KeySchema: [
          { AttributeName: 'conversationId', KeyType: 'HASH' },
          { AttributeName: 'createdAt',      KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },

  // ── dm-messages ────────────────────────────────────────────────────────────
  {
    TableName: tableName('dm-messages'),
    KeySchema: [
      { AttributeName: 'conversationId', KeyType: 'HASH' },
      { AttributeName: 'messageId',      KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'conversationId', AttributeType: 'S' },
      { AttributeName: 'messageId',      AttributeType: 'S' },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },

  // ── bookclub-posts ─────────────────────────────────────────────────────────
  {
    TableName: tableName('bookclub-posts'),
    KeySchema: [
      { AttributeName: 'clubId', KeyType: 'HASH' },
      { AttributeName: 'postId', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'clubId', AttributeType: 'S' },
      { AttributeName: 'postId', AttributeType: 'S' },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },

  // ── toy-listings ───────────────────────────────────────────────────────────
  {
    TableName: tableName('toy-listings'),
    KeySchema: [{ AttributeName: 'listingId', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'listingId', AttributeType: 'S' },
      { AttributeName: 'userId',    AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIdIndex',
        KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },

  // ── metadata-cache ─────────────────────────────────────────────────────────
  {
    TableName: tableName('metadata-cache'),
    KeySchema: [{ AttributeName: 'cacheKey', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'cacheKey', AttributeType: 'S' },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
];

async function createTable(def) {
  try {
    await dynamo.createTable(def).promise();
    console.log(`  ✅ Created: ${def.TableName}`);
  } catch (err) {
    if (err.code === 'ResourceInUseException') {
      console.log(`  ⏭  Exists:  ${def.TableName}`);
    } else {
      throw err;
    }
  }
}

async function waitForTable(tbl) {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await dynamo.describeTable({ TableName: tbl }).promise();
      if (res.Table.TableStatus === 'ACTIVE') return;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
}

async function main() {
  console.log(`\n🔧 Setting up local DynamoDB tables at ${ENDPOINT} (stage=${STAGE})\n`);

  // Verify connection
  try {
    await dynamo.listTables().promise();
  } catch (err) {
    console.error(`\n❌ Cannot connect to DynamoDB Local at ${ENDPOINT}`);
    console.error('   Make sure it is running: docker compose up -d dynamodb-local\n');
    process.exit(1);
  }

  for (const def of tables) {
    await createTable(def);
  }

  // Wait for all tables to become ACTIVE
  console.log('\n⏳ Waiting for tables to become ACTIVE...');
  await Promise.all(tables.map(t => waitForTable(t.TableName)));

  console.log('\n✅ All tables ready.\n');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
