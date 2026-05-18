const { z } = require('zod');
const response = require('../../lib/response');
const BookService = require('../../services/book-service');
const { withOptionalAuth } = require('../../lib/middleware');

const ListQuerySchema = z.object({
  limit: z.preprocess((val) => (val === undefined || val === null) ? undefined : parseInt(val, 10), z.number().int().min(1).max(100).default(10)),
  nextToken: z.string().optional(),
  search: z.string().optional(),
  ageGroupFine: z.string().optional(),
  bare: z.preprocess((val) => val === '1' || val === 'true', z.boolean().default(false)),
  filter: z.string().optional(),
  clubId: z.string().optional(),
  category: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * Handler for listing books/items with filters.
 */
const handler = async (event) => {
  const qs = event.queryStringParameters || {};
  
  // Backward compatibility for libraryType
  if (qs.libraryType && !qs.category) {
    qs.category = qs.libraryType;
  }

  const params = ListQuerySchema.parse(qs);
  
  // Use either the userId from query or the authenticated user
  const result = await BookService.list(params, event.userId);
  
  return response.success({
    items: result.items,
    nextToken: result.nextToken || null,
  });
};

module.exports.handler = withOptionalAuth(handler);
