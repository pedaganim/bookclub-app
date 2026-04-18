const AWS = require('aws-sdk');
const { analyzeUniversalItemImage } = require('../../lib/bedrock-analyzer');
const Book = require('../../models/book');

const dynamo = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

const BOOKS_TABLE = process.env.SERVICE_NAME ? `${process.env.SERVICE_NAME}-books-${process.env.STAGE}` : `bookclub-app-books-${process.env.STAGE}`;

exports.handler = async (event) => {
  try {
    if (!Array.isArray(event.Records)) {
      console.warn('[BedrockAnalyzeWorker] No SQS records');
      return { ok: true };
    }

    for (const record of event.Records) {
      let payload;
      try {
        payload = JSON.parse(record.body || '{}');
      } catch (_) {
        console.warn('[BedrockAnalyzeWorker] Invalid JSON body');
        continue;
      }

      const bucket = payload.bucket || payload.s3Bucket;
      const key = payload.key || payload.s3Key;
      const bookId = payload.bookId || payload.listingId; // Universal ID support
      const modelId = payload.modelId;
      const contentType = payload.contentType || 'image/jpeg';

      if (!bucket || !key || !bookId) {
        console.warn('[BedrockAnalyzeWorker] Missing required fields in message (bucket/key/id)');
        continue;
      }

      // Add small delay to avoid overwhelming Bedrock
      const baseDelayMs = parseInt(process.env.BEDROCK_PRE_DELAY_MS || '400', 10);
      const jitterMs = Math.floor(Math.random() * (parseInt(process.env.BEDROCK_PRE_DELAY_JITTER_MS || '400', 10)));
      await new Promise(r => setTimeout(r, baseDelayMs + jitterMs));

      console.log(`[BedrockAnalyzeWorker] Analyzing item image for id=${bookId}`);
      
      try {
        const metadata = await analyzeUniversalItemImage({ bucket, key, contentType, modelId });
        
        // Prepare updates for the books table
        const names = { '#meta': 'advancedMetadata' };
        const vals = { ':val': metadata, ':ts': new Date().toISOString() };
        const sets = ['#meta = :val', 'updatedAt = :ts'];

        if (metadata.title) {
          names['#t'] = 'title';
          vals[':t'] = metadata.title;
          sets.push('#t = :t');
        }
        if (metadata.author) {
          names['#a'] = 'author';
          vals[':a'] = metadata.author;
          sets.push('#a = :a');
        }
        if (metadata.description) {
          names['#d'] = 'description';
          vals[':d'] = metadata.description;
          sets.push('#d = if_not_exists(#d, :d)');
        }
        if (metadata.category) {
          names['#c'] = 'category';
          vals[':c'] = metadata.category;
          sets.push('#c = :c');
        }
        if (metadata.ageRange) {
          names['#ar'] = 'ageRange';
          vals[':ar'] = metadata.ageRange;
          sets.push('#ar = :ar');
        }

        await dynamo.update({
          TableName: BOOKS_TABLE,
          Key: { bookId },
          UpdateExpression: 'SET ' + sets.join(', '),
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: vals,
        }).promise();

        console.log(`[BedrockAnalyzeWorker] Successfully analyzed and updated item ${bookId} (Category: ${metadata.category})`);

        // Notify downstream systems
        if (process.env.EVENT_BUS_NAME && process.env.EVENT_BUS_SOURCE) {
          await eventBridge.putEvents({
            Entries: [{
              EventBusName: process.env.EVENT_BUS_NAME,
              Source: process.env.EVENT_BUS_SOURCE,
              DetailType: 'Book.StrandsAnalyzedCompleted',
              Detail: JSON.stringify({ bookId, bucket, key, metadata, modelId }),
            }],
          }).promise();
        }
      } catch (e) {
        console.warn(`[BedrockAnalyzeWorker] Failed to analyze item ${bookId}:`, e.message);
      }
    }

    return { ok: true };
  } catch (err) {
    console.error('[BedrockAnalyzeWorker] Fatal Error:', err);
    throw err;
  }
};

