const response = require('../../lib/response');
const Meeting = require('../../models/meeting');

module.exports.handler = async (event) => {
  try {
    // Get userId from Cognito authorizer claims
    const claims = event?.requestContext?.authorizer?.claims;
    const userId = claims?.sub || null;
    if (!userId) {
      return response.unauthorized('Missing or invalid authentication');
    }

    const { meetingId } = event.pathParameters;
    const data = JSON.parse(event.body);

    // Validate input
    const errors = {};
    if (!meetingId) errors.meetingId = 'Meeting ID is required';
    if (!data.bookId) errors.bookId = 'Book ID is required';
    if (!data.bookTitle) errors.bookTitle = 'Book title is required';

    if (Object.keys(errors).length > 0) {
      return response.validationError(errors);
    }

    console.log('voteForBook handler', {
      userId,
      meetingId,
      bookTitle: data.bookTitle,
    });

    const vote = await Meeting.addVote(meetingId, userId, data.bookId, data.bookTitle);

    return response.success(vote, 201);
  } catch (error) {
    return response.error(error);
  }
};