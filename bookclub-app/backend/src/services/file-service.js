const AWS = require('../lib/aws-config');
const { v4: uuidv4 } = require('uuid');
const config = require('../lib/config');
const logger = require('../lib/logger');
const BookService = require('./book-service');

const s3 = new AWS.S3();
const BUCKET_NAME = config.BOOK_COVERS_BUCKET;

class FileService {
  /**
   * Generates a signed S3 upload URL.
   * @param {Object} params - { fileType, userId, context, libraryType }
   * @returns {Promise<Object>} The upload metadata.
   */
  static async generateUploadUrl({ fileType, userId, context = 'book', libraryType = 'book' }) {
    logger.info({ userId, context, libraryType }, 'Generating upload URL');

    const validFileTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif', 'image/tiff', 'image/bmp',
    ];
    if (!validFileTypes.includes(fileType)) {
      throw new Error('VALIDATION_ERROR:Invalid file type. Allowed: JPEG, PNG, GIF, WEBP, HEIC/HEIF, TIFF, BMP.');
    }

    const fileExtension = fileType.split('/')[1];
    const fileId = uuidv4();

    // Key format: library-images/{libraryType}/{userId}/{uuid}.ext
    const isLibrary = context === 'library';
    const fileKey = isLibrary
      ? `library-images/${libraryType}/${userId}/${fileId}.${fileExtension}`
      : `book-covers/${userId}/${fileId}.${fileExtension}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      Expires: 3600,
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;

    let bookId = null;
    if (isLibrary) {
      // Create a draft book record immediately
      const draft = await BookService.create({
        title: 'Processing…',
        description: '',
        status: 'draft',
        coverImage: fileUrl,
        category: libraryType,
        s3Bucket: BUCKET_NAME,
        s3Key: fileKey,
        extractFromImage: false, // We'll extract later in worker
      }, userId);
      bookId = draft.bookId;
      
      // BookService.create already calls setMappedBookId if s3Bucket/s3Key provided
    }

    return { uploadUrl, fileUrl, fileKey, bookId, listingId: bookId, userId };
  }
}

module.exports = FileService;
