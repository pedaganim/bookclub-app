/**
 * AWS Lambda handler for user login functionality
 * Authenticates users using email and password
 */
const LocalStorage = require('../../lib/local-storage');
const response = require('../../lib/response');

/**
 * Lambda handler function for user authentication
 * @param {Object} event - AWS Lambda event object containing HTTP request data
 * @param {Object} event.body - JSON string containing login credentials
 * @param {string} event.body.email - User's email address
 * @param {string} event.body.password - User's password
 * @returns {Promise<Object>} HTTP response with authentication tokens or error
 */
module.exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    console.log('Login attempt for:', data.email);

    // Validate input
    const errors = {};
    if (!data.email) errors.email = 'Email is required';
    if (!data.password) errors.password = 'Password is required';
    
    if (Object.keys(errors).length > 0) {
      return response.validationError(errors);
    }

    // Check if user exists first
    const user = await LocalStorage.getUserByEmail(data.email);
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return response.unauthorized('User not found');
    }

    console.log('Password check:', user.password === data.password);

    const result = await LocalStorage.authenticateUser(data.email, data.password);
    
    if (!result) {
      return response.unauthorized('Incorrect email or password');
    }
    
    return response.success({
      user: {
        userId: result.user.userId,
        email: result.user.email,
        name: result.user.name,
        profilePicture: result.user.profilePicture,
      },
      tokens: result.tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    return response.unauthorized(error.message);
  }
};
