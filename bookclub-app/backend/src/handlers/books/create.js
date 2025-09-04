/**
 * AWS Lambda handler for creating new book entries
 * Creates a new book record with user authentication and validation
 */
const { v4: uuidv4 } = require('uuid');
const LocalStorage = require('../../lib/local-storage');
const response = require('../../lib/response');

/**
 * Lambda handler function for creating a new book
 * @param {Object} event - AWS Lambda event object containing HTTP request data
 * @param {Object} event.headers - HTTP headers including Authorization
 * @param {Object} event.body - JSON string containing book data
 * @param {string} event.body.title - Book title (required)
 * @param {string} event.body.author - Book author (required)
 * @param {string} event.body.description - Book description (optional)
 * @param {string} event.body.coverImage - Book cover image URL (optional)
 * @param {string} event.body.status - Book status, defaults to 'available'
 * @returns {Promise<Object>} HTTP response with created book data or error
 */
module.exports.handler = async (event) => {
  try {
    // For local development, extract userId from Authorization header
    const authHeader = event.headers.Authorization || event.headers.authorization;
    let userId = 'local-user';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('local-token-')) {
        userId = token.replace('local-token-', '');
      }
    }

    const data = JSON.parse(event.body);

    // Validate input
    if (!data.title || !data.author) {
      return response.validationError({
        title: data.title ? undefined : 'Title is required',
        author: data.author ? undefined : 'Author is required',
      });
    }

    const bookId = uuidv4();
    const timestamp = new Date().toISOString();
    
    const book = {
      bookId,
      userId,
      title: data.title,
      author: data.author,
      description: data.description || '',
      coverImage: data.coverImage || null,
      status: data.status || 'available',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await LocalStorage.createBook(book);
    return response.success(book, 201);
  } catch (error) {
    return response.error(error);
  }
};
