const AWS = require('../../lib/aws-config');
const { v4: uuidv4 } = require('uuid');
const response = require('../../lib/response');
const ToyListing = require('../../models/toyListing');
const User = require('../../models/user');
const { getTableName } = require('../../lib/table-names');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BOOK_COVERS_BUCKET;

// Store listingId → s3Key mapping so processUpload can find the draft listing
async function storeListingMapping(bucket, key, listingId, userId) {
  try {
    const dynamo = new AWS.DynamoDB.DocumentClient();
    const cacheKey = `listingForS3:${bucket}:${key}`;
    const ttl = Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000); // 7 days
    await dynamo.put({
      TableName: getTableName('metadata-cache'),
      Item: { cacheKey, listingId, userId, s3Bucket: bucket, s3Key: key, mappedAt: new Date().toISOString(), ttl },
      ConditionExpression: 'attribute_not_exists(cacheKey)',
    }).promise().catch(() => {}); // ignore duplicate
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[generateUploadUrl] storeListingMapping failed:', e.message);
  }
}

module.exports.handler = async (event) => {
  try {
    let userId = event?.requestContext?.authorizer?.claims?.sub
      || event?.requestContext?.authorizer?.claims?.['cognito:username'];

    if (!userId) {
      const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader || null;
      if (!token) return response.unauthorized('Missing Authorization header');
      const currentUser = await User.getCurrentUser(token);
      if (!currentUser) return response.unauthorized('Invalid or expired token');
      userId = currentUser.userId;
    }

    const { fileType, fileName, context = 'book', libraryType = 'toy' } = JSON.parse(event.body || '{}');

    if (!fileType) {
      return response.validationError({ fileType: 'File type is required' });
    }

    const validFileTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/tiff',
      'image/bmp',
    ];
    if (!validFileTypes.includes(fileType)) {
      // eslint-disable-next-line no-console
      console.warn(`[generateUploadUrl] Rejected fileType=${fileType}`);
      return response.validationError({
        fileType: 'Invalid file type. Allowed: JPEG, PNG, GIF, WEBP, HEIC/HEIF, TIFF, BMP.',
      });
    }

    const fileExtension = fileType.split('/')[1];
    const fileId = uuidv4();

    // Key format: library-images/{libraryType}/{userId}/{uuid}.ext  (encodes both for processUpload)
    const isLibrary = context === 'library';
    const fileKey = isLibrary
      ? `library-images/${libraryType}/${userId}/${fileId}.${fileExtension}`
      : `book-covers/${userId}/${fileId}.${fileExtension}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Expires: 3600, // 1 hour for slow mobile uploads
      ContentType: fileType,
      Metadata: { 'uploaded-by': userId },
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;

    // For library uploads: pre-create a draft listing so frontend can poll it immediately
    let listingId = null;
    if (isLibrary) {
      const draft = await ToyListing.create({
        title: 'Processing…',
        description: '',
        condition: 'good',
        status: 'draft',
        images: [fileUrl],
        libraryType,
        userName: null,
      }, userId);
      listingId = draft.listingId;
      await storeListingMapping(BUCKET_NAME, fileKey, listingId, userId);
    }

    return response.success({ uploadUrl, fileUrl, fileKey, listingId, userId });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error generating upload URL:', error);
    return response.error(error);
  }
};
