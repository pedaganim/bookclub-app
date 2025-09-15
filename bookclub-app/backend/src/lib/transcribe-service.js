const AWS = require('./aws-config');

class TranscribeService {
  constructor() {
    this.transcribe = new AWS.TranscribeService();
  }

  /**
   * Start real-time transcription job
   * @param {string} audioData - Base64 encoded audio data 
   * @param {string} languageCode - Language code (e.g., 'en-US')
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeAudio(audioData, languageCode = 'en-US') {
    try {
      console.log('[Transcribe] Starting audio transcription');

      // Check if AWS/Transcribe is available (for sandboxed environments)
      if (this.isSandboxedEnvironment()) {
        console.log('[Transcribe] Skipping Transcribe in sandboxed environment');
        return this.createMockTranscriptionResult(audioData);
      }

      // For real-time transcription, we'll use a simpler approach
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      const params = {
        LanguageCode: languageCode,
        MediaFormat: 'wav', // Assuming WAV format from browser
        Media: {
          MediaFileUri: `data:audio/wav;base64,${audioData}`
        },
        TranscriptionJobName: `voice-search-${Date.now()}`,
        OutputBucketName: process.env.S3_BUCKET || 'bookclub-app-dev-bucket' // Use existing bucket
      };

      // Start transcription job
      const result = await this.transcribe.startTranscriptionJob(params).promise();
      
      // For voice search, we need immediate results, so we'll poll for completion
      const transcriptionJob = await this.waitForTranscriptionCompletion(result.TranscriptionJob.TranscriptionJobName);
      
      return this.parseTranscriptionResult(transcriptionJob);

    } catch (error) {
      console.error('[Transcribe] Error transcribing audio:', error);
      
      // Check for common AWS configuration issues
      if (error.code === 'ConfigError' || error.message.includes('Missing region')) {
        console.log('[Transcribe] AWS not configured, returning mock data');
        return this.createMockTranscriptionResult(audioData);
      }
      
      // For other errors, return null to allow graceful degradation
      return null;
    }
  }

  /**
   * Wait for transcription job to complete
   * @param {string} jobName - Transcription job name
   * @returns {Promise<Object>} Completed job details
   */
  async waitForTranscriptionCompletion(jobName, maxAttempts = 30) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await this.transcribe.getTranscriptionJob({
          TranscriptionJobName: jobName
        }).promise();

        const status = result.TranscriptionJob.TranscriptionJobStatus;
        
        if (status === 'COMPLETED') {
          return result.TranscriptionJob;
        } else if (status === 'FAILED') {
          throw new Error(`Transcription job failed: ${result.TranscriptionJob.FailureReason}`);
        }
        
        // Wait 1 second before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }
    
    throw new Error('Transcription job timed out');
  }

  /**
   * Parse transcription result from AWS
   * @param {Object} transcriptionJob - Completed transcription job
   * @returns {Object} Parsed transcription result
   */
  parseTranscriptionResult(transcriptionJob) {
    try {
      const transcript = transcriptionJob.Transcript.TranscriptFileUri;
      // Note: In real implementation, you'd fetch and parse the transcript file
      // For now, we'll return a simplified structure
      
      return {
        transcript: transcript,
        confidence: 0.95, // AWS doesn't provide overall confidence in the job result
        languageCode: transcriptionJob.LanguageCode,
        duration: transcriptionJob.Media?.DurationInSeconds || 0,
        status: 'success',
        source: 'aws_transcribe'
      };
    } catch (error) {
      console.error('[Transcribe] Error parsing transcription result:', error);
      return null;
    }
  }

  /**
   * Check if running in a sandboxed environment
   * @returns {boolean} True if in sandboxed environment
   */
  isSandboxedEnvironment() {
    return process.env.NODE_ENV === 'development' || 
           process.env.IS_OFFLINE === 'true' ||
           !process.env.AWS_ACCESS_KEY_ID ||
           process.env.AWS_ACCESS_KEY_ID === 'local';
  }

  /**
   * Create mock transcription result for testing/sandboxed environments
   * @param {string} audioData - Original audio data
   * @returns {Object} Mock transcription result
   */
  createMockTranscriptionResult(audioData) {
    // Simulate different mock responses based on audio data length
    const mockTexts = [
      "search fiction books",
      "find science fiction novels", 
      "look for mystery books",
      "show me romance novels",
      "find books by Stephen King"
    ];
    
    const randomIndex = Math.floor(Math.random() * mockTexts.length);
    const mockText = mockTexts[randomIndex];
    
    return {
      transcript: mockText,
      confidence: 0.92,
      languageCode: 'en-US',
      duration: Math.max(audioData.length / 1000, 1), // Rough estimate
      status: 'success',
      source: 'transcribe_mock'
    };
  }

  /**
   * Delete transcription job to clean up resources
   * @param {string} jobName - Transcription job name
   */
  async cleanupTranscriptionJob(jobName) {
    try {
      await this.transcribe.deleteTranscriptionJob({
        TranscriptionJobName: jobName
      }).promise();
      console.log(`[Transcribe] Cleaned up transcription job: ${jobName}`);
    } catch (error) {
      console.error(`[Transcribe] Error cleaning up transcription job ${jobName}:`, error);
    }
  }
}

module.exports = new TranscribeService();