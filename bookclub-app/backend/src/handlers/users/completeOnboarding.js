const { success, error } = require('../../lib/response');
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

    const updatedUser = await User.completeOnboarding(user.userId);

    return success({ 
      message: 'Onboarding completed',
      user: {
        userId: updatedUser.userId,
        email: updatedUser.email,
        name: updatedUser.name,
        onboardingCompleted: updatedUser.onboardingCompleted,
      }
    });
  } catch (err) {
    console.error('Error completing onboarding:', err);
    return error(err.message || 'Failed to complete onboarding', 500);
  }
};
