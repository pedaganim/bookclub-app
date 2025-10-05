const AWS = require('../../lib/aws-config');
const response = require('../../lib/response');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BOOK_COVERS_BUCKET;

module.exports.handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      return response.unauthorized('Missing user context');
    }
    const { key, uploadId, partNumber, contentType } = JSON.parse(event.body || '{}');

    if (!key || !uploadId || !partNumber) {
      return response.validationError({ message: 'key, uploadId and partNumber are required' });
    }
    if (!key.startsWith(`book-covers/${userId}/`)) {
      return response.forbidden('Invalid key for user');
    }

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: Number(partNumber),
      Expires: 900, // 15 minutes
      ContentType: contentType || undefined,
    };

    // getSignedUrl for uploadPart
    const url = await s3.getSignedUrlPromise('uploadPart', params);
    return response.success({ uploadUrl: url });
  } catch (err) {
    console.error('[multipartSignPart] error', err);
    return response.error(err);
  }
};
