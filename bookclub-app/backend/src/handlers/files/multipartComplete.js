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
    const { key, uploadId, parts } = JSON.parse(event.body || '{}');

    if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      return response.validationError({ message: 'key, uploadId and parts[] are required' });
    }
    if (!key.startsWith(`book-covers/${userId}/`)) {
      return response.forbidden('Invalid key for user');
    }

    // Parts should be array of { ETag, PartNumber }
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .slice()
          .sort((a, b) => a.PartNumber - b.PartNumber)
          .map((p) => ({ ETag: p.ETag, PartNumber: Number(p.PartNumber) })),
      },
    };

    const result = await s3.completeMultipartUpload(params).promise();
    return response.success({
      location: result.Location,
      bucket: result.Bucket,
      key: result.Key,
      etag: result.ETag,
      fileUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`,
    });
  } catch (err) {
    console.error('[multipartComplete] error', err);
    return response.error(err);
  }
};
