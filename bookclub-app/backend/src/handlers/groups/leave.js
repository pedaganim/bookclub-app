const Group = require('../../models/group');
const response = require('../../lib/response');
const { getUserFromEvent } = require('../../lib/auth');

module.exports.handler = async (event) => {
  try {
    const user = await getUserFromEvent(event);
    if (!user) {
      return response.unauthorized('Authentication required');
    }

    const groupId = event.pathParameters?.groupId;
    
    if (!groupId) {
      return response.validationError({
        groupId: 'Group ID is required',
      });
    }

    const group = await Group.leaveGroup(groupId, user.userId);

    return response.success(group);
  } catch (error) {
    console.error('Error leaving group:', error);
    if (error.message === 'Group not found') {
      return response.notFound(error.message);
    }
    if (error.message.includes('not a member') || error.message.includes('cannot leave')) {
      return response.validationError({ group: error.message });
    }
    return response.error(error);
  }
};