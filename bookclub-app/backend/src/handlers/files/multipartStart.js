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

    // Accept any image/* type; strip MIME parameters (e.g. image/jpeg;charset=utf-8)
    const baseFileType = fileType.split(';')[0].trim().toLowerCase();
    if (!baseFileType.startsWith('image/')) {
      // eslint-disable-next-line no-console
      console.warn(`[multipartStart] Rejected fileType=${fileType}`);
      return response.validationError({ fileType: 'Only image file types are allowed.' });
    }

    const ext = baseFileType.split('/')[1] || 'jpg';
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
      userId,
    });
  } catch (err) {
    console.error('[multipartStart] error', err);
    return response.error(err);
  }
};
