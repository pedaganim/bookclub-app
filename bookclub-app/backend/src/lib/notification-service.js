const AWS = require('../lib/aws-config');
const Notification = require('../models/notification');
const User = require('../models/user');

const ses = new AWS.SES();

class NotificationService {
  static async sendNotification(userId, type, title, message, data = {}) {
    try {
      // Get user and their preferences
      const user = await User.getById(userId);
      if (!user) {
        console.error('User not found for notification:', userId);
        return null;
      }

      const preferences = user.notificationPreferences || {};
      
      // Check if user wants this type of notification
      const typePreferences = {
        book_proposal: preferences.bookProposals,
        vote: preferences.votes,
        meeting_reminder: preferences.meetingReminders,
        discussion_reply: preferences.discussionReplies,
      };

      if (typePreferences[type] === false) {
        console.log(`User ${userId} has disabled ${type} notifications`);
        return null;
      }

      // Create in-app notification if enabled
      let notification = null;
      if (preferences.inApp !== false) {
        notification = await Notification.create({
          userId,
          type,
          title,
          message,
          data,
        });
      }

      // Send email notification if enabled and we have an email
      if (preferences.email !== false && user.email) {
        await this.sendEmailNotification(user.email, user.name, title, message, type);
        
        // Mark email as sent
        if (notification) {
          await Notification.markEmailSent(notification.notificationId);
        }
      }

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  static async sendEmailNotification(email, name, title, message, type) {
    // Skip email sending in offline mode
    if (process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development') {
      console.log(`[OFFLINE] Email notification would be sent to ${email}:`);
      console.log(`Subject: ${title}`);
      console.log(`Message: ${message}`);
      return;
    }

    const sourceEmail = process.env.NOTIFICATION_FROM_EMAIL || 'noreply@bookclub-app.com';
    
    const emailBody = this.generateEmailTemplate(name, title, message, type);

    const params = {
      Source: sourceEmail,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: `BookClub - ${title}`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: emailBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: `${title}\n\n${message}`,
            Charset: 'UTF-8',
          },
        },
      },
    };

    try {
      await ses.sendEmail(params).promise();
      console.log(`Email notification sent to ${email}: ${title}`);
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error);
      throw error;
    }
  }

  static generateEmailTemplate(name, title, message, type) {
    const typeIcons = {
      book_proposal: '📚',
      vote: '🗳️',
      meeting_reminder: '📅',
      discussion_reply: '💬',
    };

    const icon = typeIcons[type] || '📢';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BookClub Notification</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .icon { font-size: 48px; margin-bottom: 10px; }
          .title { color: #333; font-size: 24px; margin-bottom: 20px; }
          .message { color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px; }
          .footer { color: #999; font-size: 14px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">${icon}</div>
            <h1>BookClub Notification</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <h2 class="title">${title}</h2>
            <div class="message">${message}</div>
          </div>
          <div class="footer">
            <p>This is an automated notification from BookClub App.</p>
            <p>To manage your notification preferences, visit your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static async broadcastToClub(clubId, type, title, message, data = {}, excludeUserId = null) {
    // For now, we'll implement this as a placeholder since clubs aren't fully implemented yet
    // In a real implementation, this would get all club members and send notifications to each
    console.log(`Broadcasting notification to club ${clubId}: ${title}`);
    return [];
  }
}

module.exports = NotificationService;