const AWS = require('../../lib/aws-config');
const { v4: uuidv4 } = require('uuid');
const response = require('../../lib/response');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BOOK_COVERS_BUCKET;

module.exports.handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      return response.unauthorized('Missing user context');
    }
    const { fileType, fileName } = JSON.parse(event.body || '{}');

    if (!fileType) {
      return response.validationError({ fileType: 'File type is required' });
    }

    const validFileTypes = [
      'image/jpeg',
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
      console.warn(`[multipartStart] Rejected fileType=${fileType}`);
      return response.validationError({ fileType: 'Invalid file type. Allowed: JPEG, PNG, GIF, WEBP, HEIC/HEIF, TIFF, BMP.' });
    }

    const ext = fileType.split('/')[1] || 'jpg';
    const key = `book-covers/${userId}/${uuidv4()}.${ext}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      Metadata: { 'uploaded-by': userId },
    };

    const { UploadId } = await s3.createMultipartUpload(params).promise();

    return response.success({
      bucket: BUCKET_NAME,
      key,
      uploadId: UploadId,
    });
  } catch (err) {
    console.error('[multipartStart] error', err);
    return response.error(err);
  }
};
