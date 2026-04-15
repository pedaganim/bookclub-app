const Book = require('../../models/book');
const { success, error } = require('../../lib/response');

exports.handler = async (event) => {
  try {
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub;

    if (!userId) {
      return error('Unauthorized', 401);
    }

    const summary = await Book.getSummary(userId);

    return success(summary);
  } catch (err) {
    console.error('Error getting book summary:', err);
    return error(err.message || 'Failed to get book summary', 500);
  }
};
