const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');
const LocalStorage = require('../lib/local-storage');
const NotificationService = require('../lib/notification-service');

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development';

class Discussion {
  static async addReply(discussionId, userId, content, replyToUserId = null) {
    const replyId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const reply = {
      replyId,
      discussionId,
      userId,
      content,
      replyToUserId, // If replying to a specific user
      createdAt: timestamp,
    };

    if (isOffline()) {
      const savedReply = await LocalStorage.createDiscussionReply(reply);
      
      // Send notification if replying to someone
      if (replyToUserId && replyToUserId !== userId) {
        await this.notifyReply(savedReply, userId);
      }
      
      return savedReply;
    }

    await dynamoDb.put(getTableName('discussion_replies'), reply);
    
    // Send notification if replying to someone
    if (replyToUserId && replyToUserId !== userId) {
      await this.notifyReply(reply, userId);
    }
    
    return reply;
  }

  static async notifyReply(reply, replierUserId) {
    try {
      // Get replier's name for the notification
      const User = require('./user');
      const replier = await User.getById(replierUserId);
      const replierName = replier ? replier.name : 'Someone';

      await NotificationService.sendNotification(
        reply.replyToUserId,
        'discussion_reply',
        'New Discussion Reply',
        `${replierName} replied to your comment: "${reply.content.substring(0, 100)}${reply.content.length > 100 ? '...' : ''}"`,
        {
          replyId: reply.replyId,
          discussionId: reply.discussionId,
          replierName,
          content: reply.content,
        }
      );
    } catch (error) {
      console.error('Failed to send discussion reply notification:', error);
    }
  }
}

module.exports = Discussion;