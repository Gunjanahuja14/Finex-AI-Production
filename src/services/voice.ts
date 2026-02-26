/**
 * voice.ts — FINEX-AI Voice Services
 * 
 * Features:
 * - VAD (Voice Activity Detection): Silero VAD v5 (via ONNX) or Web Audio API
 * - STT (Speech to Text): Whisper Tiny EN (via ONNX) or Web Speech API
 * - TTS (Text to Speech): Piper TTS (via ONNX) or Web Speech API
 * 
 * All running offline in the browser
 */

import { ONNX } from '@runanywhere/web-onnx';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceServiceState = {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
};

export type VoiceCallbacks = {
  onSpeechStart?: () => void;
  onSpeechEnd?: (transcript: string) => void;
  onTranscriptUpdate?: (text: string) => void;
  onError?: (error: string) => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// ONNX-BASED STT SERVICE (Whisper Tiny)
// ─────────────────────────────────────────────────────────────────────────────

class ONNXSTTService {
  private isLoaded = false;
  private initPromise: Promise<void> | null = null;
  private recognitionCallback: ((text: string, isFinal: boolean) => void) | null = null;

  async init(): Promise<void> {
    if (this.isLoaded) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[Voice] Initializing ONNX Whisper STT...');
        
        if (ONNX && (ONNX as any).stt) {
          await (ONNX as any).stt.initialize({
            model: 'whisper-tiny.en',
          });
          console.log('[Voice] ONNX Whisper STT initialized');
        } else {
          console.warn('[Voice] ONNX STT not available, falling back to Web Speech API');
          throw new Error('ONNX STT not available');
        }
        
        this.isLoaded = true;
      } catch (err) {
        console.error('[Voice] Failed to init ONNX STT:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  setCallback(callback: (text: string, isFinal: boolean) => void): void {
    this.recognitionCallback = callback;
  }

  async start(): Promise<void> {
    if (!this.isLoaded) {
      throw new Error('STT not initialized');
    }

    try {
      if (ONNX && (ONNX as any).stt) {
        await (ONNX as any).stt.start({
          onResult: (text: string, isFinal: boolean) => {
            this.recognitionCallback?.(text, isFinal);
          },
          onError: (error: string) => {
            console.error('[Voice] STT error:', error);
          },
        });
      }
    } catch (err) {
      console.error('[Voice] Failed to start STT:', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      if (ONNX && (ONNX as any).stt) {
        await (ONNX as any).stt.stop();
      }
    } catch (err) {
      console.error('[Voice] Failed to stop STT:', err);
    }
  }

  get ready(): boolean {
    return this.isLoaded;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ONNX-BASED TTS SERVICE (Piper)
// ─────────────────────────────────────────────────────────────────────────────

class ONNXTTSService {
  private isLoaded = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.isLoaded) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[Voice] Initializing ONNX Piper TTS...');
        
        if (ONNX && (ONNX as any).tts) {
          await (ONNX as any).tts.initialize({
            model: 'piper',
          });
          console.log('[Voice] ONNX Piper TTS initialized');
        } else {
          console.warn('[Voice] ONNX TTS not available, falling back to Web Speech API');
          throw new Error('ONNX TTS not available');
        }
        
        this.isLoaded = true;
      } catch (err) {
        console.error('[Voice] Failed to init ONNX TTS:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  async speak(text: string, onStart?: () => void, onEnd?: () => void): Promise<void> {
    if (!this.isLoaded) {
      throw new Error('TTS not initialized');
    }

    try {
      if (ONNX && (ONNX as any).tts) {
        await (ONNX as any).tts.speak(text, {
          onStart,
          onEnd,
        });
      }
    } catch (err) {
      console.error('[Voice] TTS speak error:', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      if (ONNX && (ONNX as any).tts) {
        await (ONNX as any).tts.stop();
      }
    } catch (err) {
      console.error('[Voice] TTS stop error:', err);
    }
  }

  get ready(): boolean {
    return this.isLoaded;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ONNX-BASED VAD SERVICE (Silero VAD)
// ─────────────────────────────────────────────────────────────────────────────

class ONNVADService {
  private isLoaded = false;
  private initPromise: Promise<void> | null = null;
  private vadCallback: ((isSpeaking: boolean) => void) | null = null;

  async init(): Promise<void> {
    if (this.isLoaded) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[Voice] Initializing ONNX Silero VAD...');
        
        if (ONNX && (ONNX as any).vad) {
          await (ONNX as any).vad.initialize({
            model: 'silero-v5',
          });
          console.log('[Voice] ONNX Silero VAD initialized');
        } else {
          console.warn('[Voice] ONNX VAD not available');
          throw new Error('ONNX VAD not available');
        }
        
        this.isLoaded = true;
      } catch (err) {
        console.error('[Voice] Failed to init ONNX VAD:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  setCallback(callback: (isSpeaking: boolean) => void): void {
    this.vadCallback = callback;
  }

  async start(): Promise<void> {
    if (!this.isLoaded) {
      throw new Error('VAD not initialized');
    }

    try {
      if (ONNX && (ONNX as any).vad) {
        await (ONNX as any).vad.start({
          onSpeechStart: () => {
            this.vadCallback?.(true);
          },
          onSpeechEnd: () => {
            this.vadCallback?.(false);
          },
        });
      }
    } catch (err) {
      console.error('[Voice] VAD start error:', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      if (ONNX && (ONNX as any).vad) {
        await (ONNX as any).vad.stop();
      }
    } catch (err) {
      console.error('[Voice] VAD stop error:', err);
    }
  }

  get ready(): boolean {
    return this.isLoaded;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK WEB SPEECH SERVICES - Fixed for reusability
// ─────────────────────────────────────────────────────────────────────────────

class WebSpeechSTTFallback {
  private recognition: SpeechRecognition | null = null;
  private currentTranscript = '';
  private _ready = false;
  
  // Callbacks
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  async init(): Promise<void> {
    this._ready = true;
  }

  get ready(): boolean {
    return this._ready;
  }

  // Create a new recognition instance
  private createRecognition(): SpeechRecognition | null {
    const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      return null;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false; // Changed to false for better control
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    return recognition;
  }

  setCallbacks(
    onResult: (text: string, isFinal: boolean) => void,
    onEnd: () => void,
    onError: (error: string) => void
  ): void {
    this.onResultCallback = onResult;
    this.onEndCallback = onEnd;
    this.onErrorCallback = onError;
  }

  // Create fresh recognition instance each time
  private setupRecognition(): void {
    this.recognition = this.createRecognition();
    if (!this.recognition) return;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      let isFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        transcript += result[0].transcript;
        if (result.isFinal) {
          isFinal = true;
        }
      }

      this.currentTranscript = transcript;
      this.onResultCallback?.(transcript, isFinal);
    };

    this.recognition.onend = () => {
      console.log('[Voice] Web Speech recognition ended');
      // Only call onEnd if we actually got some input
      if (this.currentTranscript.trim()) {
        this.onEndCallback?.();
      } else {
        // If no input, still call end but it might be a timeout
        this.onEndCallback?.();
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[Voice] Web Speech error:', event.error);
      // Don't treat "no-speech" as an error - it's normal
      if (event.error !== 'no-speech') {
        this.onErrorCallback?.(event.error);
      }
    };
  }

  start(): void {
    // Reset transcript
    this.currentTranscript = '';
    
    // Create fresh recognition instance
    this.setupRecognition();
    
    if (this.recognition) {
      try {
        this.recognition.start();
        console.log('[Voice] Web Speech recognition started');
      } catch (err) {
        console.error('[Voice] Failed to start recognition:', err);
        this.onErrorCallback?.('Failed to start recognition');
      }
    }
  }

  stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.error('[Voice] Error stopping recognition:', err);
      }
    }
  }

  get currentText(): string {
    return this.currentTranscript;
  }
}

class WebSpeechTTSFallback {
  private _ready = true;

  async init(): Promise<void> {
    // No init needed for Web Speech TTS
  }

  get ready(): boolean {
    return this._ready;
  }

  async speak(text: string, onStart?: () => void, onEnd?: () => void): Promise<void> {
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech synthesis not available');
    }

    // Cancel any ongoing speech first
    speechSynthesis.cancel();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      const voices = speechSynthesis.getVoices();
      const englishVoice = voices.find(v => 
        v.lang.startsWith('en-') && v.name.includes('Google')
      ) || voices.find(v => v.lang.startsWith('en-'));
      
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => onStart?.();
      utterance.onend = () => { onEnd?.(); resolve(); };
      utterance.onerror = (err) => {
        console.error('[Voice] TTS error:', err);
        reject(err);
      };

      speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    speechSynthesis.cancel();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN VOICE SERVICE (with fallback)
// ─────────────────────────────────────────────────────────────────────────────

class VoiceService {
  private stt: ONNXSTTService | WebSpeechSTTFallback | null = null;
  private tts: ONNXTTSService | WebSpeechTTSFallback | null = null;
  private vad: ONNVADService | null = null;
  private state: VoiceServiceState;
  private callbacks: VoiceCallbacks;
  private useONNX = true;
  private isInitialized = false;

  constructor() {
    this.state = {
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      transcript: '',
      error: null,
    };

    this.callbacks = {};
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('[Voice] Attempting to initialize ONNX voice services...');
      
      try {
        this.stt = new ONNXSTTService();
        await this.stt.init();
        
        this.tts = new ONNXTTSService();
        await this.tts.init();
        
        this.vad = new ONNVADService();
        await this.vad.init();
        
        this.useONNX = true;
        console.log('[Voice] ✓ ONNX voice services initialized successfully');
      } catch (onnxErr) {
        console.warn('[Voice] ONNX not available, using Web Speech API fallback:', onnxErr);
        this.useONNX = false;
        
        // Fall back to Web Speech API
        this.stt = new WebSpeechSTTFallback();
        await (this.stt as WebSpeechSTTFallback).init();
        
        this.tts = new WebSpeechTTSFallback();
        
        // VAD will use simple detection
        console.log('[Voice] ✓ Web Speech API fallback initialized');
      }
      
      this.isInitialized = true;
      console.log('[Voice] All voice services ready');
    } catch (err) {
      console.error('[Voice] Failed to initialize voice services:', err);
      throw err;
    }
  }

  setCallbacks(callbacks: VoiceCallbacks): void {
    this.callbacks = callbacks;
    
    // Set up callbacks for Web Speech API
    if (!this.useONNX && this.stt && 'setCallbacks' in this.stt) {
      // These will be set in startListening for fresh instance
    }
  }

  get isListening(): boolean {
    return this.state.isListening;
  }

  get isSpeaking(): boolean {
    return this.state.isSpeaking;
  }

  get ready(): boolean {
    return this.isInitialized && (this.stt?.ready ?? false) && (this.tts?.ready ?? false);
  }

  async startListening(): Promise<void> {
    if (this.state.isListening || this.state.isSpeaking) return;

    try {
      if (this.useONNX && this.stt && 'start' in this.stt && 'stop' in this.stt) {
        // Use ONNX STT with VAD
        if (this.vad?.ready) {
          (this.vad as ONNVADService).setCallback((isSpeaking) => {
            if (isSpeaking) {
              this.callbacks.onSpeechStart?.();
            }
          });
          await (this.vad as ONNVADService).start();
        }
        
        await (this.stt as ONNXSTTService).start();
      } else if (this.stt && 'setCallbacks' in this.stt) {
        // Use Web Speech API fallback with fresh instance each time
        const webSpeechSTT = this.stt as WebSpeechSTTFallback;
        
        webSpeechSTT.setCallbacks(
          (text, isFinal) => {
            this.state.transcript = text;
            this.callbacks.onTranscriptUpdate?.(text);
            if (isFinal && text.trim()) {
              this.callbacks.onSpeechEnd?.(text);
            }
          },
          () => {
            console.log('[Voice] Web Speech recognition session ended');
            if (this.state.isListening) {
              this.state.isListening = false;
            }
          },
          (error) => {
            console.error('[Voice] Web Speech error:', error);
            this.state.error = error;
            this.callbacks.onError?.(error);
            this.state.isListening = false;
          }
        );
        
        webSpeechSTT.start();
      }
      
      this.state.isListening = true;
      this.state.transcript = '';
      this.callbacks.onSpeechStart?.();
      
    } catch (err) {
      this.state.error = err instanceof Error ? err.message : 'Microphone access denied';
      this.callbacks.onError?.(this.state.error);
      throw err;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.state.isListening) return;

    try {
      if (this.useONNX && this.stt && 'stop' in this.stt) {
        await (this.stt as ONNXSTTService).stop();
        if (this.vad?.ready) {
          await (this.vad as ONNVADService).stop();
        }
      } else if (this.stt && 'stop' in this.stt) {
        (this.stt as WebSpeechSTTFallback).stop();
      }
      
      this.state.isListening = false;
      
      // Trigger callback with current transcript if we have one
      if (this.state.transcript.trim()) {
        this.callbacks.onSpeechEnd?.(this.state.transcript);
      }
    } catch (err) {
      this.state.error = err instanceof Error ? err.message : 'Failed to stop';
      this.callbacks.onError?.(this.state.error);
    }
  }

  async speak(text: string): Promise<void> {
    if (this.state.isSpeaking) {
      if (this.useONNX && this.tts && 'stop' in this.tts) {
        await (this.tts as ONNXTTSService).stop();
      } else if (this.tts && 'stop' in this.tts) {
        (this.tts as WebSpeechTTSFallback).stop();
      }
    }

    this.state.isSpeaking = true;

    try {
      if (this.useONNX && this.tts && 'speak' in this.tts) {
        await (this.tts as ONNXTTSService).speak(
          text,
          () => this.callbacks.onSpeechStart?.(),
          () => { this.state.isSpeaking = false; }
        );
      } else if (this.tts && 'speak' in this.tts) {
        await (this.tts as WebSpeechTTSFallback).speak(
          text,
          () => this.callbacks.onSpeechStart?.(),
          () => { this.state.isSpeaking = false; }
        );
      }
    } catch (err) {
      this.state.isSpeaking = false;
      this.state.error = err instanceof Error ? err.message : 'TTS failed';
      this.callbacks.onError?.(this.state.error);
      throw err;
    }
  }

  stopSpeaking(): void {
    if (this.useONNX && this.tts && 'stop' in this.tts) {
      (this.tts as ONNXTTSService).stop();
    } else if (this.tts && 'stop' in this.tts) {
      (this.tts as WebSpeechTTSFallback).stop();
    }
    this.state.isSpeaking = false;
  }

  getState(): VoiceServiceState {
    return { ...this.state };
  }
}

// Export singleton instance
export const voiceService = new VoiceService();
