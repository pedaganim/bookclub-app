const { z } = require('zod');
const response = require('../../lib/response');
const ClubService = require('../../services/club-service');
const { withAuth } = require('../../lib/middleware');

const CreateClubSchema = z.object({
  name: z.string().min(1, 'Club name is required').max(100, 'Club name must be 100 characters or less'),
  location: z.string().min(1, 'Location is required').max(100, 'Location must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  slug: z.string()
    .min(1, 'Slug cannot be empty')
    .max(60, 'Slug must be 60 characters or less')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .optional(),
  isPrivate: z.boolean().default(false),
  memberLimit: z.number().int().min(2).max(1000).optional(),
});

/**
 * Handler for creating a new book club.
 */
const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  
  // Validate input
  const data = CreateClubSchema.parse(body);
  
  // Create club
  const club = await ClubService.create(data, event.userId);
  
  return response.success(club);
};

module.exports.handler = withAuth(handler);