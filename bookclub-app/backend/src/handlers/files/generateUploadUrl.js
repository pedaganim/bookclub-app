const AWS = require('../../lib/aws-config');
const { v4: uuidv4 } = require('uuid');
const response = require('../../lib/response');

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BOOK_COVERS_BUCKET;
const MAX_IMAGES_PER_BOOK = 25; // Cost control: limit to 25 images per book

module.exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const requestBody = JSON.parse(event.body);
    
    // Support both single file upload (backward compatibility) and multiple file upload
    const isBulkUpload = Array.isArray(requestBody.files);
    const files = isBulkUpload ? requestBody.files : [{ fileType: requestBody.fileType, fileName: requestBody.fileName }];

    if (files.length === 0) {
      return response.validationError({
        files: 'At least one file is required',
      });
    }

    if (files.length > MAX_IMAGES_PER_BOOK) {
      return response.validationError({
        files: `Maximum ${MAX_IMAGES_PER_BOOK} images allowed per book for cost efficiency`,
      });
    }

    // Validate file types (only allow images)
    const validFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    const uploadResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.fileType) {
        return response.validationError({
          [`files[${i}].fileType`]: 'File type is required',
        });
      }

      if (!validFileTypes.includes(file.fileType)) {
        return response.validationError({
          [`files[${i}].fileType`]: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.',
        });
      }

      // Generate a unique file key with timestamp for better organization
      const fileExtension = file.fileType.split('/')[1];
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const fileKey = `book-images/${userId}/${timestamp}/${uuidv4()}.${fileExtension}`;

      // Generate pre-signed URL with metadata for cost tracking
      const params = {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Expires: 300, // 5 minutes
        ContentType: file.fileType,
        Metadata: {
          'uploaded-by': userId,
          'upload-type': 'book-image',
          'batch-upload': isBulkUpload.toString(),
          'file-index': i.toString(),
        },
        // Add server-side encryption for security
        ServerSideEncryption: 'AES256',
      };

      const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
      const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;

      uploadResults.push({
        uploadUrl,
        fileUrl,
        fileKey,
        fileName: file.fileName || `image-${i + 1}`,
        fileType: file.fileType,
      });
    }

    // Return appropriate response format based on request type
    if (isBulkUpload) {
      return response.success({
        uploads: uploadResults,
        totalUploads: uploadResults.length,
        maxImagesPerBook: MAX_IMAGES_PER_BOOK,
      });
    } else {
      // Backward compatibility: return single upload result
      return response.success(uploadResults[0]);
    }
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return response.error(error);
  }
};
