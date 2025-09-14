const { success, error } = require('../../lib/response');
const User = require('../../models/user');

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error('Authorization token is required', 401);
    }
    const email = event.queryStringParameters?.email;
    if (!email) return error('email is required', 400);
    const user = await User.getByEmail(email);
    if (!user) return success({});
    const publicData = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture || null,
    };
    return success(publicData);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error find user by email:', e);
    return error(e.message || 'Failed to find user', 500);
  }
};
