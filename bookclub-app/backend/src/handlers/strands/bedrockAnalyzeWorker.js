const AWS = require('aws-sdk');
const { analyzeCoverImage } = require('../../lib/bedrock-analyzer');

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
      const bookId = payload.bookId;
      const contentType = payload.contentType || 'image/jpeg';

      if (!bucket || !key) {
        console.warn('[BedrockAnalyzeWorker] Missing bucket/key in message');
        continue;
      }

      // Optional small delay to smooth bursts (same as API handler)
      const baseDelayMs = parseInt(process.env.BEDROCK_PRE_DELAY_MS || '400', 10);
      const jitterMs = Math.floor(Math.random() * (parseInt(process.env.BEDROCK_PRE_DELAY_JITTER_MS || '400', 10)));
      const totalDelay = baseDelayMs + jitterMs;
      if (totalDelay > 0) {
        await new Promise(r => setTimeout(r, totalDelay));
      }

      const metadata = await analyzeCoverImage({ bucket, key, contentType });

      if (bookId) {
        // Upsert mcp_metadata.bedrock and overwrite title/author as in API handler
        await dynamo.update({
          TableName: BOOKS_TABLE,
          Key: { bookId },
          UpdateExpression: 'SET #meta = if_not_exists(#meta, :empty)',
          ExpressionAttributeNames: { '#meta': 'mcp_metadata' },
          ExpressionAttributeValues: { ':empty': {} },
        }).promise();

        await dynamo.update({
          TableName: BOOKS_TABLE,
          Key: { bookId },
          UpdateExpression: 'SET #meta.#bedrock = :val, updatedAt = :ts',
          ExpressionAttributeNames: { '#meta': 'mcp_metadata', '#bedrock': 'bedrock' },
          ExpressionAttributeValues: { ':val': metadata, ':ts': new Date().toISOString() },
        }).promise();

        try {
          const bestTitle = Array.isArray(metadata?.title_candidates) && metadata.title_candidates[0]?.value ? String(metadata.title_candidates[0].value).trim() : undefined;
          const bestAuthor = Array.isArray(metadata?.author_candidates) && metadata.author_candidates[0]?.value ? String(metadata.author_candidates[0].value).trim() : undefined;
          const bestDesc = typeof metadata?.description === 'string' ? metadata.description.trim() : undefined;
          if (bestTitle || bestAuthor || bestDesc) {
            const names = { '#t': 'title', '#a': 'author' };
            const vals = { ':ts': new Date().toISOString() };
            const sets = ['updatedAt = :ts'];
            if (bestTitle) { names['#t'] = 'title'; vals[':t'] = bestTitle; sets.unshift('#t = :t'); }
            if (bestAuthor) { names['#a'] = 'author'; vals[':a'] = bestAuthor; sets.unshift('#a = :a'); }
            if (bestDesc) { names['#d'] = 'description'; vals[':d'] = bestDesc; sets.unshift('#d = if_not_exists(#d, :d)'); }
            await dynamo.update({
              TableName: BOOKS_TABLE,
              Key: { bookId },
              UpdateExpression: 'SET ' + sets.join(', '),
              ExpressionAttributeNames: names,
              ExpressionAttributeValues: vals,
            }).promise();
          }
        } catch (e) {
          console.warn('[BedrockAnalyzeWorker] Failed to set top-level fields from Bedrock:', e.message);
        }
      }

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
    }

    return { ok: true };
  } catch (err) {
    console.error('[BedrockAnalyzeWorker] Error', err);
    throw err;
  }
};
