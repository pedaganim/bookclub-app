/**
 * AWS Lambda handler for generating pre-signed S3 upload URLs
 * Creates secure URLs for uploading book cover images to S3
 */
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const response = require('../../lib/response');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BOOK_COVERS_BUCKET;

/**
 * Lambda handler function for generating file upload URLs
 * @param {Object} event - AWS Lambda event object containing HTTP request data
 * @param {Object} event.requestContext.authorizer.claims - JWT claims containing user info
 * @param {string} event.requestContext.authorizer.claims.sub - User ID from JWT token
 * @param {Object} event.body - JSON string containing upload request data
 * @param {string} event.body.fileType - MIME type of file to upload (required)
 * @param {string} event.body.fileName - Optional custom filename
 * @returns {Promise<Object>} HTTP response with pre-signed URL and file metadata
 */
module.exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const { fileType, fileName } = JSON.parse(event.body);

    if (!fileType) {
      return response.validationError({
        fileType: 'File type is required',
      });
    }

    // Validate file type (only allow images)
    const validFileTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validFileTypes.includes(fileType)) {
      return response.validationError({
        fileType: 'Invalid file type. Only JPEG, PNG, and GIF are allowed.',
      });
    }

    // Generate a unique file key
    const fileExtension = fileType.split('/')[1];
    const fileKey = `book-covers/${userId}/${uuidv4()}.${fileExtension}`;

    // Generate pre-signed URL
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Expires: 300, // 5 minutes
      ContentType: fileType,
      Metadata: {
        'uploaded-by': userId,
      },
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;

    return response.success({
      uploadUrl,
      fileUrl,
      fileKey,
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return response.error(error);
  }
};
