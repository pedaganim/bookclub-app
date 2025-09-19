const AWS = require('aws-sdk');
const { analyzeCoverImage } = require('../../lib/bedrock-analyzer');

const dynamo = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

const BOOKS_TABLE = process.env.SERVICE_NAME ? `${process.env.SERVICE_NAME}-books-${process.env.STAGE}` : `bookclub-app-books-${process.env.STAGE}`;

exports.handler = async (event) => {
  try {
    // Support both HTTP and EventBridge invocations
    let body = {};
    if (event?.httpMethod) {
      body = JSON.parse(event.body || '{}');
    } else if (event?.detail) {
      body = event.detail;
    }

    const bucket = body.bucket || process.env.BOOK_COVERS_BUCKET;
    const key = body.key; // required
    const contentType = body.contentType || 'image/jpeg';
    const bookId = body.bookId; // optional but recommended

    if (!bucket || !key) {
      const msg = 'Missing required parameters: bucket and key';
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
