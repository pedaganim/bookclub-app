const BookClub = require('../../models/bookclub');
const User = require('../../models/user');
const { success, error } = require('../../lib/response');

// --- Handler (top) ---
exports.handler = async (event) => {
  try {
    const body = parseBody(event);
    if (!body) return error('Request body is required', 400);

    const validationErr = validateBody(body);
    if (validationErr) return validationErr;

    const userId = await getUserIdFromEventOrToken(event);
    if (!userId) return error('Invalid or expired token', 401);

    const clubData = buildClubData(body);
    const club = await BookClub.create(clubData, userId);
    return success(club);
  } catch (err) {
    console.error('Error creating club:', err);
    return error(err.message || 'Failed to create club', err.statusCode || 500);
  }
};

// --- Helpers ---
const parseBody = (event) => {
  if (!event?.body) return null;
  try { return JSON.parse(event.body); } catch { return null; }
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const validateBody = ({ name, description, location, memberLimit, slug }) => {
  if (!name || name.trim().length === 0) return error('Club name is required', 400);
  if (!location || location.trim().length === 0) return error('Location is required', 400);
  if (location.length > 100) return error('Location must be 100 characters or less', 400);
  if (name.length > 100) return error('Club name must be 100 characters or less', 400);
  if (description && description.length > 500) return error('Club description must be 500 characters or less', 400);
  if (memberLimit && (memberLimit < 2 || memberLimit > 1000)) return error('Member limit must be between 2 and 1000', 400);
  if (slug !== undefined && slug !== null && slug !== '') {
    const s = slug.trim();
    if (s.length > 60) return error('Slug must be 60 characters or less', 400);
    if (!SLUG_RE.test(s)) return error('Slug may only contain lowercase letters, numbers, and hyphens (e.g. my-book-club)', 400);
  }
  return null;
};

const getUserIdFromEventOrToken = async (event) => {
  const claims = event?.requestContext?.authorizer?.claims;
  let userId = claims?.sub;
  if (userId) return userId;
  const authHeader = (event.headers && (event.headers.Authorization || event.headers.authorization)) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader || null;
  if (!token) return null;
  try {
    const currentUser = await User.getCurrentUser(token);
    return currentUser?.userId || null;
  } catch {
    return null;
  }
};

const buildClubData = ({ name, description, location, isPrivate, memberLimit, slug }) => ({
  name: name.trim(),
  slug: slug ? slug.trim() : undefined,
  description: description?.trim() || '',
  location: location.trim(),
  isPrivate: !!isPrivate,
  memberLimit: memberLimit || null,
});