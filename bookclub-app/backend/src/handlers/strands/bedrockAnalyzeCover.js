const AWS = require('aws-sdk');
const { analyzeCoverImage } = require('../../lib/bedrock-analyzer');

const dynamo = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

const BOOKS_TABLE = process.env.SERVICE_NAME ? `${process.env.SERVICE_NAME}-books-${process.env.STAGE}` : `bookclub-app-books-${process.env.STAGE}`;

exports.handler = async (event) => {
  try {
    // Support HTTP, EventBridge detail, and S3 event invocations
    console.log('[Strands][BedrockAnalyze] Incoming event keys:', Object.keys(event || {}));
    let body = {};
    if (event?.httpMethod) {
      console.log('[Strands][BedrockAnalyze] Invocation type: API Gateway (HTTP)');
      body = JSON.parse(event.body || '{}');
    } else if (event?.detail) {
      console.log('[Strands][BedrockAnalyze] Invocation type: EventBridge');
      body = event.detail;
    } else if (Array.isArray(event?.Records) && event.Records[0]?.s3) {
      console.log('[Strands][BedrockAnalyze] Invocation type: S3 Event');
      const rec = event.Records[0];
      const s3info = rec.s3;
      const bucketName = s3info.bucket?.name;
      const objectKey = decodeURIComponent(s3info.object?.key || '');
      body = { bucket: bucketName, key: objectKey };
    }
    // Fallback: direct Lambda invoke with top-level fields
    if ((!body || Object.keys(body).length === 0) && (event?.bucket || event?.key || event?.s3Bucket || event?.s3Key)) {
      console.log('[Strands][BedrockAnalyze] Invocation type: Direct Lambda (top-level payload)');
      body = {
        bucket: event.bucket || event.s3Bucket,
        key: event.key || event.s3Key,
        bookId: event.bookId,
        contentType: event.contentType,
      };
    }

    // Accept multiple shapes: { bucket,key } or { s3Bucket,s3Key } or { fileUrl }
    console.log('[Strands][BedrockAnalyze] Body keys after source parse:', Object.keys(body || {}));
    let bucket = body.bucket || body.s3Bucket || event.bucket || event.s3Bucket || process.env.BOOK_COVERS_BUCKET;
    let key = body.key || body.s3Key || event.key || event.s3Key; // required
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
    console.log('[Strands][BedrockAnalyze] Derived params:', {
      hasBucket: !!bucket,
      hasKey: !!key,
      contentType,
      hasBookId: !!bookId,
    });

    if (!bucket || !key) {
      const msg = 'Missing required parameters: bucket and key';
      console.warn('[Strands][BedrockAnalyze] Missing params. Body keys:', Object.keys(body || {}));
      console.warn('[Strands][BedrockAnalyze] Env fallback BOOK_COVERS_BUCKET present:', !!process.env.BOOK_COVERS_BUCKET);
      if (event?.httpMethod) {
        return { statusCode: 400, body: JSON.stringify({ error: msg }) };
      }
      throw new Error(msg);
    }

    console.log('[Strands][BedrockAnalyze] Analyzing image at s3://'+bucket+'/'+key);
    const metadata = await analyzeCoverImage({ bucket, key, contentType });
    console.log('[Strands][BedrockAnalyze] Analysis complete. Keys:', Object.keys(metadata || {}));

    // Persist into Books table if a bookId is provided
    if (bookId) {
      // Step 1: ensure the parent map exists (no-op if already present)
      await dynamo.update({
        TableName: BOOKS_TABLE,
        Key: { bookId },
        UpdateExpression: 'SET #meta = if_not_exists(#meta, :empty)',
        ExpressionAttributeNames: { '#meta': 'mcp_metadata' },
        ExpressionAttributeValues: { ':empty': {} },
      }).promise();

      // Step 2: set the nested field
      await dynamo.update({
        TableName: BOOKS_TABLE,
        Key: { bookId },
        UpdateExpression: 'SET #meta.#bedrock = :val, updatedAt = :ts',
        ExpressionAttributeNames: { '#meta': 'mcp_metadata', '#bedrock': 'bedrock' },
        ExpressionAttributeValues: { ':val': metadata, ':ts': new Date().toISOString() },
      }).promise();

      // Step 3: update top-level title/author/description if missing
      try {
        const bestTitle = Array.isArray(metadata?.title_candidates) && metadata.title_candidates[0]?.value ? String(metadata.title_candidates[0].value).trim() : undefined;
        const bestAuthor = Array.isArray(metadata?.author_candidates) && metadata.author_candidates[0]?.value ? String(metadata.author_candidates[0].value).trim() : undefined;
        const bestDesc = typeof metadata?.description === 'string' ? metadata.description.trim() : undefined;
        if (bestTitle || bestAuthor || bestDesc) {
          const names = { '#t': 'title', '#a': 'author', '#d': 'description' };
          const vals = { ':ts': new Date().toISOString() };
          const sets = ['updatedAt = :ts'];
          if (bestTitle) { names['#t'] = 'title'; vals[':t'] = bestTitle; sets.unshift('#t = if_not_exists(#t, :t)'); }
          if (bestAuthor) { names['#a'] = 'author'; vals[':a'] = bestAuthor; sets.unshift('#a = if_not_exists(#a, :a)'); }
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
        console.warn('[Strands][BedrockAnalyze] Failed to set top-level fields from Bedrock:', e.message);
      }
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
