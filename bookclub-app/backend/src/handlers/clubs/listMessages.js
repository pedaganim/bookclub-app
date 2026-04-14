const clubChat = require('../../models/clubChat');
const BookClub = require('../../models/bookclub');

exports.handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.claims.sub;
    const { clubId } = event.pathParameters;
    const { limit, nextToken } = event.queryStringParameters || {};

    // Check if user is a member of the club
    const isMember = await BookClub.isMember(clubId, userId);
    if (!isMember) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Only club members can read messages' }),
      };
    }

    const { items, nextToken: next } = await clubChat.listMessages(
      clubId,
      limit ? parseInt(limit, 10) : 50,
      nextToken
    );

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ items, nextToken: next }),
    };
  } catch (err) {
    console.error('Club listMessages error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
