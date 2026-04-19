const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const AWS = require('aws-sdk');
const sharp = require('sharp');

// Simple helper to fetch an image from S3 and analyze it with a Bedrock vision LLM (Claude 3 family).
// Returns a normalized metadata object.
// Env:
// - BEDROCK_MODEL_ID (e.g., 'anthropic.claude-3-5-sonnet-20240620-v1:0' or 'anthropic.claude-3-haiku-20240307-v1:0')
// - AWS_REGION (fallback to us-east-1)
// - BOOK_COVERS_BUCKET (default bucket if not provided)

function getS3Client() {
  return new AWS.S3({ apiVersion: '2006-03-01' });
}

function getBedrockClient() {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  // Increase maxAttempts so SDK retries throttles internally too
  const maxAttempts = parseInt(process.env.BEDROCK_MAX_ATTEMPTS || '8', 10);
  return new BedrockRuntimeClient({ region, maxAttempts });
}

// Simple retry with exponential backoff + jitter for Bedrock throttling
async function withRetry(fn, { maxAttempts, baseMs } = {}) {
  const envMax = parseInt(process.env.BEDROCK_MAX_ATTEMPTS || '8', 10);
  const envBase = parseInt(process.env.BEDROCK_BACKOFF_BASE_MS || '500', 10);
  const baseJitter = parseInt(process.env.BEDROCK_BACKOFF_BASE_JITTER_MS || '0', 10);
  const initialDelay = parseInt(process.env.BEDROCK_INITIAL_DELAY_MS || '0', 10);
  const maxCap = parseInt(process.env.BEDROCK_BACKOFF_MAX_MS || '15000', 10);
  maxAttempts = maxAttempts || envMax;
  baseMs = baseMs || envBase;
  // Randomize base to spread callers (e.g., 2000-3000ms when base=2000 and jitter=1000)
  const baseEffective = baseMs + (baseJitter > 0 ? Math.floor(Math.random() * baseJitter) : 0);
  let attempt = 0;
  // Optional fixed delay before the first attempt
  if (initialDelay > 0) {
    await new Promise(r => setTimeout(r, initialDelay));
  }
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const code = err?.name || err?.code || '';
      const retryable = code === 'ThrottlingException' || code === 'TooManyRequestsException' || err?.$metadata?.httpStatusCode === 429;
      attempt += 1;
      if (!retryable || attempt >= maxAttempts) throw err;
      const backoff = baseEffective * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 0.4 * backoff);
      const delay = Math.min(maxCap, Math.floor(0.8 * backoff) + jitter);
      // eslint-disable-next-line no-console
      console.warn(`[Bedrock] Throttled, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function getS3ObjectBytes(bucket, key) {
  const s3 = getS3Client();
  const resp = await s3.getObject({ Bucket: bucket, Key: key }).promise();
  return Buffer.isBuffer(resp.Body) ? resp.Body : Buffer.from(resp.Body);
}

function toBase64Image(bytes, contentType) {
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: contentType || 'image/jpeg',
      data: bytes.toString('base64'),
    },
  };
}

// Estimate Base64 length without actually encoding: ceil(n/3)*4
function estimateBase64Length(byteLength) {
  return Math.ceil(byteLength / 3) * 4;
}

// Normalize model output to a strict JSON shape.
function normalizeMetadata(obj = {}) {
  const mapAgeFine = (v) => {
    switch (String(v || '').toLowerCase()) {
      case 'children': return 'early_reader';
      case 'middle_grade': return 'middle_grade';
      case 'young_adult': return 'young_adult';
      case 'adult': return 'adult';
      case 'all_ages': return null;
      default: return null;
    }
  };
  return {
    title_candidates: Array.isArray(obj.title_candidates) ? obj.title_candidates : [],
    author_candidates: Array.isArray(obj.author_candidates) ? obj.author_candidates : [],
    categories: Array.isArray(obj.categories) ? obj.categories : [],
    age_group: typeof obj.age_group === 'string' ? obj.age_group : null,
    ageGroupFine: mapAgeFine(obj.age_group),
    audience: Array.isArray(obj.audience) ? obj.audience : [],
    themes: Array.isArray(obj.themes) ? obj.themes : [],
    content_warnings: Array.isArray(obj.content_warnings) ? obj.content_warnings : [],
    language_guess: typeof obj.language_guess === 'string' ? obj.language_guess : undefined,
    description: typeof obj.description === 'string' ? obj.description : undefined,
    // Fallbacks if model returns simpler fields
    title_guess: typeof obj.title === 'string' ? obj.title : (typeof obj.book_title === 'string' ? obj.book_title : undefined),
    authors_guess: Array.isArray(obj.authors) ? obj.authors : (typeof obj.author === 'string' ? [obj.author] : (Array.isArray(obj.author_name) ? obj.author_name : [])),
    source: 'bedrock_claude3',
  };
}

// MIME types Bedrock/Claude natively accepts
const BEDROCK_SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

async function analyzeUniversalItemImage({ bucket, key, contentType = 'image/jpeg', instruction, modelId }) {
  modelId = modelId || process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0';
  const client = getBedrockClient();
  let bytes = await getS3ObjectBytes(bucket, key);

  // Normalise image/jpg → image/jpeg
  if (contentType === 'image/jpg') contentType = 'image/jpeg';

  // Convert unsupported types (HEIC, HEIF, TIFF, BMP, …) to JPEG before sending to Bedrock
  if (!BEDROCK_SUPPORTED_TYPES.includes(contentType)) {
    try {
      bytes = await sharp(bytes, { failOnError: false }).jpeg({ quality: 85 }).toBuffer();
      contentType = 'image/jpeg';
      console.log(`[Bedrock] Converted ${contentType} → image/jpeg for Bedrock compatibility`);
    } catch (e) {
      console.warn('[Bedrock] Could not convert image to JPEG, proceeding with original bytes:', e?.message);
    }
  }

  // Bedrock image limit guard
  const BASE64_MAX = 5 * 1024 * 1024;
  try {
    const overLimit = () => estimateBase64Length(bytes.length) > BASE64_MAX;
    if (overLimit()) {
      let width = 1600;
      let quality = 80;
      for (let i = 0; i < 8; i++) {
        const out = await sharp(bytes, { failOnError: false })
          .resize({ width: Math.max(640, Math.floor(width)), withoutEnlargement: true })
          .jpeg({ quality: Math.max(40, Math.floor(quality)), mozjpeg: true })
          .toBuffer();
        bytes = out;
        contentType = 'image/jpeg';
        if (estimateBase64Length(out.length) <= BASE64_MAX) break;
        width = width * 0.8;
        quality = quality * 0.85;
      }
    }
  } catch (e) {
    console.warn('[Bedrock] Image compression failed:', e?.message);
  }

  const systemPrompt =
    'You are a universal community library assistant. Your task is to analyze an image of an item (book, toy, tool, game, etc.) and extract metadata. ' +
    'FIRST, identify the category of the item from this list: [book, toy, tool, game, event_hire, other]. ' +
    'SECOND, extract the title and a 1-3 sentence description. ' +
    'Return ONLY strict JSON (no commentary) with this shape: ' +
    '{"category":"string","title":"string","description":"string","author":"string|null","ageRange":"string|null"}. ' +
    'Rules: ' +
    '1. For books, "author" is the writer. For other items, set "author" to null. ' +
    '2. "ageRange" is only for books, toys or games where applicable (e.g. "3-5 years" or "Adult"). ' +
    '3. Do NOT include condition or player count.';

  const userText = instruction || 'Analyze this item image and extract metadata as strict JSON.';

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: systemPrompt + '\n' + userText },
          toBase64Image(bytes, contentType),
        ],
      },
    ],
  });

  const cmd = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  });

  const res = await withRetry(() => client.send(cmd));
  const json = JSON.parse(new TextDecoder().decode(res.body));
  const text = Array.isArray(json.content) && json.content[0]?.text ? json.content[0].text : '';

  let parsed = {};
  try {
    const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    parsed = JSON.parse(clean);
  } catch (e) {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (_) {}
  }

  return {
    category: parsed.category || 'other',
    title: typeof parsed.title === 'string' ? parsed.title.trim() : (parsed.title_guess || 'Unknown Item'),
    description: typeof parsed.description === 'string' ? parsed.description.trim() : undefined,
    author: typeof parsed.author === 'string' ? parsed.author.trim() : null,
    ageRange: typeof parsed.ageRange === 'string' ? parsed.ageRange : null,
    raw: parsed,
    source: 'bedrock_universal_v1'
  };
}

module.exports = {
  analyzeUniversalItemImage,
};

