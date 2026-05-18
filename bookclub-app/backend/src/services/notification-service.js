const { getUserPrefs, setUserPrefs } = require('../lib/notification-service');
const logger = require('../lib/logger');

class NotificationService {
  /**
   * Retrieves notification preferences for a user.
   * @param {string} userId - ID of the user.
   * @returns {Promise<Object>} The user's preferences.
   */
  static async getPrefs(userId) {
    logger.info({ userId }, 'Getting notification preferences');
    return getUserPrefs(userId);
  }

  /**
   * Updates notification preferences for a user.
   * @param {string} userId - ID of the user.
   * @param {Object} prefs - The new preferences.
   * @returns {Promise<Object>} The updated preferences.
   */
  static async setPrefs(userId, prefs) {
    logger.info({ userId }, 'Setting notification preferences');
    return setUserPrefs(userId, prefs);
  }
}

module.exports = NotificationService;
