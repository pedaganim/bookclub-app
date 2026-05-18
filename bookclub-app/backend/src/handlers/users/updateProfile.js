const { z } = require('zod');
const response = require('../../lib/response');
const UserService = require('../../services/user-service');
const { withAuth } = require('../../lib/middleware');

const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  bio: z.string().max(500).optional(),
  profilePicture: z.string().url('Invalid profile picture URL').optional().nullable(),
  timezone: z.string().refine((val) => {
    if (val === 'UTC') return true;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: val });
      return true;
    } catch (e) {
      return false;
    }
  }, { message: 'Invalid timezone' }).optional(),
});

/**
 * Handler for updating user profile.
 */
const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  
  // Validate input
  const updates = UpdateProfileSchema.parse(body);

  if (Object.keys(updates).length === 0) {
    return response.validationError({ message: 'No valid fields to update' });
  }

  const user = await UserService.updateProfile(event.userId, updates);
  
  return response.success(user);
};

module.exports.handler = withAuth(handler);