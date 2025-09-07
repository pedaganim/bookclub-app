const response = require('../../lib/response');
const Book = require('../../models/book');

module.exports.handler = async (event) => {
  try {
    // Derive userId from Cognito authorizer claims (configured in API Gateway)
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    const data = JSON.parse(event.body);

    // Validate input
    if (!data.title || !data.author) {
      return response.validationError({
        title: data.title ? undefined : 'Title is required',
        author: data.author ? undefined : 'Author is required',
      });
    }

    const created = await Book.create({
      title: data.title,
      author: data.author,
      description: data.description,
      coverImage: data.coverImage,
      status: data.status,
    }, userId);

    return response.success(created, 201);
  } catch (error) {
    return response.error(error);
  }
};
