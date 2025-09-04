/**
 * AWS Lambda handler for listing books with optional filtering
 * Returns paginated list of books, optionally filtered by user
 */
const LocalStorage = require('../../lib/local-storage');
const response = require('../../lib/response');

/**
 * Lambda handler function for listing books
 * @param {Object} event - AWS Lambda event object containing HTTP request data
 * @param {Object} event.queryStringParameters - Query parameters from URL
 * @param {string} event.queryStringParameters.userId - Optional user ID to filter books
 * @returns {Promise<Object>} HTTP response with list of books and pagination info
 */
module.exports.handler = async (event) => {
  try {
    const { queryStringParameters = {} } = event;
    const userId = queryStringParameters.userId;

    const books = await LocalStorage.listBooks(userId);

    return response.success({
      items: books,
      nextToken: null,
    });
  } catch (error) {
    return response.error(error);
  }
};
