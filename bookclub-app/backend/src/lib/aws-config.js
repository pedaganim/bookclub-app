const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');

// Configure AWS for local development from centralized config
if (process.env.IS_OFFLINE || process.env.NODE_ENV === 'development') {
  const configPath = path.join(__dirname, '..', '..', 'config', 'app.json');
  let cfg = {};
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    cfg = JSON.parse(raw);
  } catch (e) {
    console.warn(`[aws-config] Could not read config at ${configPath}:`, e.message);
  }

  const region = cfg.region || 'us-east-1';
  const local = cfg.local || {};

  AWS.config.update({
    region,
    accessKeyId: local.awsAccessKeyId || 'local',
    secretAccessKey: local.awsSecretAccessKey || 'local',
  });

  if (local.dynamodbEndpoint) {
    AWS.config.update({
      dynamodb: { endpoint: local.dynamodbEndpoint },
    });
  }
}

module.exports = AWS;
