const Group = require('../../models/group');
const response = require('../../lib/response');

module.exports.handler = async (event) => {
  try {
    const latitude = parseFloat(event.queryStringParameters?.latitude);
    const longitude = parseFloat(event.queryStringParameters?.longitude);
    const radius = parseInt(event.queryStringParameters?.radius) || 10; // Default 10km
    const limit = parseInt(event.queryStringParameters?.limit) || 10;

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      return response.validationError({
        location: 'Valid latitude and longitude are required',
      });
    }

    if (latitude < -90 || latitude > 90) {
      return response.validationError({
        latitude: 'Latitude must be between -90 and 90',
      });
    }

    if (longitude < -180 || longitude > 180) {
      return response.validationError({
        longitude: 'Longitude must be between -180 and 180',
      });
    }

    const userLocation = { latitude, longitude };
    const result = await Group.listNearby(userLocation, radius, limit);

    return response.success(result);
  } catch (error) {
    console.error('Error getting nearby groups:', error);
    return response.error(error);
  }
};