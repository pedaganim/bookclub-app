const LocalStorage = require('../../lib/local-storage');
const response = require('../../lib/response');

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
