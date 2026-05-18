const AWS = require('aws-sdk');
const BookService = require('../../services/book-service');
const logger = require('../../lib/logger');
const config = require('../../lib/config');

/**
 * S3 ObjectCreated handler for book covers and library item images.
 */
module.exports.handler = async (event) => {
  logger.info({ recordCount: event.Records.length }, '[ImageProcessor] Processing S3 event');

  for (const record of event.Records) {
    if (record?.eventSource !== 'aws:s3') continue;

    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const fileUrl = `https://${bucket}.s3.amazonaws.com/${key}`;

    logger.info({ bucket, key }, '[ImageProcessor] Processing image');

    if (!key.startsWith('book-covers/') && !key.startsWith('library-images/')) {
      logger.debug({ key }, '[ImageProcessor] Skipping unrecognised key prefix');
      continue;
    }

    try {
      const parts = key.split('/');
      const isLibrary = key.startsWith('library-images/');
      const libraryType = isLibrary ? parts[1] : 'book';
      const userId = isLibrary ? parts[2] : parts[1];

      if (!userId) {
        logger.warn({ key }, '[ImageProcessor] Could not extract userId from key');
        continue;
      }

      // 1. Create or retrieve draft book/item
      const item = await BookService.create({
        title: isLibrary ? 'Processing…' : deriveTitleFromKey(key),
        description: isLibrary ? '' : 'Book uploaded via image - metadata processing in progress',
        status: isLibrary ? 'draft' : 'available',
        coverImage: fileUrl,
        category: libraryType,
        s3Bucket: bucket,
        s3Key: key,
        extractFromImage: false, // Bedrock will do this asynchronously
        metadataSource: isLibrary ? undefined : 'image-upload-pending'
      }, userId);

      // 2. Enqueue for Bedrock Analysis
      const queueUrl = config.BEDROCK_ANALYZE_QUEUE_URL;
      if (queueUrl) {
        await enqueueBedrockAnalyze({ 
          bucket, 
          key, 
          bookId: item.bookId, 
          libraryType, 
          queueUrl 
        });
      } else {
        logger.warn('[ImageProcessor] BEDROCK_ANALYZE_QUEUE_URL not set');
      }

    } catch (err) {
      logger.error({ err, key }, '[ImageProcessor] Error processing image');
    }
  }

  return { statusCode: 200, body: 'OK' };
};

function deriveTitleFromKey(key) {
  const parts = key.split('/');
  const filename = parts[parts.length - 1];
  return filename.replace(/\.[^/.]+$/, '')
    .replace(/[_\-\.]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim() || 'Uploaded Item';
}

async function enqueueBedrockAnalyze({ bucket, key, bookId, libraryType, queueUrl }) {
  const sqs = new AWS.SQS();
  const payload = { 
    bucket, 
    key, 
    bookId, 
    listingId: bookId, 
    libraryType, 
    contentType: 'image/jpeg' 
  };
  
  await sqs.sendMessage({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(payload),
  }).promise();
  
  logger.info({ bookId, key }, '[ImageProcessor] Enqueued Bedrock analyze message');
}

