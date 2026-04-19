const { success, error } = require('../../lib/response');
const ToyListing = require('../../models/toyListing');
const { getAuthenticatedUserId } = require('../../lib/get-user-id');

const ALLOWED_CONDITIONS = ['new', 'like_new', 'good', 'fair'];

// All valid categories across every library type
const ALLOWED_CATEGORIES = [
  // Toys
  'books', 'outdoor', 'educational', 'dolls', 'vehicles',
  // Tools
  'power_tools', 'hand_tools', 'garden', 'plumbing', 'electrical', 'ladders',
  // Events
  'furniture', 'decorations', 'audio_visual', 'kitchen',
  // Games
  'board_games', 'card_games', 'puzzles', 'video_games', 'outdoor_games',
  // Generic
  'other',
];

const ALLOWED_LIBRARY_TYPES = ['toy', 'tool', 'event', 'game'];

exports.handler = async (event) => {
  try {
    const userId = await getAuthenticatedUserId(event);
    if (!userId) return error('Unauthorized', 401);

    let body = {};
    try {
      if (event.body) body = JSON.parse(event.body);
    } catch (_) {
      return error('Invalid JSON body', 400);
    }

    // Validate required fields
    const validationErrors = {};
    if (!body.title || !String(body.title).trim()) {
      validationErrors.title = 'Title is required';
    }
    if (!body.condition || !ALLOWED_CONDITIONS.includes(body.condition)) {
      validationErrors.condition = `Condition must be one of: ${ALLOWED_CONDITIONS.join(', ')}`;
    }
    if (body.category && !ALLOWED_CATEGORIES.includes(body.category)) {
      validationErrors.category = `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`;
    }
    if (body.libraryType && !ALLOWED_LIBRARY_TYPES.includes(body.libraryType)) {
      validationErrors.libraryType = `Library type must be one of: ${ALLOWED_LIBRARY_TYPES.join(', ')}`;
    }

    if (Object.keys(validationErrors).length > 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', errors: validationErrors },
        }),
      };
    }

    const data = {
      title: String(body.title).trim(),
      description: body.description ? String(body.description).trim() : '',
      condition: body.condition,
      category: body.category || null,
      location: body.location ? String(body.location).trim() : null,
      wantInReturn: body.wantInReturn ? String(body.wantInReturn).trim() : null,
      images: Array.isArray(body.images) ? body.images : null,
      libraryType: body.libraryType || 'toy',
      userName: body.userName ? String(body.userName).trim() : null,
    };

    const listing = await ToyListing.create(data, userId);
    return { ...success(listing), statusCode: 201 };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[SwapToys][create] Error:', e);
    return error('Failed to create listing', 500);
  }
};
