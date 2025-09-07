const { v4: uuidv4 } = require('uuid');
const { getTableName } = require('../lib/table-names');
const dynamoDb = require('../lib/dynamodb');
const LocalStorage = require('../lib/local-storage');
const NotificationService = require('../lib/notification-service');
const Club = require('./club');

const isOffline = () => process.env.IS_OFFLINE === 'true' || process.env.NODE_ENV === 'development';

class Meeting {
  static async create(meetingData, creatorId) {
    const meetingId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const meeting = {
      meetingId,
      clubId: meetingData.clubId,
      title: meetingData.title,
      description: meetingData.description || '',
      scheduledAt: meetingData.scheduledAt,
      creatorId,
      status: 'scheduled', // scheduled, completed, cancelled
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (isOffline()) {
      const savedMeeting = await LocalStorage.createMeeting(meeting);
      
      // Send notifications to club members
      await this.notifyClubMembers(savedMeeting, creatorId);
      
      return savedMeeting;
    }

    await dynamoDb.put(getTableName('meetings'), meeting);
    
    // Send notifications to club members
    await this.notifyClubMembers(meeting, creatorId);
    
    return meeting;
  }

  static async getById(meetingId) {
    if (isOffline()) {
      return await LocalStorage.getMeeting(meetingId);
    }
    
    return dynamoDb.get(getTableName('meetings'), { meetingId });
  }

  static async notifyClubMembers(meeting, excludeUserId = null) {
    try {
      const scheduleDate = new Date(meeting.scheduledAt).toLocaleDateString();
      const scheduleTime = new Date(meeting.scheduledAt).toLocaleTimeString();
      
      await Club.broadcastNotification(
        meeting.clubId,
        'meeting_reminder',
        'New Meeting Scheduled',
        `A new meeting "${meeting.title}" has been scheduled for ${scheduleDate} at ${scheduleTime}.`,
        {
          meetingId: meeting.meetingId,
          meetingTitle: meeting.title,
          scheduledAt: meeting.scheduledAt,
        },
        excludeUserId
      );
    } catch (error) {
      console.error('Failed to send meeting notifications:', error);
    }
  }

  static async sendReminders(meetingId) {
    const meeting = await this.getById(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const scheduleDate = new Date(meeting.scheduledAt).toLocaleDateString();
    const scheduleTime = new Date(meeting.scheduledAt).toLocaleTimeString();
    
    await Club.broadcastNotification(
      meeting.clubId,
      'meeting_reminder',
      'Meeting Reminder',
      `Reminder: "${meeting.title}" is scheduled for ${scheduleDate} at ${scheduleTime}.`,
      {
        meetingId: meeting.meetingId,
        meetingTitle: meeting.title,
        scheduledAt: meeting.scheduledAt,
        isReminder: true,
      }
    );
  }

  static async addVote(meetingId, userId, bookId, bookTitle) {
    // This is a simplified voting system for demonstration
    const voteId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const vote = {
      voteId,
      meetingId,
      userId,
      bookId,
      bookTitle,
      createdAt: timestamp,
    };

    if (isOffline()) {
      const savedVote = await LocalStorage.createVote(vote);
      
      // Notify about the vote
      await this.notifyVote(meetingId, userId, bookTitle);
      
      return savedVote;
    }

    await dynamoDb.put(getTableName('votes'), vote);
    
    // Notify about the vote
    await this.notifyVote(meetingId, userId, bookTitle);
    
    return vote;
  }

  static async notifyVote(meetingId, voterUserId, bookTitle) {
    try {
      const meeting = await this.getById(meetingId);
      if (!meeting) return;

      // Get voter's name for the notification
      const User = require('./user');
      const voter = await User.getById(voterUserId);
      const voterName = voter ? voter.name : 'Someone';

      await Club.broadcastNotification(
        meeting.clubId,
        'vote',
        'New Book Vote',
        `${voterName} voted for "${bookTitle}" for the upcoming meeting "${meeting.title}".`,
        {
          meetingId: meeting.meetingId,
          meetingTitle: meeting.title,
          bookTitle,
          voterName,
        },
        voterUserId // Exclude the voter from getting their own vote notification
      );
    } catch (error) {
      console.error('Failed to send vote notification:', error);
    }
  }
}

module.exports = Meeting;