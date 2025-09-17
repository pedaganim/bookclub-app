const Book = require('../../models/book');
const { success, error } = require('../../lib/response');
const { publishEvent } = require('../../lib/event-bus');

// MCP OCR analyzer orchestrator: invokes containerized OCR worker if present; falls back to stub.
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

    // Resolve image location
    let { s3Bucket, s3Key } = existing;
    if (!s3Bucket || !s3Key) {
      const coverImage = existing.coverImage;
      if (typeof coverImage === 'string') {
        try {
          const url = new URL(coverImage);
          const hostMatch = url.hostname.match(/^(.*)\.s3\.amazonaws\.com$/);
          if (hostMatch && hostMatch[1]) {
            s3Bucket = hostMatch[1];
            s3Key = decodeURIComponent(url.pathname.replace(/^\//, ''));
          }
        } catch (_) {}
      }
    }

    // If OCR worker is configured, invoke it
    let workerResult = null;
    const workerName = process.env.MCP_OCR_WORKER_NAME;
    if (workerName && process.env.NODE_ENV !== 'test') {
      try {
        const AWS = require('aws-sdk');
        const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });
        const invokeRes = await lambda.invoke({
          FunctionName: workerName,
          InvocationType: 'RequestResponse',
          Payload: JSON.stringify({ s3Bucket, s3Key, imageUrl: existing.coverImage }),
        }).promise();
        if (invokeRes.Payload) {
          const parsed = JSON.parse(invokeRes.Payload);
          if (parsed && parsed.title_candidates) {
            workerResult = parsed;
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[MCPAnalyze] OCR worker invoke failed, falling back to stub:', e.message);
      }
    }

    // Stub OCR result or worker fallback: use existing title/author or google metadata as candidates
    const gm = existing.google_metadata || {};
    const gmTitle = gm.title || (gm.volumeInfo && gm.volumeInfo.title);
    const gmAuthors = gm.authors || (gm.volumeInfo && gm.volumeInfo.authors) || [];

    const titleCandidates = workerResult?.title_candidates ? workerResult.title_candidates.slice(0, 5) : [];
    if (existing.title) titleCandidates.push({ value: existing.title, confidence: 0.6 });
    if (gmTitle && (!existing.title || existing.title !== gmTitle)) titleCandidates.push({ value: gmTitle, confidence: 0.5 });

    const authorCandidates = workerResult?.author_candidates ? workerResult.author_candidates.slice(0, 5) : [];
    if (existing.author) authorCandidates.push({ value: existing.author, confidence: 0.6 });
    if (Array.isArray(gmAuthors) && gmAuthors.length) authorCandidates.push({ value: gmAuthors.join(', '), confidence: 0.5 });

    const mcp = {
      source: workerResult ? 'mcp-ocr-worker' : 'mcp-stub',
      analyzedAt: new Date().toISOString(),
      s3Bucket: s3Bucket || null,
      s3Key: s3Key || null,
      title_candidates: titleCandidates,
      author_candidates: authorCandidates,
      language_guess: workerResult?.language_guess || 'en',
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
