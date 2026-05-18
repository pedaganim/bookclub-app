const { z } = require('zod');
const response = require('../../lib/response');
const FileService = require('../../services/file-service');
const { withAuth } = require('../../lib/middleware');

const GenerateUploadUrlSchema = z.object({
  fileType: z.string({ 
    required_error: 'fileType is required',
    invalid_type_error: 'fileType is required' 
  }).min(1, 'fileType is required'),
  fileName: z.string().optional(),
  context: z.enum(['book', 'library', 'profile']).optional().default('book'),
  libraryType: z.string().optional().default('book'),
});

/**
 * Handler for generating a signed S3 upload URL.
 */
const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const data = GenerateUploadUrlSchema.parse(body);

  const result = await FileService.generateUploadUrl({
    ...data,
    userId: event.userId,
  });
  
  return response.success(result);
};

module.exports.handler = withAuth(handler);
