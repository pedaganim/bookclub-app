const { z } = require('zod');
const response = require('../../lib/response');
const ClubService = require('../../services/club-service');
const { withAuth } = require('../../lib/middleware');

const JoinClubSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required').trim().toUpperCase(),
});

/**
 * Handler for joining a club via invite code.
 */
const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  
  // Validate input
  const { inviteCode } = JoinClubSchema.parse(body);

  const result = await ClubService.joinByInviteCode(inviteCode, event.userId);
  
  return response.success(result);
};

module.exports.handler = withAuth(handler);