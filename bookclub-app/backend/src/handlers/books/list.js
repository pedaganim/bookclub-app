const response = require('../../lib/response');
const Book = require('../../models/book');
const BookClub = require('../../models/bookclub');
const LocalStorage = require('../../lib/local-storage');

// --- Handler (top) ---
module.exports.handler = async (event) => {
  try {
    const { qs, limit, nextToken, search, ageGroupFine, bare, filter, clubId, category } = parseQuery(event);
    const userId = deriveUserId(event, qs);
    const authUserId = await deriveAuthUserId(event);
    logListContext(event, userId, limit, nextToken, search, ageGroupFine, bare, filter, category);

    let result;
    if (clubId) {
      result = await listBooksByClubMembers(clubId, limit, category, bare);
    } else if (filter === 'borrowed' && userId) {
      result = await Book.listByLentToUser(userId, limit, nextToken);
    } else if (userId) {
      result = await Book.listByUser(userId, limit, nextToken, category);
    } else {
      const options = { category, bare };
      if (bare) {
        let memberClubIds = null;
        const effectiveUserId = authUserId || userId;
        if (effectiveUserId) {
          try {
            const userClubs = await BookClub.getUserClubs(effectiveUserId);
            memberClubIds = new Set(
              (userClubs || []).filter(c => c.userStatus === 'active').map(c => c.clubId)
            );
          } catch (_) {
            memberClubIds = new Set();
          }
        }
        options.memberClubIds = memberClubIds;
      }
      result = await Book.listAll(limit, nextToken, search, ageGroupFine || null, options);
    }

    return response.success({
      items: result.items,
      nextToken: result.nextToken || null,
    });
  } catch (error) {
    return response.error(error);
  }
};

// --- Helpers ---
const parseQuery = (event) => {
  const qs = (event && event.queryStringParameters) ? event.queryStringParameters : {};
  const limit = qs && qs.limit ? parseInt(qs.limit, 10) : 10;
  const nextToken = qs && typeof qs.nextToken === 'string' ? qs.nextToken : null;
  const search = qs && typeof qs.search === 'string' ? qs.search : null;
  const ageGroupFine = qs && typeof qs.ageGroupFine === 'string' ? qs.ageGroupFine : null;
  const bare = qs && typeof qs.bare === 'string' ? (qs.bare === '1' || qs.bare.toLowerCase() === 'true') : false;
  const filter = qs && typeof qs.filter === 'string' ? qs.filter : null;
  const clubId = qs && typeof qs.clubId === 'string' ? qs.clubId : null;
  const category = qs && (qs.category || qs.libraryType) ? String(qs.category || qs.libraryType) : null;
  return { qs, limit, nextToken, search, ageGroupFine, bare, filter, clubId, category };
};

const deriveUserId = (event, qs) => {
  let userId = qs && typeof qs.userId === 'string' ? qs.userId : null;
  if (!userId && event?.requestContext?.authorizer?.claims?.sub) {
    userId = event.requestContext.authorizer.claims.sub;
  }
  return userId;
};

const deriveAuthUserId = async (event) => {
  if (event?.requestContext?.authorizer?.claims?.sub) {
    return event.requestContext.authorizer.claims.sub;
  }
  const authHeader = (event?.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token && (process.env.IS_OFFLINE === 'true' || process.env.APP_ENV === 'local')) {
    const user = await LocalStorage.verifyToken(token).catch(() => null);
    if (user) return user.userId;
  }
  return null;
};

const listBooksByClubMembers = async (clubId, limit, category, bare) => {
  // In offline/dev mode query books directly by clubId (seed data stores clubId on the book)
  if (process.env.IS_OFFLINE === 'true' || process.env.APP_ENV === 'local') {
    const LocalStorage = require('../../lib/local-storage');
    let items = await LocalStorage.listBooksByClub(clubId, category || null);
    items = items.filter(b => b.category !== 'lost_found');
    return { items: items.slice(0, limit), nextToken: null };
  }

  const members = await BookClub.getMembers(clubId);
  const activeMembers = (members || []).filter(m => m.status === 'active');
  if (activeMembers.length === 0) return { items: [], nextToken: null };

  // Fetch books for each active member in parallel, capped per-member to avoid huge payloads
  const perMember = Math.max(10, Math.ceil(limit / activeMembers.length));
  const results = await Promise.all(
    activeMembers.map(m => Book.listByUser(m.userId, perMember, null, category).catch(() => ({ items: [] })))
  );

  const items = results.flatMap(r => (r.items || []).map(book => ({ ...book, clubId })));
  return { items: items.slice(0, limit), nextToken: null };
};

const logListContext = (event, userId, limit, nextToken, search, ageGroupFine, bare, filter, category) => {
  console.log('listBooks handler', {
    stage: process.env.STAGE,
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
    derivedUserId: userId || null,
    hasClaims: !!(event?.requestContext?.authorizer?.claims),
    limit,
    hasNextToken: !!nextToken,
    hasSearch: !!search,
    ageGroupFine: ageGroupFine || null,
    bare: !!bare,
    filter: filter || null,
    category: category || null,
  });
};
