const AWS = require('aws-sdk');
const { analyzeCoverImage, analyzeLibraryImage } = require('../../lib/bedrock-analyzer');
const ToyListing = require('../../models/toyListing');

const dynamo = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

const BOOKS_TABLE = process.env.SERVICE_NAME ? `${process.env.SERVICE_NAME}-books-${process.env.STAGE}` : `bookclub-app-books-${process.env.STAGE}`;

exports.handler = async (event) => {
  try {
    if (!Array.isArray(event.Records)) {
      console.warn('[BedrockAnalyzeWorker] No SQS records');
      return { ok: true };
      // Optional fixed pacing between records to reduce steady-state call rate
      const perRecordSleep = parseInt(process.env.BEDROCK_WORKER_SLEEP_MS || '0', 10);
      if (perRecordSleep > 0) {
        await new Promise(r => setTimeout(r, perRecordSleep));
      }
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
      const listingId = payload.listingId;    // library item
      const libraryType = payload.libraryType || 'toy';
      const modelId = payload.modelId;
      const contentType = payload.contentType || 'image/jpeg';

      if (!bucket || !key) {
        console.warn('[BedrockAnalyzeWorker] Missing bucket/key in message');
        continue;
      }

      const baseDelayMs = parseInt(process.env.BEDROCK_PRE_DELAY_MS || '400', 10);
      const jitterMs = Math.floor(Math.random() * (parseInt(process.env.BEDROCK_PRE_DELAY_JITTER_MS || '400', 10)));
      const totalDelay = baseDelayMs + jitterMs;
      if (totalDelay > 0) await new Promise(r => setTimeout(r, totalDelay));

      if (listingId) {
        // ── Library item path ──────────────────────────────────────────────────
        console.log(`[BedrockAnalyzeWorker] Analysing library image for listingId=${listingId} (${libraryType})`);
        try {
          const metadata = await analyzeLibraryImage({ bucket, key, contentType, libraryType, modelId });
          const updates = {
            status: 'pending_review',
          };
          if (metadata.title) updates.title = metadata.title;
          if (metadata.description) updates.description = metadata.description;
          if (metadata.condition) updates.condition = metadata.condition;
          if (metadata.category) updates.category = metadata.category;
          await ToyListing.systemUpdate(listingId, updates);
          console.log(`[BedrockAnalyzeWorker] Patched listing ${listingId}: title=${metadata.title}`);
        } catch (e) {
          console.error(`[BedrockAnalyzeWorker] Failed to analyse/patch listing ${listingId}:`, e.message);
          // Don't rethrow — let the worker continue with other records
          // The listing stays in 'draft' and the frontend timeout will show the manual form
          await ToyListing.systemUpdate(listingId, { status: 'pending_review' }).catch(() => {});
        }
      } else {
        // ── Existing book path (unchanged) ─────────────────────────────────────
        try {
          const metadata = await analyzeCoverImage({ bucket, key, contentType, modelId });

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

          if (bookId) {
            const titleCands = Array.isArray(metadata?.title_candidates)
              ? metadata.title_candidates
                  .map(c => (c && c.value ? String(c.value).trim() : ''))
                  .filter(Boolean)
              : [];
            const guessTitle = typeof metadata?.title_guess === 'string' ? metadata.title_guess.trim() : '';
            if (guessTitle && !titleCands.includes(guessTitle)) titleCands.unshift(guessTitle);
            const combinedTitle = titleCands.length > 1 ? titleCands.slice(0, 2).join(' / ') : (titleCands[0] || '');
            const bestTitle = combinedTitle || undefined;

            const candAuthor = Array.isArray(metadata?.author_candidates) && metadata.author_candidates[0]?.value ? String(metadata.author_candidates[0].value).trim() : '';
            const guessAuthor = Array.isArray(metadata?.authors_guess) && metadata.authors_guess[0] ? String(metadata.authors_guess[0]).trim() : '';
            const bestAuthor = (candAuthor || guessAuthor) || undefined;

            const bestDesc = typeof metadata?.description === 'string' ? metadata.description.trim() : undefined;
            const ageFine = typeof metadata?.ageGroupFine === 'string' && metadata.ageGroupFine ? metadata.ageGroupFine : undefined;
            if (bestTitle || bestAuthor || bestDesc || ageFine) {
              const names = {};
              const vals = { ':ts': new Date().toISOString() };
              const sets = ['updatedAt = :ts'];
              if (bestTitle) { names['#t'] = 'title'; vals[':t'] = bestTitle; sets.unshift('#t = :t'); }
              if (bestAuthor) { names['#a'] = 'author'; vals[':a'] = bestAuthor; sets.unshift('#a = :a'); }
              if (bestDesc) { names['#d'] = 'description'; vals[':d'] = bestDesc; sets.unshift('#d = if_not_exists(#d, :d)'); }
              if (ageFine) { names['#agf'] = 'ageGroupFine'; vals[':agf'] = ageFine; sets.unshift('#agf = if_not_exists(#agf, :agf)'); }
              await dynamo.update({
                TableName: BOOKS_TABLE,
                Key: { bookId },
                UpdateExpression: 'SET ' + sets.join(', '),
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: vals,
              }).promise();
            }
          } // end if bookId

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
          console.warn('[BedrockAnalyzeWorker] Failed to analyze/patch book:', e.message);
        }
      } // end else (book path)
    }

    return { ok: true };
  } catch (err) {
    console.error('[BedrockAnalyzeWorker] Error', err);
    throw err;
  }
};
