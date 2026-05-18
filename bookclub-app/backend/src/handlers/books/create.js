const { z } = require('zod');
const response = require('../../lib/response');
const BookService = require('../../services/book-service');
const { withAuth } = require('../../lib/middleware');

const CreateBookSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(), // Optional if extracting from image
  author: z.string().min(1, 'Author is required').optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  libraryType: z.string().optional(),
  coverImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  status: z.string().optional(),
  s3Bucket: z.string().optional(),
  s3Key: z.string().optional(),
  clubId: z.string().optional(),
  enrichWithMetadata: z.boolean().optional(),
  extractFromImage: z.boolean().optional(),
  isbn: z.string().optional(),
});

/**
 * Handler for creating a new book or library item.
 */
const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  
  // Validate input schema
  const data = CreateBookSchema.parse(body);
  
  // Delegate all business logic to the Service
  const created = await BookService.create(data, event.userId);
  
  return response.success(created, 201);
};

module.exports.handler = withAuth(handler);
