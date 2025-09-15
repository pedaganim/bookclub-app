import { voiceSearchService } from '../../services/voiceSearchService';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    request: jest.fn()
  }
}));

describe('VoiceSearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isSupported', () => {
    it('should return false when MediaRecorder is not available', () => {
      const originalMediaRecorder = window.MediaRecorder;
      // @ts-ignore
      delete window.MediaRecorder;
      
      expect(voiceSearchService.isSupported()).toBe(false);
      
      window.MediaRecorder = originalMediaRecorder;
    });

    it('should return false when navigator.mediaDevices is not available', () => {
      const originalMediaDevices = navigator.mediaDevices;
      // @ts-ignore
      delete navigator.mediaDevices;
      
      expect(voiceSearchService.isSupported()).toBe(false);
      
      // Restore using Object.defineProperty since mediaDevices is read-only
      Object.defineProperty(navigator, 'mediaDevices', {
        value: originalMediaDevices,
        writable: true,
        configurable: true
      });
    });
  });

  describe('isWebSpeechSupported', () => {
    it('should return false when SpeechRecognition is not available', () => {
      const originalSpeechRecognition = window.SpeechRecognition;
      const originalWebkitSpeechRecognition = window.webkitSpeechRecognition;
      
      // @ts-ignore
      delete window.SpeechRecognition;
      // @ts-ignore
      delete window.webkitSpeechRecognition;
      
      expect(voiceSearchService.isWebSpeechSupported()).toBe(false);
      
      window.SpeechRecognition = originalSpeechRecognition;
      window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
    });
  });

  describe('transcribeWithWebSpeech', () => {
    it('should reject when Web Speech API is not supported', async () => {
      const originalSpeechRecognition = window.SpeechRecognition;
      const originalWebkitSpeechRecognition = window.webkitSpeechRecognition;
      
      // @ts-ignore
      delete window.SpeechRecognition;
      // @ts-ignore
      delete window.webkitSpeechRecognition;

      await expect(voiceSearchService.transcribeWithWebSpeech()).rejects.toThrow(
        'Web Speech API is not supported in this browser'
      );

      window.SpeechRecognition = originalSpeechRecognition;
      window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
    });
  });

  describe('startRecording', () => {
    it('should throw error when getUserMedia fails', async () => {
      const mockGetUserMedia = jest.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: mockGetUserMedia
        },
        writable: true
      });

      await expect(voiceSearchService.startRecording()).rejects.toThrow(
        'Could not access microphone. Please ensure microphone permissions are granted.'
      );
    });
  });
});