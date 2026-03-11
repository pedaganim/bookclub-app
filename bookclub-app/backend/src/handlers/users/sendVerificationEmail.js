const { success, error } = require('../../lib/response');
const { sendEmail } = require('../../lib/notification-service');
const User = require('../../models/user');

exports.handler = async (event) => {
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return error('Missing authorization token', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await User.getCurrentUser(token);

    if (!user) {
      return error('User not found', 404);
    }

    if (user.emailVerified) {
      return success({ message: 'Email already verified' });
    }

    // Generate verification URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify-email?token=${user.verificationToken}`;

    // Send verification email
    const { subject, text, html } = {
      subject: 'Verify your email - BookClub',
      text: `Hi ${user.name},\n\nWelcome to BookClub! Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create this account, you can safely ignore this email.`,
      html: `<p>Hi <strong>${user.name}</strong>,</p><p>Welcome to BookClub! Please verify your email address by clicking the button below:</p><p><a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background-color:#4F46E5;color:white;text-decoration:none;border-radius:6px;">Verify Email</a></p><p style="color:#666;">This link will expire in 24 hours.</p><p style="color:#666;font-size:12px;">If you didn't create this account, you can safely ignore this email.</p>`
    };

    await sendEmail(user.email, subject, text, html);

    return success({ message: 'Verification email sent' });
  } catch (err) {
    console.error('Error sending verification email:', err);
    return error(err.message || 'Failed to send verification email', 500);
  }
};
