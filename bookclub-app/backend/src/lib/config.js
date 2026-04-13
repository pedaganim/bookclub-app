const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.SERVICE_NAME 
  ? `${process.env.SERVICE_NAME}-metadata-cache-${process.env.STAGE}` 
  : `bookclub-app-metadata-cache-${process.env.STAGE}`;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
let cachedConfig = null;
let lastFetch = 0;

/**
 * Fetches system configuration from DynamoDB with local caching.
 * Key: 'system_config'
 */
async function getSystemConfig() {
  const now = Date.now();
  if (cachedConfig && (now - lastFetch < CACHE_TTL_MS)) {
    return cachedConfig;
  }

  try {
    const res = await dynamo.get({
      TableName: TABLE_NAME,
      Key: { cacheKey: 'system_config' }
    }).promise();

    cachedConfig = res.Item?.data || {};
    lastFetch = now;
    return cachedConfig;
  } catch (err) {
    console.warn('[Config] Failed to fetch system config from DynamoDB:', err.message);
    return cachedConfig || {};
  }
}

/**
 * Helper to get a specific setting with an environment variable fallback.
 */
async function getSetting(key, envFallback) {
  const config = await getSystemConfig();
  // Map our keys to the ones in the DynamoDB record
  const dbKey = key.toLowerCase();
  return config[dbKey] || process.env[key] || envFallback;
}

module.exports = {
  getSystemConfig,
  getSetting
};
