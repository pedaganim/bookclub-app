const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');

// APP_ENV=local  → connect to local DynamoDB at localhost:8000
// APP_ENV=dev/prod → use real AWS DynamoDB (credentials from environment/IAM)
const APP_ENV = process.env.APP_ENV || '';
const isLocal = APP_ENV === 'local';

if (isLocal) {
  const configPath = path.join(__dirname, '..', '..', 'config', 'app.local.json');
  let cfg = {};
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    cfg = JSON.parse(raw);
    console.log('[aws-config] Using local DynamoDB at', cfg.dynamodbEndpoint);
  } catch (e) {
    console.warn(`[aws-config] Could not read local config at ${configPath}:`, e.message);
  }

  const region = cfg.region || 'us-east-1';
  const localstackEndpoint = cfg.localstackEndpoint || 'http://localhost:4566';

  AWS.config.update({
    region,
    accessKeyId: cfg.awsAccessKeyId || 'local',
    secretAccessKey: cfg.awsSecretAccessKey || 'local',
    // DynamoDB → local container
    dynamodb: { endpoint: cfg.dynamodbEndpoint || 'http://localhost:8000' },
    // S3, Lambda, EventBridge → LocalStack
    s3: { endpoint: localstackEndpoint, s3ForcePathStyle: true },
    lambda: { endpoint: localstackEndpoint },
    eventbridge: { endpoint: localstackEndpoint },
  });
  console.log('[aws-config] S3/Lambda/EventBridge → LocalStack at', localstackEndpoint);
}

module.exports = AWS;
