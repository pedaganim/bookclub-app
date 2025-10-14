const { success, error } = require('../../lib/response');
const User = require('../../models/user');

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { token } = body;

    if (!token) {
      return error('Verification token is required', 400);
    }

    const user = await User.verifyEmail(token);

    return success({ 
      message: 'Email verified successfully',
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      }
    });
  } catch (err) {
    console.error('Error verifying email:', err);
    return error(err.message || 'Failed to verify email', 400);
  }
};
