const STAGE = process.env.STAGE || 'dev';
const SERVICE_NAME = 'bookclub-app';

const tableNames = {
  books: `${SERVICE_NAME}-books-${STAGE}`,
  users: `${SERVICE_NAME}-users-${STAGE}`,
  'metadata-cache': `${SERVICE_NAME}-metadata-cache-${STAGE}`,
  'bookclub-groups': `${SERVICE_NAME}-bookclub-groups-${STAGE}`,
  'bookclub-members': `${SERVICE_NAME}-bookclub-members-${STAGE}`,
  'dm-conversations': `${SERVICE_NAME}-dm-conversations-${STAGE}`,
  'dm-messages': `${SERVICE_NAME}-dm-messages-${STAGE}`,
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
