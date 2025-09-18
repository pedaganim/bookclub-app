const Book = require('../../models/book');
const { success, error } = require('../../lib/response');
const { publishEvent } = require('../../lib/event-bus');

// MCP analyzer: now runs after Clean Description is completed.
// It uses OpenAI (if configured) to extract title/author candidates from clean_description (text-only),
// and falls back to existing and Google metadata heuristics.
module.exports.handler = async (event) => {
  try {
    if (String(process.env.ENABLE_MCP_ANALYZER || 'true') !== 'true') {
      return success({ skipped: true, reason: 'MCP analyzer disabled' });
    }
    const detail = event?.detail || {};
    const bookId = detail.bookId;
    if (!bookId) return error('Missing bookId in event detail', 400);

    const existing = await Book.getById(bookId);
    if (!existing) return error('Book not found', 404);

    // Prepare clean description input
    const cleanText = existing.clean_description || existing.description || existing.textractExtractedText || '';

    // Try OpenAI text analysis if configured
    let llmResult = null;
    if (process.env.OPENAI_API_KEY && cleanText && process.env.NODE_ENV !== 'test') {
      try {
        const prompt = `You are given a cleaned textual description of a book (from cover and metadata).\n` +
          `Extract likely candidates for the book's title and author(s). Return strict JSON with this shape:\n` +
          `{"title_candidates":[{"value":"string","confidence":0..1}],"author_candidates":[{"value":"string","confidence":0..1}]}` +
          `\nFocus on short, plausible strings. Do not include subtitles in title. Combine multi-author names with comma.\n` +
          `\nCLEAN_DESCRIPTION:\n` + cleanText.slice(0, 4000);

        const body = {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Return only valid JSON. No commentary.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 300,
        };
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        });
        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content || '';
          try {
            const parsed = JSON.parse(content);
            if (parsed && (parsed.title_candidates || parsed.author_candidates)) llmResult = parsed;
          } catch (_) {
            // ignore parse failure; fallback below
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn('[MCPAnalyze] OpenAI response not OK:', resp.status, resp.statusText);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[MCPAnalyze] OpenAI analysis failed, falling back:', e.message);
      }
    }

    // Stub OCR result or worker fallback: use existing title/author or google metadata as candidates
    const gm = existing.google_metadata || {};
    const gmTitle = gm.title || (gm.volumeInfo && gm.volumeInfo.title);
    const gmAuthors = gm.authors || (gm.volumeInfo && gm.volumeInfo.authors) || [];

    const titleCandidates = llmResult?.title_candidates ? llmResult.title_candidates.slice(0, 5) : [];
    if (existing.title) titleCandidates.push({ value: existing.title, confidence: 0.6 });
    if (gmTitle && (!existing.title || existing.title !== gmTitle)) titleCandidates.push({ value: gmTitle, confidence: 0.5 });

    const authorCandidates = llmResult?.author_candidates ? llmResult.author_candidates.slice(0, 5) : [];
    if (existing.author) authorCandidates.push({ value: existing.author, confidence: 0.6 });
    if (Array.isArray(gmAuthors) && gmAuthors.length) authorCandidates.push({ value: gmAuthors.join(', '), confidence: 0.5 });

    const mcp = {
      source: llmResult ? 'mcp-openai-clean-description' : 'mcp-stub',
      analyzedAt: new Date().toISOString(),
      s3Bucket: null,
      s3Key: null,
      title_candidates: titleCandidates,
      author_candidates: authorCandidates,
      language_guess: 'en',
    };

    await Book.update(bookId, existing.userId, { mcp_metadata: mcp });

    try {
      await publishEvent('Book.MCPAnalyzedCompleted', { bookId, userId: existing.userId });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[MCPAnalyze] Failed to publish MCPAnalyzedCompleted:', e.message);
    }

    return success({ bookId, analyzed: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[MCPAnalyze] Error:', e);
    return error(e.message || 'Failed to analyze image', 500);
  }
};
