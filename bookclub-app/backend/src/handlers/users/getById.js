const { success, error } = require('../../lib/response');
const User = require('../../models/user');

exports.handler = async (event) => {
  try {
    // Require auth but any authenticated user can view minimal profile
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error('Authorization token is required', 401);
    }
    const { userId } = event.pathParameters || {};
    if (!userId) return error('userId is required', 400);
    const user = await User.getById(userId);
    if (!user) return error('User not found', 404);
    const publicData = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture || null,
    };
    return success(publicData);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error get user by id:', e);
    return error(e.message || 'Failed to get user', 500);
  }
};
