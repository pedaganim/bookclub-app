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
      const libraryType = payload.libraryType || null;
      // Library types whose category must never be overwritten by AI analysis
      const PINNED_CATEGORY_TYPES = ['lost_found'];
      const isCategoryPinned = isLibraryItem && PINNED_CATEGORY_TYPES.includes(libraryType);
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

        if (metadata.category === 'person_error') {
          console.warn(`[BedrockAnalyzeWorker] PERSON DETECTED for item ${itemId}. Deleting from DB and S3.`);
          
          // 1. Delete from DynamoDB
          await dynamo.delete({
            TableName: tableName,
            Key: tableKey,
          }).promise();

          // 2. Delete from S3
          const s3 = new AWS.S3();
          await s3.deleteObject({
            Bucket: bucket,
            Key: key,
          }).promise();

          console.log(`[BedrockAnalyzeWorker] Successfully purged personal image item ${itemId}`);
          
          // Notify downstream of the deletion/violation
          if (process.env.EVENT_BUS_NAME && process.env.EVENT_BUS_SOURCE) {
            await eventBridge.putEvents({
              Entries: [{
                EventBusName: process.env.EVENT_BUS_NAME,
                Source: process.env.EVENT_BUS_SOURCE,
                DetailType: isLibraryItem ? 'Library.ItemPurgedPrivacyViolation' : 'Book.ItemPurgedPrivacyViolation',
                Detail: JSON.stringify({ itemId, bucket, key, reason: 'person_detected' }),
              }],
            }).promise();
          }
          continue; // Move to next record
        }

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
          sets.push('#d = :d'); // always write — items are created with description='' which blocks if_not_exists
        }
        if (isCategoryPinned) {
          // Keep category pinned to the libraryType — do not let AI overwrite it
          names['#c'] = 'category';
          vals[':c'] = libraryType;
          sets.push('#c = :c');
        } else if (metadata.category) {
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

