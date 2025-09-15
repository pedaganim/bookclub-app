import { apiService } from './api';

export interface VoiceSearchResult {
  transcript: string;
  confidence: number;
  languageCode: string;
  duration: number;
  source: string;
}

export interface VoiceSearchError {
  message: string;
  code?: string;
}

class VoiceSearchService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  /**
   * Check if voice search is supported in the current browser
   */
  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  /**
   * Check if Web Speech API is supported (for real-time transcription)
   */
  isWebSpeechSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Start recording voice input
   */
  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimize for speech recognition
        } 
      });

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus' // Good compression for speech
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      throw new Error('Could not access microphone. Please ensure microphone permissions are granted.');
    }
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.cleanup();
        reject(new Error('Recording failed'));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel current recording
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  /**
   * Clean up recording resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Convert audio blob to base64 for API transmission
   */
  private async audioToBase64(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]; // Remove data:audio/webm;base64, prefix
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to convert audio to base64'));
      reader.readAsDataURL(audioBlob);
    });
  }

  /**
   * Transcribe audio using AWS Transcribe service
   */
  async transcribeAudio(audioBlob: Blob, languageCode: string = 'en-US'): Promise<VoiceSearchResult> {
    try {
      const base64Audio = await this.audioToBase64(audioBlob);
      
      const response = await apiService.request<VoiceSearchResult>('/voice/transcribe', {
        method: 'POST',
        body: JSON.stringify({
          audioData: base64Audio,
          languageCode
        })
      });

      return response;
    } catch (error: any) {
      console.error('Failed to transcribe audio:', error);
      throw new Error(error.message || 'Failed to transcribe audio. Please try again.');
    }
  }

  /**
   * Use Web Speech API for real-time transcription (fallback/alternative)
   */
  async transcribeWithWebSpeech(languageCode: string = 'en-US'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isWebSpeechSupported()) {
        reject(new Error('Web Speech API is not supported in this browser'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = languageCode;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        reject(new Error(`Speech recognition failed: ${event.error}`));
      };

      recognition.onend = () => {
        // Handle case where no results were returned
        // This is handled by the onerror callback or onresult
      };

      recognition.start();
    });
  }

  /**
   * Perform voice search with automatic fallback between methods
   */
  async performVoiceSearch(options: {
    useWebSpeech?: boolean;
    languageCode?: string;
    maxDuration?: number;
  } = {}): Promise<string> {
    const { 
      useWebSpeech = this.isWebSpeechSupported(), 
      languageCode = 'en-US',
      maxDuration = 10000 // 10 seconds max
    } = options;

    // Try Web Speech API first if supported and requested
    if (useWebSpeech && this.isWebSpeechSupported()) {
      try {
        return await this.transcribeWithWebSpeech(languageCode);
      } catch (error) {
        console.warn('Web Speech API failed, falling back to AWS Transcribe:', error);
        // Fall through to AWS Transcribe
      }
    }

    // Use AWS Transcribe via recording
    await this.startRecording();
    
    // Auto-stop recording after maxDuration
    const timeoutId = setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.stopRecording().catch(console.error);
      }
    }, maxDuration);

    try {
      // Wait for user to stop recording or timeout
      const audioBlob = await this.stopRecording();
      clearTimeout(timeoutId);
      
      const result = await this.transcribeAudio(audioBlob, languageCode);
      return result.transcript;
    } catch (error) {
      clearTimeout(timeoutId);
      this.cleanup();
      throw error;
    }
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const voiceSearchService = new VoiceSearchService();