const { handler } = require('../../../../src/handlers/voice/transcribe');

// Mock the transcribe service
jest.mock('../../../../src/lib/transcribe-service');
const transcribeService = require('../../../../src/lib/transcribe-service');

describe('Voice Transcribe Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful transcription', async () => {
    const mockTranscriptionResult = {
      transcript: 'search fiction books',
      confidence: 0.95,
      languageCode: 'en-US',
      duration: 2.5,
      source: 'aws_transcribe'
    };

    transcribeService.transcribeAudio.mockResolvedValue(mockTranscriptionResult);

    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        audioData: 'dGVzdCBhdWRpbyBkYXRh',
        languageCode: 'en-US'
      })
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toEqual({
      transcript: 'search fiction books',
      confidence: 0.95,
      languageCode: 'en-US',
      duration: 2.5,
      source: 'aws_transcribe'
    });

    expect(transcribeService.transcribeAudio).toHaveBeenCalledWith('dGVzdCBhdWRpbyBkYXRh', 'en-US');
  });

  it('should handle CORS preflight requests', async () => {
    const event = {
      httpMethod: 'OPTIONS',
      headers: {},
      body: null
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toEqual({ message: 'OK' });
    expect(result.headers).toEqual({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
  });

  it('should reject non-POST requests', async () => {
    const event = {
      httpMethod: 'GET',
      headers: {},
      body: null
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(405);
    const body = JSON.parse(result.body);
    expect(body).toEqual({ 
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed'
      }
    });
  });

  it('should reject requests without body', async () => {
    const event = {
      httpMethod: 'POST',
      headers: {},
      body: null
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body).toEqual({ error: 'Request body is required' });
  });

  it('should reject requests without audioData', async () => {
    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        languageCode: 'en-US'
      })
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body).toEqual({ error: 'audioData is required' });
  });

  it('should reject requests with invalid audioData type', async () => {
    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        audioData: 123,
        languageCode: 'en-US'
      })
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body).toEqual({ error: 'audioData must be a base64 encoded string' });
  });

  it('should use default language code when not provided', async () => {
    const mockTranscriptionResult = {
      transcript: 'search fiction books',
      confidence: 0.95,
      languageCode: 'en-US',
      duration: 2.5,
      source: 'aws_transcribe'
    };

    transcribeService.transcribeAudio.mockResolvedValue(mockTranscriptionResult);

    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        audioData: 'dGVzdCBhdWRpbyBkYXRh'
      })
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(transcribeService.transcribeAudio).toHaveBeenCalledWith('dGVzdCBhdWRpbyBkYXRh', 'en-US');
  });

  it('should handle transcription service failure', async () => {
    transcribeService.transcribeAudio.mockResolvedValue(null);

    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        audioData: 'dGVzdCBhdWRpbyBkYXRh'
      })
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body).toEqual({ 
      error: 'Failed to transcribe audio. Please try again.' 
    });
  });

  it('should handle transcription service errors', async () => {
    transcribeService.transcribeAudio.mockRejectedValue(new Error('Service error'));

    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        audioData: 'dGVzdCBhdWRpbyBkYXRh'
      })
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('An error occurred while processing your voice input. Please try again.');
  });

  it('should handle malformed JSON in request body', async () => {
    const event = {
      httpMethod: 'POST',
      headers: {},
      body: 'invalid json'
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error).toBe('An error occurred while processing your voice input. Please try again.');
  });
});