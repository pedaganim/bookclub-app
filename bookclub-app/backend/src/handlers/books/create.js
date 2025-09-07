const response = require('../../lib/response');
const Book = require('../../models/book');
const NotificationService = require('../../lib/notification-service');
const User = require('../../models/user');

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

    // Send notification about new book proposal
    try {
      const user = await User.getById(userId);
      const userName = user?.name || 'Someone';
      
      await NotificationService.sendNotification(
        userId,
        'book_proposal',
        'New Book Proposal Created',
        `You have successfully proposed "${created.title}" by ${created.author} for the book club.`,
        {
          bookId: created.bookId,
          title: created.title,
          author: created.author,
        }
      );
    } catch (notificationError) {
      console.error('Failed to send book proposal notification:', notificationError);
      // Don't fail the book creation if notification fails
    }

    return response.success(created, 201);
  } catch (error) {
    return response.error(error);
  }
};
