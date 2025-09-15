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
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: JSON.stringify({ message: 'OK' })
      };
    }

    if (event.httpMethod !== 'POST') {
      return response.methodNotAllowed();
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Request body is required' })
      };
    }

    const { audioData, languageCode = 'en-US' } = JSON.parse(event.body);

    if (!audioData) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'audioData is required' })
      };
    }

    // Validate audio data format (should be base64)
    if (typeof audioData !== 'string') {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'audioData must be a base64 encoded string' })
      };
    }

    console.log('[VoiceTranscribe] Processing audio transcription request');

    // Transcribe the audio
    const transcriptionResult = await transcribeService.transcribeAudio(audioData, languageCode);

    if (!transcriptionResult) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Failed to transcribe audio. Please try again.' 
        })
      };
    }

    console.log('[VoiceTranscribe] Transcription completed:', {
      transcript: transcriptionResult.transcript,
      confidence: transcriptionResult.confidence,
      source: transcriptionResult.source
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        transcript: transcriptionResult.transcript,
        confidence: transcriptionResult.confidence,
        languageCode: transcriptionResult.languageCode,
        duration: transcriptionResult.duration,
        source: transcriptionResult.source
      })
    };

  } catch (error) {
    console.error('[VoiceTranscribe] Error in voice transcription handler:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'An error occurred while processing your voice input. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};