const AWS = require('../../lib/aws-config');
const { v4: uuidv4 } = require('uuid');
const response = require('../../lib/response');
const Book = require('../../models/book');
const { getTableName } = require('../../lib/table-names');
const { withAuth } = require('../../lib/middleware');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BOOK_COVERS_BUCKET;

// Store bookId → s3Key mapping so processUpload can find the draft book
async function storeBookMapping(bucket, key, bookId, userId) {
  try {
    const dynamo = new AWS.DynamoDB.DocumentClient();
    const cacheKey = `bookForS3:${bucket}:${key}`;
    const ttl = Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000); // 7 days
    await dynamo.put({
      TableName: getTableName('metadata-cache'),
      Item: { cacheKey, bookId, userId, s3Bucket: bucket, s3Key: key, mappedAt: new Date().toISOString(), ttl },
      ConditionExpression: 'attribute_not_exists(cacheKey)',
    }).promise().catch(() => {}); // ignore duplicate
  } catch (e) {
    console.warn('[multipartStart] storeBookMapping failed:', e.message);
  }
}

const handler = async (event) => {
  try {
    const { userId } = event;
    const { fileType, fileName, context = 'book', libraryType = 'book' } = JSON.parse(event.body || '{}');

    if (!fileType) {
      return response.validationError({ fileType: 'File type is required' });
    }

    const validFileTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif', 'image/tiff', 'image/bmp',
    ];
    if (!validFileTypes.includes(fileType)) {
      console.warn(`[multipartStart] Rejected fileType=${fileType}`);
      return response.validationError({ fileType: 'Invalid file type.' });
    }

    const ext = fileType.split('/')[1] || 'jpg';
    const fileId = uuidv4();
    
    // Key format: library-images/{libraryType}/{userId}/{uuid}.ext
    const isLibrary = context === 'library';
    const key = isLibrary
      ? `library-images/${libraryType}/${userId}/${fileId}.${ext}`
      : `book-covers/${userId}/${fileId}.${ext}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      Metadata: { 'uploaded-by': userId },
    };

    const { UploadId } = await s3.createMultipartUpload(params).promise();

    // For library uploads: pre-create a draft book
    let bookId = null;
    if (isLibrary) {
      const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
      const draft = await Book.create({
        title: 'Processing…',
        description: '',
        status: 'draft',
        coverImage: fileUrl,
        category: libraryType,
        s3Bucket: BUCKET_NAME,
        s3Key: key,
      }, userId);
      bookId = draft.bookId;
      await storeBookMapping(BUCKET_NAME, key, bookId, userId);
    }

    return response.success({
      bucket: BUCKET_NAME,
      key,
      uploadId: UploadId,
      userId,
      bookId,
      listingId: bookId // for backward compatibility
    });
  } catch (err) {
    console.error('[multipartStart] error', err);
    return response.error(err);
  }
};

module.exports.handler = withAuth(handler);
