const AWS = require('../../lib/aws-config');
const { v4: uuidv4 } = require('uuid');
const response = require('../../lib/response');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BOOK_COVERS_BUCKET;

module.exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const { fileType, fileName, fileSize } = JSON.parse(event.body);

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

    // Validate file size (max 10MB for cost optimization)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return response.validationError({
        fileSize: 'File size must be less than 10MB. Please compress your image before uploading.',
      });
    }

    // Generate a unique file key
    const fileExtension = fileType.split('/')[1];
    const fileKey = `book-covers/${userId}/${uuidv4()}.${fileExtension}`;

    // Generate pre-signed URL with size constraint
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Expires: 300, // 5 minutes
      ContentType: fileType,
      Conditions: [
        ['content-length-range', 0, MAX_FILE_SIZE] // Enforce size limit
      ],
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
      maxFileSize: MAX_FILE_SIZE,
      recommendations: {
        optimalSize: '< 2MB for best performance',
        acceptedFormats: validFileTypes
      }
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return response.error(error);
  }
};
