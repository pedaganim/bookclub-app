/**
 * seed-local-dynamo.js
 *
 * Seeds local DynamoDB tables from the existing .local-storage JSON files.
 * Run after setup-local-dynamo.js: npm run local:seed
 *
 * Usage: APP_ENV=local node scripts/seed-local-dynamo.js
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

const dynamo = new AWS.DynamoDB.DocumentClient({
  region: cfg.region || 'us-east-1',
  accessKeyId: cfg.awsAccessKeyId || 'local',
  secretAccessKey: cfg.awsSecretAccessKey || 'local',
  endpoint: ENDPOINT,
});

const STORAGE_DIR = path.join(__dirname, '..', '.local-storage');

function tableName(key) {
  return `${SVC}-${key}-${STAGE}`;
}

/**
 * Load a JSON file from .local-storage.
 * The files store records as an object map keyed by primary ID,
 * OR as a plain array — this handles both.
 */
function loadJsonFile(filename) {
  const filePath = path.join(STORAGE_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  Not found, skipping: ${filePath}`);
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (Array.isArray(raw)) return raw;
  return Object.values(raw);
}

/**
 * Remove undefined/null attributes that DynamoDB rejects.
 * Also strips keys with empty string values for GSI keys.
 */
function sanitize(item) {
  const out = {};
  for (const [k, v] of Object.entries(item)) {
    if (v !== undefined && v !== null) {
      out[k] = v;
    }
  }
  return out;
}

async function seedTable(tableKey, items) {
  const tbl = tableName(tableKey);
  let ok = 0;
  let skip = 0;

  for (const item of items) {
    const clean = sanitize(item);
    try {
      await dynamo.put({ TableName: tbl, Item: clean }).promise();
      ok++;
    } catch (err) {
      console.error(`  ❌ Failed to seed item into ${tbl}:`, err.message, JSON.stringify(clean));
      skip++;
    }
  }
  console.log(`  ✅ ${tbl}: ${ok} seeded, ${skip} failed`);
}

async function main() {
  console.log(`\n🌱 Seeding local DynamoDB at ${ENDPOINT} (stage=${STAGE})\n`);

  // Verify connection
  try {
    const raw = new AWS.DynamoDB({
      region: cfg.region || 'us-east-1',
      accessKeyId: cfg.awsAccessKeyId || 'local',
      secretAccessKey: cfg.awsSecretAccessKey || 'local',
      endpoint: ENDPOINT,
    });
    await raw.listTables().promise();
  } catch (err) {
    console.error(`\n❌ Cannot connect to DynamoDB Local at ${ENDPOINT}`);
    console.error('   Make sure it is running: docker compose up -d dynamodb-local\n');
    process.exit(1);
  }

  const books = loadJsonFile('books.json');
  const users = loadJsonFile('users.json');
  const clubs = loadJsonFile('clubs.json');
  const clubMembers = loadJsonFile('club-members.json');

  await seedTable('books', books);
  await seedTable('users', users);
  await seedTable('bookclub-groups', clubs);
  await seedTable('bookclub-members', clubMembers);

  console.log('\n✅ Seeding complete.\n');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
