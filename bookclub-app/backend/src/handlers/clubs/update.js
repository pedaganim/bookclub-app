const { z } = require('zod');
const response = require('../../lib/response');
const ClubService = require('../../services/club-service');
const { withClubAdmin } = require('../../lib/middleware');

const UpdateClubSchema = z.object({
  name: z.string().min(1, 'Club name is required').max(100, 'Club name must be 100 characters or less').optional(),
  location: z.string().min(1, 'Location is required').max(100, 'Location must be 100 characters or less').optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  slug: z.string()
    .min(1, 'Slug cannot be empty')
    .max(60, 'Slug must be 60 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional(),
  isPrivate: z.boolean().optional(),
  memberLimit: z.number().int().min(2).max(1000).nullable().optional(),
}).strict();

/**
 * Handler for updating an existing book club.
 */
const handler = async (event) => {
  const clubId = event.pathParameters.clubId;
  const body = JSON.parse(event.body || '{}');
  
  // Validate allowed fields
  const updates = UpdateClubSchema.parse(body);
  
  if (Object.keys(updates).length === 0) {
    return response.validationError({ message: 'At least one field must be provided for update' });
  }

  const updated = await ClubService.update(clubId, updates, event.userId);
  
  return response.success(updated);
};

module.exports.handler = withClubAdmin(handler);
