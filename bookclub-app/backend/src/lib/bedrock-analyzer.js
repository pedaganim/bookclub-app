const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const AWS = require('aws-sdk');

// Simple helper to fetch an image from S3 and analyze it with a Bedrock vision LLM (Claude 3 family).
// Returns a normalized metadata object.
// Env:
// - BEDROCK_MODEL_ID (e.g., 'anthropic.claude-3-5-sonnet-20240620-v1:0' or 'anthropic.claude-3-haiku-20240307-v1:0')
// - AWS_REGION (fallback to us-east-1)
// - BOOK_COVERS_BUCKET (default bucket if not provided)

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

function getBedrockClient() {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  // Increase maxAttempts so SDK retries throttles internally too
  return new BedrockRuntimeClient({ region, maxAttempts: 6 });
}

// Simple retry with exponential backoff + jitter for Bedrock throttling
async function withRetry(fn, { maxAttempts = 6, baseMs = 300 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const code = err?.name || err?.code || '';
      const retryable = code === 'ThrottlingException' || code === 'TooManyRequestsException' || err?.$metadata?.httpStatusCode === 429;
      attempt += 1;
      if (!retryable || attempt >= maxAttempts) throw err;
      const backoff = baseMs * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 0.4 * backoff);
      const delay = Math.min(5000, Math.floor(0.8 * backoff) + jitter);
      // eslint-disable-next-line no-console
      console.warn(`[Bedrock] Throttled, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function getS3ObjectBytes(bucket, key) {
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

// Normalize model output to a strict JSON shape.
function normalizeMetadata(obj = {}) {
  return {
    title_candidates: Array.isArray(obj.title_candidates) ? obj.title_candidates : [],
    author_candidates: Array.isArray(obj.author_candidates) ? obj.author_candidates : [],
    categories: Array.isArray(obj.categories) ? obj.categories : [],
    age_group: typeof obj.age_group === 'string' ? obj.age_group : null,
    audience: Array.isArray(obj.audience) ? obj.audience : [],
    themes: Array.isArray(obj.themes) ? obj.themes : [],
    content_warnings: Array.isArray(obj.content_warnings) ? obj.content_warnings : [],
    language_guess: typeof obj.language_guess === 'string' ? obj.language_guess : undefined,
    description: typeof obj.description === 'string' ? obj.description : undefined,
    source: 'bedrock_claude3',
  };
}

async function analyzeCoverImage({ bucket, key, contentType = 'image/jpeg', instruction }) {
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
  const client = getBedrockClient();
  const bytes = await getS3ObjectBytes(bucket, key);

  const systemPrompt =
    'You are analyzing a book cover image. Extract STRICT JSON with the following shape (no commentary): ' +
    '{"title_candidates":[{"value":"string","confidence":0..1}],"author_candidates":[{"value":"string","confidence":0..1}],"categories":["string"],"age_group":"children|middle_grade|young_adult|adult|all_ages","audience":["string"],"themes":["string"],"content_warnings":["string"],"language_guess":"string","description":"string"}. ' +
    'Rules: Title candidates exclude subtitles. Authors are names. Categories are 3-6 high-level genres. Age group from the enum. Audience like parents/educators/etc. Themes like friendship/self-discovery. Content warnings if present. Description should be a concise 1-3 sentence summary suitable for a catalog.';

  const userText = instruction || 'Analyze this book cover image and extract metadata as strict JSON.';

  // Claude 3 Bedrock format
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

  // Claude 3 returns { content: [{ type: 'text', text: '...'}] }
  const text = Array.isArray(json.content) && json.content[0] && json.content[0].text ? json.content[0].text : '';
  // Safe debug logging of raw text (truncated)
  try {
    const snippet = (text || '').slice(0, 500);
    // eslint-disable-next-line no-console
    console.log('[Bedrock] Raw text (truncated 500):', snippet);
  } catch (_) {}

  // Try to parse model's text as JSON
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { parsed = {}; }

  // Safe debug logging of parsed JSON (truncated)
  try {
    const serialized = JSON.stringify(parsed);
    const truncated = serialized.length > 1200 ? (serialized.slice(0, 1200) + '...') : serialized;
    // eslint-disable-next-line no-console
    console.log('[Bedrock] Parsed JSON (truncated 1200):', truncated);
  } catch (_) {}
  return normalizeMetadata(parsed);
}

module.exports = {
  analyzeCoverImage,
};
