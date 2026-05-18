const { z } = require('zod');
const response = require('../../lib/response');
const NotificationService = require('../../services/notification-service');
const { withAuth } = require('../../lib/middleware');

const PrefsSchema = z.object({
  emailOptIn: z.boolean().optional(),
  prefs: z.record(z.any()).optional(),
}).strict();

/**
 * Handler for updating user notification preferences.
 */
const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const data = PrefsSchema.parse(body);

  const result = await NotificationService.setPrefs(event.userId, data);
  return response.success(result);
};

module.exports.handler = withAuth(handler);
