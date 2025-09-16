const Book = require('../../models/book');
const { success, error } = require('../../lib/response');

// Simple cleaner: remove excessive whitespace, non-printable chars; trim length
function cleanText(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000);
}

module.exports.handler = async (event) => {
  try {
    const detail = event?.detail || {};
    const bookId = detail.bookId;
    if (!bookId) return error('Missing bookId in event detail', 400);

    const existing = await Book.getById(bookId);
    if (!existing) return error('Book not found', 404);

    const sourceText = existing.textractExtractedText || existing.description || '';
    const cleaned = cleanText(sourceText);

    // Update book with clean_description (does not change ownership enforcement)
    await Book.update(bookId, existing.userId, { clean_description: cleaned });

    return success({ bookId, cleaned: cleaned.length > 0 });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[CleanDescription] Error:', e);
    return error(e.message || 'Failed to clean description', 500);
  }
};
