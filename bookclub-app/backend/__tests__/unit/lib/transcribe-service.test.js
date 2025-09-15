const transcribeService = require('../../../src/lib/transcribe-service');

// Mock AWS SDK
jest.mock('../../../src/lib/aws-config', () => {
  return {
    TranscribeService: jest.fn().mockImplementation(() => ({
      startTranscriptionJob: jest.fn(),
      getTranscriptionJob: jest.fn(),
      deleteTranscriptionJob: jest.fn()
    }))
  };
});

const AWS = require('../../../src/lib/aws-config');

describe('TranscribeService', () => {
  let mockTranscribe;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get the mocked Transcribe instance - access via the service's instance
    mockTranscribe = {
      startTranscriptionJob: jest.fn(),
      getTranscriptionJob: jest.fn(),
      deleteTranscriptionJob: jest.fn()
    };
    
    // Replace the transcribe instance
    transcribeService.transcribe = mockTranscribe;
    
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.IS_OFFLINE;
    delete process.env.AWS_ACCESS_KEY_ID;
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NODE_ENV;
    delete process.env.IS_OFFLINE;
    delete process.env.AWS_ACCESS_KEY_ID;
  });

  describe('transcribeAudio', () => {
    it('should successfully transcribe audio in production environment', async () => {
      // Set up production environment
      process.env.NODE_ENV = 'production';
      process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';

      const mockJobResult = {
        TranscriptionJob: {
          TranscriptionJobName: 'voice-search-123456789'
        }
      };

      const mockCompletedJob = {
        TranscriptionJob: {
          TranscriptionJobStatus: 'COMPLETED',
          Transcript: {
            TranscriptFileUri: 'https://s3.amazonaws.com/bucket/transcript.json'
          },
          LanguageCode: 'en-US',
          Media: {
            DurationInSeconds: 3.5
          }
        }
      };

      mockTranscribe.startTranscriptionJob.mockReturnValue({
        promise: () => Promise.resolve(mockJobResult)
      });

      mockTranscribe.getTranscriptionJob.mockReturnValue({
        promise: () => Promise.resolve(mockCompletedJob)
      });

      const result = await transcribeService.transcribeAudio('dGVzdCBhdWRpbyBkYXRh', 'en-US');

      expect(mockTranscribe.startTranscriptionJob).toHaveBeenCalledWith(
        expect.objectContaining({
          LanguageCode: 'en-US',
          MediaFormat: 'wav',
          TranscriptionJobName: expect.stringMatching(/^voice-search-\d+$/),
          Media: {
            MediaFileUri: 'data:audio/wav;base64,dGVzdCBhdWRpbyBkYXRh'
          }
        })
      );

      expect(result).toEqual({
        transcript: 'https://s3.amazonaws.com/bucket/transcript.json',
        confidence: 0.95,
        languageCode: 'en-US',
        duration: 3.5,
        status: 'success',
        source: 'aws_transcribe'
      });
    });

    it('should handle transcription job failure', async () => {
      // Set up production environment
      process.env.NODE_ENV = 'production';
      process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';

      const mockJobResult = {
        TranscriptionJob: {
          TranscriptionJobName: 'voice-search-123456789'
        }
      };

      const mockFailedJob = {
        TranscriptionJob: {
          TranscriptionJobStatus: 'FAILED',
          FailureReason: 'Audio quality too low'
        }
      };

      mockTranscribe.startTranscriptionJob.mockReturnValue({
        promise: () => Promise.resolve(mockJobResult)
      });

      mockTranscribe.getTranscriptionJob.mockReturnValue({
        promise: () => Promise.resolve(mockFailedJob)
      });

      const result = await transcribeService.transcribeAudio('dGVzdCBhdWRpbyBkYXRh');

      expect(result).toBeNull();
    });

    it('should return mock data in sandboxed environment', async () => {
      // Set up sandboxed environment
      process.env.NODE_ENV = 'development';
      process.env.IS_OFFLINE = 'true';

      console.log = jest.fn(); // Mock console.log to avoid output

      const result = await transcribeService.transcribeAudio('dGVzdCBhdWRpbyBkYXRh');

      expect(console.log).toHaveBeenCalledWith('[Transcribe] Skipping Transcribe in sandboxed environment');
      expect(result).toEqual(
        expect.objectContaining({
          transcript: expect.any(String),
          confidence: 0.92,
          languageCode: 'en-US',
          status: 'success',
          source: 'transcribe_mock'
        })
      );

      // Should not call AWS APIs
      expect(mockTranscribe.startTranscriptionJob).not.toHaveBeenCalled();
    });

    it('should handle AWS configuration errors gracefully', async () => {
      // Set up production environment but simulate config error
      process.env.NODE_ENV = 'production';
      process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';

      mockTranscribe.startTranscriptionJob.mockReturnValue({
        promise: () => Promise.reject(new Error('Missing region'))
      });

      console.log = jest.fn(); // Mock console.log
      console.error = jest.fn(); // Mock console.error

      const result = await transcribeService.transcribeAudio('dGVzdCBhdWRpbyBkYXRh');

      expect(console.error).toHaveBeenCalledWith(
        '[Transcribe] Error transcribing audio:', 
        expect.any(Error)
      );
      expect(console.log).toHaveBeenCalledWith('[Transcribe] AWS not configured, returning mock data');
      
      expect(result).toEqual(
        expect.objectContaining({
          transcript: expect.any(String),
          confidence: 0.92,
          languageCode: 'en-US',
          status: 'success',
          source: 'transcribe_mock'
        })
      );
    });

    it('should handle generic AWS errors by returning null', async () => {
      // Set up production environment
      process.env.NODE_ENV = 'production';
      process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';

      mockTranscribe.startTranscriptionJob.mockReturnValue({
        promise: () => Promise.reject(new Error('Generic AWS error'))
      });

      console.error = jest.fn(); // Mock console.error

      const result = await transcribeService.transcribeAudio('dGVzdCBhdWRpbyBkYXRh');

      expect(console.error).toHaveBeenCalledWith(
        '[Transcribe] Error transcribing audio:', 
        expect.any(Error)
      );
      expect(result).toBeNull();
    });
  });

  describe('isSandboxedEnvironment', () => {
    it('should return true for development environment', () => {
      process.env.NODE_ENV = 'development';
      expect(transcribeService.isSandboxedEnvironment()).toBe(true);
    });

    it('should return true when IS_OFFLINE is true', () => {
      process.env.IS_OFFLINE = 'true';
      expect(transcribeService.isSandboxedEnvironment()).toBe(true);
    });

    it('should return true when AWS_ACCESS_KEY_ID is not set', () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      expect(transcribeService.isSandboxedEnvironment()).toBe(true);
    });

    it('should return true when AWS_ACCESS_KEY_ID is local', () => {
      process.env.AWS_ACCESS_KEY_ID = 'local';
      expect(transcribeService.isSandboxedEnvironment()).toBe(true);
    });

    it('should return false in production environment with proper config', () => {
      process.env.NODE_ENV = 'production';
      process.env.IS_OFFLINE = 'false';
      process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
      expect(transcribeService.isSandboxedEnvironment()).toBe(false);
    });
  });

  describe('createMockTranscriptionResult', () => {
    it('should create mock transcription result with expected structure', () => {
      const result = transcribeService.createMockTranscriptionResult('dGVzdCBhdWRpbyBkYXRh');

      expect(result).toEqual({
        transcript: expect.any(String),
        confidence: 0.92,
        languageCode: 'en-US',
        duration: expect.any(Number),
        status: 'success',
        source: 'transcribe_mock'
      });

      // Check that transcript is one of the expected mock texts
      const expectedTexts = [
        "search fiction books",
        "find science fiction novels", 
        "look for mystery books",
        "show me romance novels",
        "find books by Stephen King"
      ];
      expect(expectedTexts).toContain(result.transcript);
    });
  });
});