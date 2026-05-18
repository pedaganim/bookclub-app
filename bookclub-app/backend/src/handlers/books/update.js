const { z } = require('zod');
const response = require('../../lib/response');
const BookService = require('../../services/book-service');
const { withAuth } = require('../../lib/middleware');

const UpdateBookSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  author: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  coverImage: z.string().url().nullable().optional(),
  status: z.enum(['available', 'borrowed', 'reading', 'given_back', 'disposed', 'lent']).optional(),
  lentToUserId: z.string().nullable().optional(),
  lentToUserName: z.string().nullable().optional(),
}).strict();

/**
 * Handler for updating an existing book or library item.
 */
const handler = async (event) => {
  const { bookId } = event.pathParameters || {};
  if (!bookId) return response.validationError({ message: 'Book ID is required' });

  const body = JSON.parse(event.body || '{}');
  const updates = UpdateBookSchema.parse(body);

  if (Object.keys(updates).length === 0) {
    return response.validationError({ message: 'No valid fields to update' });
  }

  const updated = await BookService.update(bookId, updates, event.userId);
  
  return response.success(updated);
};

module.exports.handler = withAuth(handler);
