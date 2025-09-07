const Group = require('../../models/group');
const response = require('../../lib/response');
const { getUserFromEvent } = require('../../lib/auth');

module.exports.handler = async (event) => {
  try {
    const user = await getUserFromEvent(event);
    if (!user) {
      return response.unauthorized('Authentication required');
    }

    const data = JSON.parse(event.body);

    // Validate input
    const errors = {};
    if (!data.name) errors.name = 'Group name is required';
    if (!data.location) errors.location = 'Location is required';
    if (!data.location?.latitude) errors.latitude = 'Latitude is required';
    if (!data.location?.longitude) errors.longitude = 'Longitude is required';
    
    if (Object.keys(errors).length > 0) {
      return response.validationError(errors);
    }

    // Additional validation
    if (data.name.length < 2) {
      return response.validationError({
        name: 'Group name must be at least 2 characters long',
      });
    }

    if (data.location.latitude < -90 || data.location.latitude > 90) {
      return response.validationError({
        latitude: 'Latitude must be between -90 and 90',
      });
    }

    if (data.location.longitude < -180 || data.location.longitude > 180) {
      return response.validationError({
        longitude: 'Longitude must be between -180 and 180',
      });
    }

    // Create group
    const group = await Group.create(data, user.userId);

    return response.success(group, 201);
  } catch (error) {
    console.error('Error creating group:', error);
    return response.error(error);
  }
};