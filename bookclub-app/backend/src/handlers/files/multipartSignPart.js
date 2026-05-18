const AWS = require('../../lib/aws-config');
const response = require('../../lib/response');
const { withAuth } = require('../../lib/middleware');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BOOK_COVERS_BUCKET;

const handler = async (event) => {
  try {
    const { userId } = event;
    const { key, uploadId, partNumber, contentType } = JSON.parse(event.body || '{}');

    if (!key || !uploadId || !partNumber) {
      return response.validationError({ message: 'key, uploadId and partNumber are required' });
    }

    // Validation check: key must belong to user
    const isOwner = key.includes(`/${userId}/`);
    if (!isOwner) {
      return response.forbidden('Invalid key for user');
    }

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: Number(partNumber),
      Expires: 3600, // 1 hour for slow mobile uploads
    };

    // getSignedUrl for uploadPart
    const url = await s3.getSignedUrlPromise('uploadPart', params);
    return response.success({ uploadUrl: url });
  } catch (err) {
    console.error('[multipartSignPart] error', err);
    return response.error(err);
  }
};

module.exports.handler = withAuth(handler);
