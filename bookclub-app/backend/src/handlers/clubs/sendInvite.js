const { success, error } = require('../../lib/response');
const { sendEmail } = require('../../lib/notification-service');
const User = require('../../models/user');
const BookClub = require('../../models/bookclub');

exports.handler = async (event) => {
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return error('Missing authorization token', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const currentUser = await User.getCurrentUser(token);

    if (!currentUser) {
      return error('User not found', 404);
    }

    const body = JSON.parse(event.body || '{}');
    const { clubId, email, name } = body;

    if (!clubId) {
      return error('Club ID is required', 400);
    }

    if (!email) {
      return error('Email is required', 400);
    }

    // Verify user is a member of the club
    const isMember = await BookClub.isMember(clubId, currentUser.userId);
    if (!isMember) {
      return error('You must be a member of this club to send invites', 403);
    }

    // Get club details
    const club = await BookClub.getById(clubId);
    if (!club) {
      return error('Club not found', 404);
    }

    // Generate invite URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite/${club.inviteCode}`;

    // Send invite email
    const recipientName = name || email.split('@')[0];
    const subject = `${currentUser.name} invited you to join ${club.name}`;
    const text = `${currentUser.name} has invited you to join ${club.name} on BookClub.\n\nClick the link below to accept the invitation:\n\n${inviteUrl}\n\nJoin us to share and discover great books!`;
    const html = `<p><strong>${currentUser.name}</strong> has invited you to join <strong>${club.name}</strong> on BookClub.</p><p><a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background-color:#4F46E5;color:white;text-decoration:none;border-radius:6px;">Accept Invitation</a></p><p>Join us to share and discover great books!</p>`;

    await sendEmail(email, subject, text, html);

    return success({ 
      message: 'Invite sent successfully',
      inviteUrl
    });
  } catch (err) {
    console.error('Error sending invite:', err);
    return error(err.message || 'Failed to send invite', 500);
  }
};
