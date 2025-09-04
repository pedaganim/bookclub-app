/**
 * DynamoDB table name management utility
 * Provides consistent naming convention for database tables across environments
 */
const STAGE = process.env.STAGE || 'dev';
const SERVICE_NAME = 'bookclub-app';

const tableNames = {
  books: `${SERVICE_NAME}-books-${STAGE}`,
  users: `${SERVICE_NAME}-users-${STAGE}`,
};

/**
 * Retrieves the full table name for a given table key
 * @param {string} key - Table identifier (e.g., 'books', 'users')
 * @returns {string} Full table name including service and stage
 * @throws {Error} If table key is not found
 */
function getTableName(key) {
  if (!tableNames[key]) {
    throw new Error(`Table name for key '${key}' not found`);
  }
  return tableNames[key];
}

module.exports = {
  getTableName,
};
