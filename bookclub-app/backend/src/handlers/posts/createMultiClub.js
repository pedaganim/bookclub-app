const response = require('../../lib/response');
const Post = require('../../models/post');
const BookClub = require('../../models/bookclub');
const { getAuthenticatedUserId } = require('../../lib/get-user-id');

/**
 * POST /posts/multi-club
 * Creates the same post in multiple clubs at once.
 *
 * Body:
 * {
 *   clubs: ['clubId1', 'clubId2'],   // required - list of clubs to post into
 *   title: 'Lost my keys',           // required
 *   content: 'Description...',       // optional
 *   category: 'lost_found',          // optional - defaults to 'general'
 *   images: [...],                   // optional
 *   coverImage: '...',               // optional
 *   status: 'active',                // optional
 *   userName: 'John Doe',            // optional - denormalised display name
 * }
 */
module.exports.handler = async (event) => {
  try {
    const userId = await getAuthenticatedUserId(event);
    if (!userId) return response.unauthorized('Missing or invalid authentication');

    const data = JSON.parse(event.body || '{}');
    const { clubs, ...postData } = data;

    // --- Validation ---
    if (!clubs || !Array.isArray(clubs) || clubs.length === 0) {
      return response.validationError({ clubs: 'clubs array is required' });
    }
    if (!postData.title) {
      return response.validationError({ title: 'Title is required' });
    }

    // --- Access check: validate membership + role for every club before writing anything ---
    const accessErrors = [];
    for (const clubId of clubs) {
      const club = await BookClub.getById(clubId);
      if (!club) {
        accessErrors.push(`Club ${clubId} not found`);
        continue;
      }
      const isMember = await BookClub.isMember(clubId, userId);
      if (!isMember) {
        accessErrors.push(`You are not a member of club ${clubId}`);
        continue;
      }
      const role = await BookClub.getMemberRole(clubId, userId);
      if (!['admin', 'moderator'].includes(role)) {
        accessErrors.push(`You must be an admin or moderator in club ${clubId} to post`);
      }
    }

    if (accessErrors.length > 0) {
      return response.forbidden(accessErrors.join('; '));
    }

    // --- Create the post in each club in parallel ---
    const results = await Promise.allSettled(
      clubs.map((clubId) =>
        Post.create(
          {
            ...postData,
            clubId,
            category: postData.category || 'general',
          },
          userId
        )
      )
    );

    const created = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    const failed = results
      .map((r, i) =>
        r.status === 'rejected' ? { clubId: clubs[i], error: r.reason?.message } : null
      )
      .filter(Boolean);

    return response.success(
      { created, failed, totalCreated: created.length },
      201
    );
  } catch (error) {
    return response.error(error);
  }
};
