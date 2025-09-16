const response = require('../../lib/response');
const transcribeService = require('../../lib/transcribe-service');

/**
 * Handle voice transcription requests
 */
exports.handler = async (event) => {
  console.log('Voice transcription request:', {
    httpMethod: event.httpMethod,
    headers: event.headers,
    hasBody: !!event.body
  });

  try {
    if (event.httpMethod === 'OPTIONS') {
      return preflightOk();
    }

    if (event.httpMethod !== 'POST') {
      return response.methodNotAllowed();
    }

    const body = parseJsonBody(event.body);
    if (!body) {
      return badRequest('Request body is required');
    }

    const { audioData, languageCode = 'en-US' } = body;
    const validationError = validateAudioData(audioData);
    if (validationError) return validationError;

    console.log('[VoiceTranscribe] Processing audio transcription request');

    const transcriptionResult = await transcribeService.transcribeAudio(audioData, languageCode);
    if (!transcriptionResult) {
      return internalError('Failed to transcribe audio. Please try again.');
    }

    console.log('[VoiceTranscribe] Transcription completed:', {
      transcript: transcriptionResult.transcript,
      confidence: transcriptionResult.confidence,
      source: transcriptionResult.source
    });

    return ok({
      transcript: transcriptionResult.transcript,
      confidence: transcriptionResult.confidence,
      languageCode: transcriptionResult.languageCode,
      duration: transcriptionResult.duration,
      source: transcriptionResult.source
    });

  } catch (error) {
    console.error('[VoiceTranscribe] Error in voice transcription handler:', error);
    return internalError('An error occurred while processing your voice input. Please try again.',
      process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
};

// --- Helpers ---
const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});

const preflightOk = () => ({
  statusCode: 200,
  headers: corsHeaders(),
  body: JSON.stringify({ message: 'OK' })
});

const ok = (bodyObj) => ({
  statusCode: 200,
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(bodyObj),
});

const badRequest = (message) => ({
  statusCode: 400,
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ error: message }),
});

const internalError = (message, details) => ({
  statusCode: 500,
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify({ error: message, details }),
});

const parseJsonBody = (body) => {
  if (body === undefined || body === null) return null;
  if (typeof body === 'string' && body.trim().length === 0) {
    throw new Error('Malformed JSON');
  }
  try {
    return JSON.parse(body);
  } catch (e) {
    // Bubble up to trigger 500 per legacy test expectations
    throw new Error('Malformed JSON');
  }
};

const validateAudioData = (audioData) => {
  if (!audioData) return badRequest('audioData is required');
  if (typeof audioData !== 'string') return badRequest('audioData must be a base64 encoded string');
  return null;
};