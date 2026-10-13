/**
 * IntervAI Modular Voice Engine
 * Handles Text-to-Speech (TTS), Speech-to-Text (STT), Real-time Audio Waveform Analysis,
 * and Realistic, Bold Vocal Character Profiles with Zero-Lag Execution and Glitch-Free Playback.
 */

export type VoicePersona = 'bold_executive' | 'tech_lead' | 'director';

export interface VoiceEngineOptions {
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: string) => void;
  persona?: VoicePersona;
}

export interface VoiceProfileInfo {
  id: VoicePersona;
  name: string;
  title: string;
  gender: 'male' | 'female';
  description: string;
  pitch: number;
  rate: number;
}

export const VOICE_PERSONAS: Record<VoicePersona, VoiceProfileInfo> = {
  bold_executive: {
    id: 'bold_executive',
    name: 'Marcus Vance',
    title: 'VP of Engineering / Principal Assessor',
    gender: 'male',
    description: 'Deep, resonant, assertive & authoritative. Sounds like an executive hiring manager.',
    pitch: 0.92,
    rate: 1.02,
  },
  tech_lead: {
    id: 'tech_lead',
    name: 'Alex Rivera',
    title: 'Senior Staff Architect & Tech Lead',
    gender: 'male',
    description: 'Crisp, engaging, pragmatic and conversational technical interviewer.',
    pitch: 0.96,
    rate: 1.04,
  },
  director: {
    id: 'director',
    name: 'Sarah Chen',
    title: 'Director of Talent Assessment',
    gender: 'female',
    description: 'Articulate, strategic, poised, and clear executive voice.',
    pitch: 1.02,
    rate: 1.02,
  },
};

export class VoiceService {
  private recognition: any = null;
  private isListening: boolean = false;
  private currentTranscript: string = '';
  private interimTranscript: string = '';
  private options: VoiceEngineOptions = {};
  private restartTimeout: any = null;

  // Audio Context & Analyser for Live Waveform
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private dataArray: Uint8Array | null = null;

  // TTS State & Sequence Control
  private isSpeaking: boolean = false;
  private ttsVolume: number = 1.0;
  private currentPersona: VoicePersona = 'bold_executive';
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private currentSpeakSessionId: number = 0;

  constructor(options: VoiceEngineOptions = {}) {
    this.options = options;
    if (options.persona) {
      this.currentPersona = options.persona;
    }
    this.initSpeechRecognition();
    this.warmUpVoices();
  }

  public setOptions(options: Partial<VoiceEngineOptions>) {
    this.options = { ...this.options, ...options };
    if (options.persona) {
      this.currentPersona = options.persona;
    }
  }

  public setPersona(persona: VoicePersona) {
    this.currentPersona = persona;
  }

  public getPersona(): VoicePersona {
    return this.currentPersona;
  }

  private warmUpVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const load = () => {
      try {
        this.cachedVoices = window.speechSynthesis.getVoices();
      } catch {}
    };

