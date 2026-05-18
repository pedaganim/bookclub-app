const { z } = require('zod');
const response = require('../../lib/response');
const BookService = require('../../services/book-service');
const { withAuth } = require('../../lib/middleware');

const CreateLostFoundSchema = z.object({
  clubId: z.string().min(1, 'clubId is required'),
  title: z.string().min(1, 'title is required').max(100),
  description: z.string().max(1000).optional(),
  itemType: z.string().optional(),
  foundLocation: z.string().max(200).optional(),
  foundDate: z.string().optional(),
  images: z.array(z.string()).optional(),
});

/**
 * Handler for creating a new Lost & Found entry.
 * Note: Lost & Found items are now consolidated into the 'books' table.
 */
const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  
  // Validate input
  const data = CreateLostFoundSchema.parse(body);
  
  // Create item as a 'lost_found' category book
  const item = await BookService.create({
    ...data,
    category: 'lost_found',
    status: 'available',
  }, event.userId);
  
  return response.success(item, 201);
};

module.exports.handler = withAuth(handler);
