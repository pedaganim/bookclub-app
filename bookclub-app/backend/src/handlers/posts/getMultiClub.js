const response = require('../../lib/response');
const Post = require('../../models/post');
const { getAuthenticatedUserId } = require('../../lib/get-user-id');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /posts/multi-club?clubIds=id1,id2,id3&limit=20&category=lost_found
 *
 * Fetches posts from multiple clubs, merges and sorts by createdAt descending.
 * Returns up to `limit` records total.
 */
module.exports.handler = async (event) => {
  try {
    const userId = await getAuthenticatedUserId(event);
    if (!userId) return response.unauthorized('Missing or invalid authentication');

    const query = event.queryStringParameters || {};

    // Accept clubIds=id1,id2 or clubIds[]=id1&clubIds[]=id2
    const clubIds = query.clubIds
      ? query.clubIds.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    if (clubIds.length === 0) {
      return response.validationError({ clubIds: 'At least one clubId is required' });
    }

    const limit = Math.min(parseInt(query.limit || DEFAULT_LIMIT, 10), MAX_LIMIT);
    const category = query.category || null;

    // --- Fetch posts from all clubs in parallel ---
    const perClubResults = await Promise.allSettled(
      clubIds.map((clubId) =>
        Post.listByClub(clubId, { limit, category })
      )
    );

    // --- Merge all into one flat array ---
    const allPosts = perClubResults
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value?.items || []);

    // --- Deduplicate by postId ---
    const seen = new Set();
    const deduplicated = allPosts.filter((post) => {
      if (seen.has(post.postId)) return false;
      seen.add(post.postId);
      return true;
    });

    // --- Sort newest first, then slice to requested limit ---
    const merged = deduplicated
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    const failedClubs = perClubResults
      .map((r, i) =>
        r.status === 'rejected' ? { clubId: clubIds[i], error: r.reason?.message } : null
      )
      .filter(Boolean);

    return response.success({
      items: merged,
      total: merged.length,
      clubIds,
      failedClubs,
    });
  } catch (error) {
    return response.error(error);
  }
};
