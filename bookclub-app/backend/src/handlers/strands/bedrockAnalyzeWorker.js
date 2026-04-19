const AWS = require('aws-sdk');
const { analyzeUniversalItemImage } = require('../../lib/bedrock-analyzer');
const { getTableName } = require('../../lib/table-names');

const dynamo = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

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
      // listingId means it's a library item (toy-listings table); bookId means it's a book
      const isLibraryItem = !!payload.listingId;
      const itemId = payload.listingId || payload.bookId;
      const modelId = payload.modelId;
      const contentType = payload.contentType || 'image/jpeg';

      if (!bucket || !key || !itemId) {
        console.warn('[BedrockAnalyzeWorker] Missing required fields in message (bucket/key/id)');
        continue;
      }

      // Route to the correct DynamoDB table and primary key
      const tableName = isLibraryItem ? getTableName('toy-listings') : getTableName('books');
      const tableKey = isLibraryItem ? { listingId: itemId } : { bookId: itemId };

      // Add small delay to avoid overwhelming Bedrock
      const baseDelayMs = parseInt(process.env.BEDROCK_PRE_DELAY_MS || '400', 10);
      const jitterMs = Math.floor(Math.random() * (parseInt(process.env.BEDROCK_PRE_DELAY_JITTER_MS || '400', 10)));
      await new Promise(r => setTimeout(r, baseDelayMs + jitterMs));

      console.log(`[BedrockAnalyzeWorker] Analyzing item image for id=${itemId} table=${tableName}`);
      
      try {
        const metadata = await analyzeUniversalItemImage({ bucket, key, contentType, modelId });
        
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

        // For library items Bedrock couldn't classify, route them to the misc library
        if (isLibraryItem && metadata.category === 'other') {
          names['#lt'] = 'libraryType';
          vals[':lt'] = 'misc';
          sets.push('#lt = :lt');
          console.log(`[BedrockAnalyzeWorker] Unrecognized library item ${itemId} → routing to misc library`);
        }

        await dynamo.update({
          TableName: tableName,
          Key: tableKey,
          UpdateExpression: 'SET ' + sets.join(', '),
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: vals,
        }).promise();

        console.log(`[BedrockAnalyzeWorker] Successfully analyzed and updated item ${itemId} (Category: ${metadata.category})`);

        // Notify downstream systems
        const eventDetail = isLibraryItem
          ? { listingId: itemId, bucket, key, metadata, modelId }
          : { bookId: itemId, bucket, key, metadata, modelId };

        if (process.env.EVENT_BUS_NAME && process.env.EVENT_BUS_SOURCE) {
          await eventBridge.putEvents({
            Entries: [{
              EventBusName: process.env.EVENT_BUS_NAME,
              Source: process.env.EVENT_BUS_SOURCE,
              DetailType: isLibraryItem ? 'Library.StrandsAnalyzedCompleted' : 'Book.StrandsAnalyzedCompleted',
              Detail: JSON.stringify(eventDetail),
            }],
          }).promise();
        }
      } catch (e) {
        console.warn(`[BedrockAnalyzeWorker] Failed to analyze item ${itemId}:`, e.message);
      }
    }

    return { ok: true };
  } catch (err) {
    console.error('[BedrockAnalyzeWorker] Fatal Error:', err);
    throw err;
  }
};