    load();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  // 1. SPEECH RECOGNITION (STT) - RESILIENT & RESPONSIVE
  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech Recognition API is not supported in this browser. Text fallback mode available.');
      return;
    }

    try {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {}
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.options.onSpeechStart) this.options.onSpeechStart();
      };

      this.recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item && item[0]) {
            const transcript = item[0].transcript;
            if (item.isFinal) {
              finalChunk += transcript + ' ';
            } else {
              interimChunk += transcript;
            }
          }
        }

        if (finalChunk) {
          this.currentTranscript += (this.currentTranscript ? ' ' : '') + finalChunk.trim();
        }
        this.interimTranscript = interimChunk.trim();

        const fullDisplay = (
          this.currentTranscript + (this.interimTranscript ? ' ' + this.interimTranscript : '')
        ).trim();

        if (this.options.onTranscriptUpdate) {
          this.options.onTranscriptUpdate(fullDisplay, !!finalChunk);
        }
      };

      this.recognition.onerror = (event: any) => {
        const error = event.error;
        if (error === 'not-allowed') {
          this.isListening = false;
          if (this.options.onError) {
            this.options.onError('Microphone access was denied. Please allow microphone permissions.');
          }
        } else if (error === 'no-speech') {
          // Normal pause in speech, continue listening
        } else if (error === 'aborted') {
          // Intentional stop or restart
        } else {
          console.log('[Voice STT Notice]:', error);
        }
      };

      this.recognition.onend = () => {
        // Automatically restart speech recognition smoothly if candidate is still speaking
        if (this.isListening) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (e: any) {
                // If start fails, re-initialize recognition instance safely
                if (e?.name === 'InvalidStateError') {
                  try {
                    this.recognition.stop();
                  } catch {}
                }
              }
            }
          }, 150);
        } else {
          if (this.options.onSpeechEnd) this.options.onSpeechEnd();
        }
      };
    } catch (err) {
      console.warn('Could not initialize SpeechRecognition:', err);
    }
  }

  public isSpeechRecognitionAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public startListening(initialTranscript: string = '') {
    if (initialTranscript !== undefined) {
      this.currentTranscript = initialTranscript;
    }
    this.interimTranscript = '';
    this.isListening = true;

    if (!this.recognition) {
      this.initSpeechRecognition();
    }

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (err: any) {
        // If already started or transitioning, abort and restart
        try {
          this.recognition.abort();
          setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch {}
            }
          }, 100);
        } catch {}
      }
    }
  }

  public stopListening(): string {
    this.isListening = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    return (
      this.currentTranscript + (this.interimTranscript ? ' ' + this.interimTranscript : '')
    ).trim();
  }

  public getFullTranscript(): string {
    return (
      this.currentTranscript + (this.interimTranscript ? ' ' + this.interimTranscript : '')
    ).trim();
  }

  public setTranscript(text: string) {
    this.currentTranscript = text;
    this.interimTranscript = '';
    if (this.options.onTranscriptUpdate) {
      this.options.onTranscriptUpdate(text, true);
    }
  }

  public clearTranscript() {
    this.currentTranscript = '';
    this.interimTranscript = '';
  }

  // 2. TEXT TO SPEECH (TTS) - GLITCH-FREE SENTENCE QUEUING & BOLD REALISTIC TONE
  private findOptimalVoice(personaId: VoicePersona): SpeechSynthesisVoice | null {
    if (!('speechSynthesis' in window)) return null;

    const voices = this.cachedVoices.length > 0 ? this.cachedVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const enVoices = voices.filter((v) => v.lang.startsWith('en'));
    const persona = VOICE_PERSONAS[personaId] || VOICE_PERSONAS.bold_executive;

    if (persona.gender === 'male') {
      const maleVoice = enVoices.find((v) => {
        const name = v.name.toLowerCase();
        return (
          (name.includes('natural') && (name.includes('guy') || name.includes('christopher') || name.includes('ryan') || name.includes('eric') || name.includes('david'))) ||
          name.includes('daniel') ||
          name.includes('arthur') ||
          name.includes('google us english male') ||
          name.includes('google uk english male') ||
          name.includes('alex') ||
          name.includes('oliver') ||
          name.includes('tom') ||
          (name.includes('male') && !name.includes('female'))
        );
      });

      if (maleVoice) return maleVoice;
    } else {
      const femaleVoice = enVoices.find((v) => {
        const name = v.name.toLowerCase();
        return (
          (name.includes('natural') && (name.includes('jenny') || name.includes('aria') || name.includes('sonia'))) ||
          name.includes('samantha') ||
          name.includes('victoria') ||
          name.includes('google us english female') ||
          name.includes('google uk english female') ||
          name.includes('karen') ||
          name.includes('moira') ||
          name.includes('female')
        );
      });

      if (femaleVoice) return femaleVoice;
    }

    const naturalFallback = enVoices.find((v) => {
      const name = v.name.toLowerCase();
      return name.includes('natural') || name.includes('google') || name.includes('premium') || name.includes('enhanced');
    });

    return naturalFallback || enVoices[0] || voices[0] || null;
  }

  /**
   * Splits text into short, natural sentence chunks to prevent browser TTS engine
   * buffer timeouts, clipping, or abrupt audio breaking.
   */
  private splitIntoSpeechChunks(text: string): string[] {
    const cleaned = text
      .replace(/\bAPI\b/g, 'A P I')
      .replace(/\bAPIs\b/g, 'A P Is')
      .replace(/\bSQL\b/g, 'Sequel')
      .replace(/\bCI\/CD\b/g, 'C I C D')
      .replace(/\bUI\b/g, 'U I')
      .replace(/\bUX\b/g, 'U X')
      .replace(/\bRESTful\b/g, 'Restful')
      .replace(/\bNoSQL\b/g, 'No Sequel')
      .replace(/\bQ(\d+)\b/g, 'Question $1')
      .trim();

    // Match sentences ending in punctuation
    const rawSentences = cleaned.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g);
    if (!rawSentences) return [cleaned];

    const chunks: string[] = [];
    for (let s of rawSentences) {
      s = s.trim();
      if (!s) continue;

      // If a sentence is unusually long (> 160 chars), break naturally at semicolons or commas
      if (s.length > 160 && (s.includes(',') || s.includes(';'))) {
        const subParts = s.split(/([,;]\s+)/);
        let currentCombined = '';
        for (let part of subParts) {
          if ((currentCombined + part).length > 120 && currentCombined) {
            chunks.push(currentCombined.trim());
            currentCombined = part;
          } else {
            currentCombined += part;
          }
        }
        if (currentCombined.trim()) {
          chunks.push(currentCombined.trim());
        }
      } else {
        chunks.push(s);
      }
    }

    return chunks.length > 0 ? chunks : [cleaned];
  }

  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      this.stopSpeaking();

      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis is not supported in this browser.');
        if (onEnd) onEnd();
        resolve();
        return;
      }

      const chunks = this.splitIntoSpeechChunks(text);
      if (chunks.length === 0) {
        if (onEnd) onEnd();
        resolve();
        return;
      }

      this.currentSpeakSessionId += 1;
      const sessionId = this.currentSpeakSessionId;
      const personaConfig = VOICE_PERSONAS[this.currentPersona] || VOICE_PERSONAS.bold_executive;
      const voice = this.findOptimalVoice(this.currentPersona);

      let chunkIndex = 0;
      let hasStarted = false;

      const finishSession = (isErr = false) => {
        if (sessionId !== this.currentSpeakSessionId) return;
        this.isSpeaking = false;
        if (isErr) {
          if (onError) onError();
        } else {
          if (onEnd) onEnd();
        }
        resolve();
      };

      const speakNextChunk = () => {
        if (sessionId !== this.currentSpeakSessionId) return;

        if (chunkIndex >= chunks.length) {
          finishSession(false);
          return;
        }

        const chunkText = chunks[chunkIndex];
        chunkIndex++;

        const utterance = new SpeechSynthesisUtterance(chunkText);
        utterance.pitch = personaConfig.pitch;
        utterance.rate = personaConfig.rate;
        utterance.volume = this.ttsVolume;
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = () => {
          if (sessionId !== this.currentSpeakSessionId) return;
          if (!hasStarted) {
            hasStarted = true;
            this.isSpeaking = true;
            if (onStart) onStart();
          }
        };

        utterance.onend = () => {
          if (sessionId !== this.currentSpeakSessionId) return;
          // Small natural cadence pause between sentences
          setTimeout(() => {
            speakNextChunk();
          }, 80);
        };

        utterance.onerror = (e) => {
          if (sessionId !== this.currentSpeakSessionId) return;
          if (e.error === 'interrupted' || e.error === 'canceled') {
            return;
          }
          console.warn('[SpeechSynthesis Notice]:', e.error);
          // Try proceeding to next chunk or finish
          if (chunkIndex < chunks.length) {
            speakNextChunk();
          } else {
            finishSession(false);
          }
        };

        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('SpeechSynthesis error:', err);
          finishSession(true);
        }
      };

      // Cancel any ongoing utterance and trigger sequential chunk playback
      try {
        window.speechSynthesis.cancel();
      } catch {}

      setTimeout(() => {
        speakNextChunk();
      }, 50);
    });
  }

  public stopSpeaking() {
    this.currentSpeakSessionId += 1;
    this.isSpeaking = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  public setVolume(vol: number) {
    this.ttsVolume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.ttsVolume;
  }

  // 3. AUDIO VISUALIZER & MIC ANALYZER
  public async initMicAnalyser(stream: MediaStream): Promise<boolean> {
    try {
      this.micStream = stream;
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return false;

      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      return true;
    } catch (err) {
      console.warn('Audio Analyser setup error:', err);
      return false;
    }
  }

  public getAudioFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  public getAudioVolumeLevel(): number {
    const data = this.getAudioFrequencyData();
    if (!data || data.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return Math.min(100, Math.round((sum / data.length / 255) * 100));
  }

  public cleanup() {
    this.stopListening();
    this.stopSpeaking();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {}
    }
  }
}
