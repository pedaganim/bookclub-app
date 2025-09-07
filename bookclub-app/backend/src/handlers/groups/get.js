const Group = require('../../models/group');
const response = require('../../lib/response');

module.exports.handler = async (event) => {
  try {
    const groupId = event.pathParameters?.groupId;
    
    if (!groupId) {
      return response.validationError({
        groupId: 'Group ID is required',
      });
    }

    const group = await Group.getById(groupId);
    
    if (!group) {
      return response.notFound('Group not found');
    }

    return response.success(group);
  } catch (error) {
    console.error('Error getting group:', error);
    return response.error(error);
  }
};