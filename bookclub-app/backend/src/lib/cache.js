/**
 * Multi-tier Smart Caching Utility
 * 
 * L1: In-Memory (TTL-based) - Fastest, but scoped to single Lambda instance
 * L2: DynamoDB (metadata-cache) - Shared across Lambdas, slower than memory but faster than external APIs
 */
const { DynamoDB } = require('./aws-config');
const { getTableName } = require('./table-names');

// L1 Cache store
const L1_STORE = new Map();

class Cache {
  /**
   * Get an item from L1 cache
   * @param {string} key 
   */
  static getL1(key) {
    const entry = L1_STORE.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      L1_STORE.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Set an item in L1 cache
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlMs - Time to live in milliseconds
   */
  static setL1(key, value, ttlMs = 60000) {
    L1_STORE.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  /**
   * Invalidate L1 cache entry
   * @param {string} key 
   */
  static invalidateL1(key) {
    L1_STORE.delete(key);
  }

  /**
   * Get an item from L2 cache (DynamoDB metadata-cache table)
   * @param {string} cacheKey 
   */
  static async getL2(cacheKey) {
    try {
      const dynamodb = new DynamoDB.DocumentClient();
      const res = await dynamodb.get({
        TableName: getTableName('metadata-cache'),
        Key: { cacheKey }
      }).promise();
      
      if (!res.Item) return null;
      
      // DynamoDB TTL is handled by AWS, but we can do an extra check here if needed
      if (res.Item.ttl && Math.floor(Date.now() / 1000) > res.Item.ttl) {
        return null;
      }
      
      return res.Item.data || res.Item;
    } catch (e) {
      console.warn('[Cache] L2 Get failed:', e.message);
      return null;
    }
  }

  /**
   * Set an item in L2 cache
   * @param {string} cacheKey 
   * @param {any} data 
   * @param {number} ttlSeconds - Time to live in seconds (default 30 days)
   */
  static async setL2(cacheKey, data, ttlSeconds = 30 * 24 * 60 * 60) {
    try {
      const dynamodb = new DynamoDB.DocumentClient();
      const timestamp = new Date().toISOString();
      const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;
      
      await dynamodb.put({
        TableName: getTableName('metadata-cache'),
        Item: {
          cacheKey,
          data,
          cachedAt: timestamp,
          ttl
        }
      }).promise();
    } catch (e) {
      console.warn('[Cache] L2 Set failed:', e.message);
    }
  }

  /**
   * Invalidate L2 cache entry
   * @param {string} cacheKey 
   */
  static async invalidateL2(cacheKey) {
    try {
      const dynamodb = new DynamoDB.DocumentClient();
      await dynamodb.delete({
        TableName: getTableName('metadata-cache'),
        Key: { cacheKey }
      }).promise();
    } catch (e) {
      console.warn('[Cache] L2 Invalidate failed:', e.message);
    }
  }

  /**
   * Smart Fetch: Try L1, then L2, then fetcher function
   * @param {string} key 
   * @param {Function} fetcher 
   * @param {Object} opts 
   */
  static async smartFetch(key, fetcher, opts = {}) {
    const { 
      l1TtlMs = 30000, 
      l2TtlSec = 3600,
      useL1 = true,
      useL2 = false
    } = opts;

    // 1. Try L1
    if (useL1) {
      const l1Val = this.getL1(key);
      if (l1Val !== null) return l1Val;
    }

    // 2. Try L2
    if (useL2) {
      const l2Val = await this.getL2(key);
      if (l2Val !== null) {
        if (useL1) this.setL1(key, l2Val, l1TtlMs);
        return l2Val;
      }
    }

    // 3. Fetch
    const fresh = await fetcher();
    
    // 4. Store
    if (fresh !== null && fresh !== undefined) {
      if (useL1) this.setL1(key, fresh, l1TtlMs);
      if (useL2) await this.setL2(key, fresh, l2TtlSec);
    }

    return fresh;
  }
}

module.exports = Cache;
