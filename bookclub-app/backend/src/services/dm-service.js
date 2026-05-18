const DM = require('../models/dm');
const User = require('../models/user');
const { sendEmailIfEnabled } = require('../lib/notification-service');
const logger = require('../lib/logger');

class DMService {
  /**
   * Sends a DM message and handles notifications.
   * @param {Object} params - { conversationId, fromUserId, toUserId, content }
   * @returns {Promise<Object>} The sent message.
   */
  static async sendMessage({ conversationId, fromUserId, toUserId, content }) {
    logger.info({ conversationId, fromUserId, toUserId }, 'Sending DM message');

    const trimmed = content.trim();

    // 1. Ensure conversation exists and match participants
    const conv = await DM.ensureConversation(fromUserId, toUserId);
    if (conv.conversationId !== conversationId) {
      throw new Error('FORBIDDEN:Conversation ID does not match participants');
    }

    // 2. Send message
    const msg = await DM.sendMessage({ 
      conversationId, 
      fromUserId, 
      toUserId, 
      content: trimmed 
    });

    // 3. Notifications (Asynchronous / Fire-and-forget)
    this.notifyRecipient(toUserId, fromUserId, conversationId, trimmed).catch(err => {
      logger.warn({ err }, 'DM notification failed');
    });

    return msg;
  }

  static async notifyRecipient(toUserId, fromUserId, conversationId, contentSnippet) {
    const sender = await User.getById(fromUserId);
    const fromName = sender?.name || 'A user';
    const baseUrl = process.env.SITE_BASE_URL || 'http://localhost:3000';
    const conversationUrl = `${baseUrl.replace(/\/$/, '')}/messages/${conversationId}`;

    await sendEmailIfEnabled(
      toUserId,
      'dm_message_received',
      'dm_message_received',
      { 
        fromName, 
        snippet: contentSnippet.slice(0, 140), 
        conversationUrl 
      }
    );
    return true;
  }

  /**
   * Lists conversations for a user.
   */
  static async listConversations(userId, limit = 20) {
    logger.info({ userId, limit }, 'Listing conversations');
    return DM.listConversationsForUser(userId, limit);
  }
}

module.exports = DMService;
