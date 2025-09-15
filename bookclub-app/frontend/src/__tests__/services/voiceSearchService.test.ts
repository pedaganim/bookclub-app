import { voiceSearchService } from '../../services/voiceSearchService';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    request: jest.fn()
  }
}));

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia
  },
  writable: true
});

// Mock MediaRecorder
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null,
  onstop: null,
  onerror: null,
  state: 'inactive'
};

Object.defineProperty(window, 'MediaRecorder', {
  value: jest.fn().mockImplementation(() => mockMediaRecorder),
  writable: true
});

// Mock SpeechRecognition
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  onresult: null,
  onerror: null,
  onend: null,
  continuous: false,
  interimResults: false,
  lang: 'en-US',
  maxAlternatives: 1
};

Object.defineProperty(window, 'SpeechRecognition', {
  value: jest.fn().mockImplementation(() => mockSpeechRecognition),
  writable: true
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
  value: jest.fn().mockImplementation(() => mockSpeechRecognition),
  writable: true
});

describe('VoiceSearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMediaRecorder.state = 'inactive';
  });

  describe('isSupported', () => {
    it('should return true when all required APIs are available', () => {
      expect(voiceSearchService.isSupported()).toBe(true);
    });

    it('should return false when MediaRecorder is not available', () => {
      const originalMediaRecorder = window.MediaRecorder;
      // @ts-ignore
      delete window.MediaRecorder;
      
      expect(voiceSearchService.isSupported()).toBe(false);
      
      window.MediaRecorder = originalMediaRecorder;
    });
  });

  describe('isWebSpeechSupported', () => {
    it('should return true when SpeechRecognition is available', () => {
      expect(voiceSearchService.isWebSpeechSupported()).toBe(true);
    });

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

  describe('startRecording', () => {
    it('should successfully start recording', async () => {
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }]
      };
      mockGetUserMedia.mockResolvedValue(mockStream);

      await voiceSearchService.startRecording();

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      expect(window.MediaRecorder).toHaveBeenCalledWith(mockStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      expect(mockMediaRecorder.start).toHaveBeenCalled();
    });

    it('should throw error when getUserMedia fails', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

      await expect(voiceSearchService.startRecording()).rejects.toThrow(
        'Could not access microphone. Please ensure microphone permissions are granted.'
      );
    });
  });

  describe('transcribeWithWebSpeech', () => {
    it('should successfully transcribe with Web Speech API', async () => {
      const mockTranscript = 'search fiction books';
      
      const transcriptionPromise = voiceSearchService.transcribeWithWebSpeech();
      
      // Simulate successful recognition
      setTimeout(() => {
        mockSpeechRecognition.onresult({
          results: [{
            0: { transcript: mockTranscript }
          }]
        });
      }, 10);

      const result = await transcriptionPromise;
      expect(result).toBe(mockTranscript);
      expect(mockSpeechRecognition.start).toHaveBeenCalled();
    });

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

    it('should handle speech recognition errors', async () => {
      const transcriptionPromise = voiceSearchService.transcribeWithWebSpeech();
      
      // Simulate error
      setTimeout(() => {
        mockSpeechRecognition.onerror({ error: 'network' });
      }, 10);

      await expect(transcriptionPromise).rejects.toThrow('Speech recognition failed: network');
    });
  });

  describe('cancelRecording', () => {
    it('should stop recording and cleanup resources', () => {
      const mockStream = {
        getTracks: () => [{ stop: jest.fn() }]
      };
      
      // Simulate active recording
      mockMediaRecorder.state = 'recording';
      voiceSearchService['stream'] = mockStream as any;
      
      voiceSearchService.cancelRecording();
      
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });
  });
});