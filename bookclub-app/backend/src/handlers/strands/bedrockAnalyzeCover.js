const AWS = require('aws-sdk');
const { analyzeCoverImage } = require('../../lib/bedrock-analyzer');

const dynamo = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

const BOOKS_TABLE = process.env.SERVICE_NAME ? `${process.env.SERVICE_NAME}-books-${process.env.STAGE}` : `bookclub-app-books-${process.env.STAGE}`;

exports.handler = async (event) => {
  try {
    // Support HTTP, EventBridge detail, and S3 event invocations
    let body = {};
    if (event?.httpMethod) {
      body = JSON.parse(event.body || '{}');
    } else if (event?.detail) {
      body = event.detail;
    } else if (Array.isArray(event?.Records) && event.Records[0]?.s3) {
      const rec = event.Records[0];
      const s3info = rec.s3;
      const bucketName = s3info.bucket?.name;
      const objectKey = decodeURIComponent(s3info.object?.key || '');
      body = { bucket: bucketName, key: objectKey };
    }

    // Accept multiple shapes: { bucket,key } or { s3Bucket,s3Key } or { fileUrl }
    let bucket = body.bucket || body.s3Bucket || process.env.BOOK_COVERS_BUCKET;
    let key = body.key || body.s3Key; // required
    if (!key && body.fileUrl) {
      try {
        const url = new URL(body.fileUrl);
        // host like my-bucket.s3.amazonaws.com
        const host = url.hostname;
        const parsedBucket = host.split('.s3.amazonaws.com')[0];
        const parsedKey = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        bucket = bucket || parsedBucket;
        key = key || parsedKey;
      } catch (_) {}
    }
    const contentType = body.contentType || 'image/jpeg';
    const bookId = body.bookId; // optional but recommended

    if (!bucket || !key) {
      const msg = 'Missing required parameters: bucket and key';
      console.warn('[Strands][BedrockAnalyze] Missing params. Body keys:', Object.keys(body || {}));
      if (event?.httpMethod) {
        return { statusCode: 400, body: JSON.stringify({ error: msg }) };
      }
      throw new Error(msg);
    }

    const metadata = await analyzeCoverImage({ bucket, key, contentType });

    // Persist into Books table if a bookId is provided
    if (bookId) {
      await dynamo.update({
        TableName: BOOKS_TABLE,
        Key: { bookId },
        UpdateExpression: 'SET #meta.#bedrock = :val, updatedAt = :ts',
        ExpressionAttributeNames: { '#meta': 'mcp_metadata', '#bedrock': 'bedrock' },
        ExpressionAttributeValues: { ':val': metadata, ':ts': new Date().toISOString() },
      }).promise();
    }

    // Publish event for downstream enrichment (e.g., Google Books)
    if (process.env.EVENT_BUS_NAME && process.env.EVENT_BUS_SOURCE) {
      await eventBridge.putEvents({
        Entries: [{
          EventBusName: process.env.EVENT_BUS_NAME,
          Source: process.env.EVENT_BUS_SOURCE,
          DetailType: 'Book.StrandsAnalyzedCompleted',
          Detail: JSON.stringify({ bookId, bucket, key, metadata }),
        }],
      }).promise();
    }

    const response = { ok: true, metadata };
    if (event?.httpMethod) {
      return { statusCode: 200, body: JSON.stringify(response) };
    }
    return response;
  } catch (err) {
    console.error('[Strands][BedrockAnalyze] Error', err);
    if (event?.httpMethod) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
    throw err;
  }
};
