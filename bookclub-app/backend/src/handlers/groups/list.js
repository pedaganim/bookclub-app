const Group = require('../../models/group');
const response = require('../../lib/response');

module.exports.handler = async (event) => {
  try {
    const limit = parseInt(event.queryStringParameters?.limit) || 10;
    const nextToken = event.queryStringParameters?.nextToken || null;

    const result = await Group.listAll(limit, nextToken);

    return response.success(result);
  } catch (error) {
    console.error('Error listing groups:', error);
    return response.error(error);
  }
};