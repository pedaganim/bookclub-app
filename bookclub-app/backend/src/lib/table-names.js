const STAGE = process.env.STAGE || 'dev';
const SERVICE_NAME = 'bookclub-app';

const tableNames = {
  books: `${SERVICE_NAME}-books-${STAGE}`,
  users: `${SERVICE_NAME}-users-${STAGE}`,
  notifications: `${SERVICE_NAME}-notifications-${STAGE}`,
};

function getTableName(key) {
  if (!tableNames[key]) {
    throw new Error(`Table name for key '${key}' not found`);
  }
  return tableNames[key];
}

module.exports = {
  getTableName,
};
