const clubChat = require('../../models/clubChat');
const BookClub = require('../../models/bookclub');

exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const { clubId } = event.pathParameters;
    const { content } = JSON.parse(event.body || '{}');

    if (!content) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Content is required' }),
      };
    }

    // Check if user is a member of the club
    const isMember = await BookClub.isMember(clubId, userId);
    if (!isMember) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Only club members can send messages' }),
      };
    }

    const message = await clubChat.sendMessage({
      clubId,
      fromUserId: userId,
      content,
    });

    return {
      statusCode: 201,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(message),
    };
  } catch (err) {
    console.error('Club sendMessage error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
