const User = require('../models/user');
const logger = require('../lib/logger');

class UserService {
  /**
   * Updates user profile data.
   * @param {string} userId - ID of the user.
   * @param {Object} updates - Fields to update.
   * @returns {Promise<Object>} The updated user.
   */
  static async updateProfile(userId, updates) {
    logger.info({ userId }, 'Updating user profile');

    const updated = await User.update(userId, updates);
    if (!updated) {
      throw new Error('NOT_FOUND:User not found');
    }

    logger.info({ userId }, 'User profile updated successfully');
    
    // Sanitize user data for response
    return {
      userId: updated.userId,
      email: updated.email,
      name: updated.name,
      bio: updated.bio,
      profilePicture: updated.profilePicture,
      timezone: updated.timezone,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  static async getById(userId) {
    return User.getById(userId);
  }
}

module.exports = UserService;
