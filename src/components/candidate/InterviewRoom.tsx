/**
 * Interactive Real-Time AI Voice Interview Room
 * Realistic, Bold Voice Output & Human Interviewer Conversational Flow
 */

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.ts';
import { VoiceService, VoicePersona, VOICE_PERSONAS } from '../../services/voice.ts';
import { VisionService, VisualAnalysisState } from '../../services/vision.ts';
import {
  Interview,
  Question,
  Answer,
  Evaluation,
  VoiceState,
  VisualEngagementMetrics
} from '../../types/index.ts';
import { VoiceAvatar } from '../common/VoiceAvatar.tsx';
import { useDialogA11y } from '../../utils/useDialogA11y.ts';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  HelpCircle,
  ChevronRight,
  Loader2,
  RotateCcw,
  Edit3,
  MessageSquareQuote,
  UserCheck
} from 'lucide-react';

interface ControlButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  onClick: () => void;
  tone?: 'on' | 'off' | 'neutral';
  loading?: boolean;
  ariaPressed?: boolean;
}

const ControlButton: React.FC<ControlButtonProps> = ({
  icon: Icon,
  label,
  title,
  onClick,
  tone = 'neutral',
  loading = false,
  ariaPressed,
}) => {
  const toneClasses: Record<'on' | 'off' | 'neutral', string> = {
    on: 'bg-blue-600/15 text-blue-300 border-blue-600/40 hover:bg-blue-600/25',
    off: 'bg-red-950/60 text-red-300 border-red-800/70 hover:bg-red-900/70',
    neutral: 'bg-[#18181c] text-zinc-300 border-[#27272a] hover:bg-[#222228]',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={ariaPressed}
      className={`flex flex-col items-center justify-center gap-1 min-w-[54px] sm:min-w-[66px] px-2.5 py-2 rounded-xl border text-[10px] font-semibold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121215] ${toneClasses[tone]}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      <span className="leading-none">{label}</span>
    </button>
  );
};

interface InterviewRoomProps {
  interviewId: string;
  onInterviewFinished: (interviewId: string) => void;
  onExit: () => void;
}

export const InterviewRoom: React.FC<InterviewRoomProps> = ({
  interviewId,
  onInterviewFinished,
  onExit,
}) => {
  // Core State
  const [interview, setInterview] = useState<Interview | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>('loading');
  const [voicePersona, setVoicePersona] = useState<VoicePersona>('bold_executive');
  const [hasStartedSession, setHasStartedSession] = useState<boolean>(false);
  const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(1200); // 20 mins default
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Immediate Evaluation Feedback Modal/Drawer
  const [lastEvaluation, setLastEvaluation] = useState<Evaluation | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [remainingQuestionsCount, setRemainingQuestionsCount] = useState<number>(0);
  // Ungraded practice confirmation modal (no score) and pending adaptive follow-up probe
  const [showPracticeModal, setShowPracticeModal] = useState<boolean>(false);
  const [pendingFollowUp, setPendingFollowUp] = useState<Question | null>(null);

  // Hardware & Controls
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'off' | 'requesting' | 'live' | 'error'>('off');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micStatus, setMicStatus] = useState<'off' | 'requesting' | 'live' | 'error'>('off');
  const [micError, setMicError] = useState<string | null>(null);
  const [sttAvailable, setSttAvailable] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(1.0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [visualState, setVisualState] = useState<VisualAnalysisState | null>(null);
  const [showExitDialog, setShowExitDialog] = useState<boolean>(false);
  const [showFinishDialog, setShowFinishDialog] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Service Refs
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const visionServiceRef = useRef<VisionService | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const streamingTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraRequestInFlightRef = useRef<boolean>(false);
  const micRequestInFlightRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const isFinishingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Exit confirmation is dismissable (Escape / backdrop); the feedback and
  // practice dialogs intentionally require an explicit action.
  const exitDialogRef = useDialogA11y(showExitDialog, () => setShowExitDialog(false));
  const finishDialogRef = useDialogA11y(showFinishDialog, () => setShowFinishDialog(false));

  // 1. INITIALIZE INTERVIEW SESSION & SERVICES
  useEffect(() => {
    let isMounted = true;
    isMountedRef.current = true;

    async function initSession() {
      try {
        setVoiceState('idle');
        const intv = await api.getInterview(interviewId);
        if (!isMounted) return;

        setInterview(intv);
        setTimeRemainingSeconds((intv.durationMinutes || 20) * 60);

        // Initialize Voice Service with Bold Persona
        const voice = new VoiceService({
          persona: voicePersona,
          onTranscriptUpdate: (newTranscript) => {
            setTranscript(newTranscript);
          },
          onError: (err) => {
            console.warn('Voice notice:', err);
          },
        });
        voiceServiceRef.current = voice;
        setSttAvailable(voice.isSpeechRecognitionAvailable());

        // Initialize Vision Service
        const vision = new VisionService();
        visionServiceRef.current = vision;

        // Initialize Hardware (Mic & Camera)
        await startMediaDevices();

        // Check if session was already active previously
        if (intv.status === 'in_progress' && intv.questions && intv.questions.length > 0) {
          setHasStartedSession(true);
          await loadNextQuestion(intv.id);
          startSessionTimer();
        } else {
          // Pre-fetch question in background while candidate reviews instructions
          api.getNextQuestion(intv.id).then((preQ) => {
            if (isMounted && preQ) {
              setCurrentQuestion(preQ);
            }
          }).catch(() => {});
          setVoiceState('idle');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(err.message || 'Failed to initialize interview room');
        setVoiceState('idle');
      }
    }

    initSession();

    return () => {
      isMounted = false;
      isMountedRef.current = false;
      releaseMediaResources();
    };
  }, [interviewId]);

  const startSessionTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleFinishInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartInterviewSession = async () => {
    if (!interview) return;
    setIsStartingSession(true);
    try {
      await api.startInterview(interview.id);
      setHasStartedSession(true);
      startSessionTimer();
      await loadNextQuestion(interview.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start interview session');
    } finally {
      setIsStartingSession(false);
    }
  };

  // Release every media resource synchronously. Safe to call during unmount:
  // it never calls setState, so React never warns about updating an unmounted
  // component. State resets are handled by callers while still mounted.
  const releaseMediaResources = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (voiceServiceRef.current) voiceServiceRef.current.cleanup();
    if (visionServiceRef.current) visionServiceRef.current.stopAnalysis();
    stopStream(micStreamRef.current);
    stopStream(videoStreamRef.current);
    micStreamRef.current = null;
    videoStreamRef.current = null;
    streamingTrackRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
  };

  const stopStream = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* noop */
      }
    });
  };

  const humanizeCameraError = (err: any): string => {
    const name = err?.name || '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Camera permission was denied. Allow camera access for this site in your browser settings, then retry.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No camera device was found. Connect a camera and retry.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'The camera is already in use by another app or tab. Close it and retry.';
    }
    if (name === 'OverconstrainedError') {
      return 'The selected camera does not support the requested settings. Try another camera.';
    }
    return 'Could not start the camera. Check permissions and retry.';
  };

  const humanizeMicError = (err: any): string => {
    const name = err?.name || '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Microphone permission was denied. Allow microphone access for this site, then retry — or type your answers instead.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No microphone device was found. Connect a microphone, or type your answers instead.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'The microphone is already in use by another app or tab. Close it and retry.';
    }
    return 'Could not access the microphone. You can still type your answers.';
  };

  // 2. HARDWARE ACCESS & STREAMS
  const startMediaDevices = async () => {
    await enableMic();
    await enableCamera();
  };

  /**
   * Acquire the microphone. Validates that a live audio track actually exists
   * (a resolved permission prompt is not enough) and surfaces recoverable errors.
   */
  const enableMic = async (deviceId?: string) => {
    if (micRequestInFlightRef.current) return;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicStatus('error');
      setMicError('Microphone access is unavailable in this browser. You can still type your answers.');
      setIsMicOn(false);
      return;
    }

    micRequestInFlightRef.current = true;
    setMicStatus('requesting');
    setMicError(null);
    stopStream(micStreamRef.current);
    micStreamRef.current = null;

    try {
      const audioConstraints: MediaTrackConstraints | boolean = deviceId
        ? { deviceId: { exact: deviceId } }
        : true;
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
      const audioTracks = audioStream.getAudioTracks();
      if (audioTracks.length === 0) {
        stopStream(audioStream);
        throw Object.assign(new Error('No audio track'), { name: 'NotFoundError' });
      }

      micStreamRef.current = audioStream;
      audioTracks.forEach((t) => (t.enabled = true));

      if (voiceServiceRef.current && (await voiceServiceRef.current.initMicAnalyser(audioStream))) {
        const updateFreq = () => {
          if (voiceServiceRef.current) {
            const data = voiceServiceRef.current.getAudioFrequencyData();
            setFrequencyData(data ? new Uint8Array(data) : null);
          }
          animFrameRef.current = requestAnimationFrame(updateFreq);
        };
        updateFreq();
      }

      setIsMicOn(true);
      setMicStatus('live');

      // Watch for the OS/browser revoking the device mid-session.
      audioTracks[0]?.addEventListener?.('ended', () => {
        if (!isMountedRef.current) return;
        setMicStatus('off');
        setIsMicOn(false);
        setMicError('The microphone stopped. Reconnect it and enable the mic again.');
      });
    } catch (err: any) {
      stopStream(micStreamRef.current);
      micStreamRef.current = null;
      setIsMicOn(false);
      setMicStatus('error');
      setMicError(humanizeMicError(err));
    } finally {
      micRequestInFlightRef.current = false;
    }
  };

  const disableMic = () => {
    if (voiceServiceRef.current) voiceServiceRef.current.stopListening();
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    stopStream(micStreamRef.current);
    micStreamRef.current = null;
    setFrequencyData(null);
    setIsMicOn(false);
    setMicStatus('off');
    setMicError(null);
    if (voiceState === 'listening') setVoiceState('idle');
  };

  /**
   * Acquire the camera. A resolved getUserMedia call is NOT treated as success:
   * the video track is validated and the camera is only marked "live" once the
   * <video> element genuinely renders frames (see attachCameraStream below).
   */
  const enableCamera = async (deviceId?: string) => {
    if (cameraRequestInFlightRef.current) return;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setCameraError(
        'Camera access is unavailable. A secure context (https:// or http://localhost) and a supported browser are required.'
      );
      setIsCameraOn(false);
      return;
    }

    cameraRequestInFlightRef.current = true;
    setCameraStatus('requesting');
    setCameraError(null);
    // Release any previous stream first to avoid "device in use" errors.
    stopStream(videoStreamRef.current);
    videoStreamRef.current = null;

    try {
      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
        : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        stopStream(stream);
        throw Object.assign(new Error('No video track'), { name: 'NotFoundError' });
      }

      streamingTrackRef.current = videoTracks[0];
      videoStreamRef.current = stream;
      setCameraStream(stream);
      // Status stays "requesting" until the <video> element reports real frames.
    } catch (err: any) {
      stopStream(videoStreamRef.current);
      videoStreamRef.current = null;
      streamingTrackRef.current = null;
      setCameraStream(null);
      setIsCameraOn(false);
      setCameraStatus('error');
      setCameraError(humanizeCameraError(err));
    } finally {
      cameraRequestInFlightRef.current = false;
    }
  };

  const disableCamera = () => {
    if (visionServiceRef.current) visionServiceRef.current.stopAnalysis();
    stopStream(videoStreamRef.current);
    videoStreamRef.current = null;
    streamingTrackRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
    setCameraStream(null);
    setIsCameraOn(false);
    setCameraStatus('off');
    setCameraError(null);
    setVisualState(null);
  };

  const handleToggleCamera = () => {
    if (cameraStatus === 'live') {
      disableCamera();
    } else {
      enableCamera();
    }
  };

  /**
   * Attach a MediaStream to a <video> element and resolve readiness from real
   * playback signals (loadeddata/playing) rather than from the permission call.
   * Returns a cleanup function that removes listeners and detaches the stream.
   */
  const attachCameraStream = (el: HTMLVideoElement, stream: MediaStream): (() => void) => {
    el.srcObject = stream;
    el.muted = true;
    el.playsInline = true;

    let settled = false;
    const markLive = () => {
      if (settled) return;
      if (el.videoWidth > 0 && el.readyState >= 2 && streamingTrackRef.current?.readyState === 'live') {
        settled = true;
        setCameraStatus('live');
        setIsCameraOn(true);
        setCameraError(null);
      }
    };
    const onReady = () => markLive();
    const onError = () => {
      if (settled) return;
      settled = true;
      setCameraStatus('error');
      setCameraError(
        'The camera stream started but no video is being displayed. Try another camera, or close other apps that may be using it.'
      );
    };

    el.addEventListener('loadeddata', onReady);
    el.addEventListener('playing', onReady);
    el.addEventListener('error', onError);

    const playResult = el.play?.();
    if (playResult && typeof playResult.catch === 'function') {
      // Autoplay can be blocked until a user gesture; keep the stream attached
      // and let the readiness timeout / next interaction resolve it.
      playResult.catch(() => {});
    }

    const timeout = window.setTimeout(() => {
      if (!settled && el.videoWidth === 0) {
        onError();
      } else {
        markLive();
      }
    }, 6000);

    return () => {
      window.clearTimeout(timeout);
      el.removeEventListener('loadeddata', onReady);
      el.removeEventListener('playing', onReady);
      el.removeEventListener('error', onError);
      if (el.srcObject === stream) el.srcObject = null;
    };
  };

  // Attach the active MediaStream to whichever <video> is currently mounted:
  // the pre-session device-check preview before the session starts, and the main
  // stage video during the interview. Re-runs when the stream changes or the
  // element (re)mounts, so ordinary re-renders can never leave the preview black.
  useEffect(() => {
    const video = videoRef.current || previewVideoRef.current;
    if (!video || !cameraStream) return;

    const detach = attachCameraStream(video, cameraStream);

    // Bind the (privacy-preserving, local-only) framing analysis once video is ready.
    if (visionServiceRef.current) {
      visionServiceRef.current.bindVideo(video, (state) => setVisualState(state));
      visionServiceRef.current.startAnalysis(1000);
    }

    const [track] = cameraStream.getVideoTracks();
    const handleTrackEnded = () => {
      if (!isMountedRef.current) return;
      setCameraStatus('off');
      setIsCameraOn(false);
      setVisualState(null);
      setCameraError('The camera stopped. Reconnect it and enable the camera again.');
    };
    track?.addEventListener?.('ended', handleTrackEnded);

    return () => {
      detach();
      track?.removeEventListener?.('ended', handleTrackEnded);
    };
  }, [cameraStream, hasStartedSession]);

  // 3. QUESTION ORCHESTRATION & REALISTIC AI VOICE SPEAKING
  // Presents a specific (already-resolved) question to the candidate, whether it
  // is a numbered template question or an adaptive follow-up probe.
  const presentQuestion = async (q: Question) => {
    setShowFeedbackModal(false);
    setShowPracticeModal(false);
    setPendingFollowUp(null);
    setTranscript('');
    setIsEditingTranscript(false);
    setCurrentQuestion(q);
    setQuestionStartTime(Date.now());

    // Realistic spoken script (Conversational Lead-in + Core Question)
    const spokenText =
      q.spokenDialogue ||
      (q.spokenLeadIn ? `${q.spokenLeadIn} ${q.questionText}` : q.questionText);

    // AI speaks with realistic, bold vocal modulation with zero lag
    setVoiceState('ai_speaking');
    if (voiceServiceRef.current && !isMuted) {
      await voiceServiceRef.current.speak(
        spokenText,
        () => setVoiceState('ai_speaking'),
        () => {
          // When AI stops speaking, automatically open candidate mic listener
          setVoiceState('listening');
          if (voiceServiceRef.current && isMicOn) {
            voiceServiceRef.current.startListening();
          }
        },
        () => {
          // Fallback when speech completes or errors
          setVoiceState('listening');
          if (voiceServiceRef.current && isMicOn) {
            voiceServiceRef.current.startListening();
          }
        }
      );
    } else {
      setVoiceState('listening');
      if (voiceServiceRef.current && isMicOn) {
        voiceServiceRef.current.startListening();
      }
    }
  };

  const loadNextQuestion = async (intvId: string) => {
    setVoiceState('next_question');
    try {
      const q = await api.getNextQuestion(intvId);
      await presentQuestion(q);
    } catch (err: any) {
      if (err.message?.includes('completed') || err.message?.includes('No more questions')) {
        await handleFinishInterview();
      } else {
        setErrorMessage(err.message || 'Error loading next question');
        setVoiceState('idle');
      }
    }
  };

  // Toggle Microphone State & sync with STT VoiceService. Releasing or
  // re-acquiring the track is done through enableMic/disableMic so we never
  // assume a mic exists just because permission was requested.
  const handleToggleMic = () => {
    if (isMicOn) {
      // Mute immediately but keep the stream alive for a quick re-enable.
      if (voiceServiceRef.current) voiceServiceRef.current.stopListening();
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setIsMicOn(false);
      setMicStatus('off');
      if (voiceState === 'listening') setVoiceState('idle');
      return;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setIsMicOn(true);
      setMicStatus('live');
      setVoiceState('listening');
      if (voiceServiceRef.current) voiceServiceRef.current.startListening(transcript);
      return;
    }

    // No stream (permission previously denied or device missing) — retry acquisition.
    void enableMic().then(() => {
      if (micStreamRef.current && voiceServiceRef.current) {
        setVoiceState('listening');
        voiceServiceRef.current.startListening(transcript);
      }
    });
  };

  // Toggle AI interviewer voice output (speaker control)
  const handleToggleVoiceMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (voiceServiceRef.current) {
      voiceServiceRef.current.setVolume(nextMuted ? 0 : volume);
    }
  };

  // Candidate Barge-in / Immediate Speak
  const handleStartSpeakingNow = () => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.stopSpeaking();
      setIsMicOn(true);
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
      }
      setVoiceState('listening');
      voiceServiceRef.current.startListening(transcript);
    }
  };

  // Repeat AI voice dialogue with current persona
  const handleRepeatQuestion = () => {
    if (!currentQuestion || !voiceServiceRef.current) return;
    // Never re-trigger playback while the AI is speaking or an answer is in flight.
    if (voiceState === 'ai_speaking' || voiceState === 'evaluating' || voiceState === 'processing') {
      return;
    }
    voiceServiceRef.current.stopListening();
    setVoiceState('ai_speaking');

    const spokenText =
      currentQuestion.spokenDialogue ||
      (currentQuestion.spokenLeadIn
        ? `${currentQuestion.spokenLeadIn} ${currentQuestion.questionText}`
        : currentQuestion.questionText);

    voiceServiceRef.current.speak(
      spokenText,
      () => setVoiceState('ai_speaking'),
      () => {
        setVoiceState('listening');
        if (voiceServiceRef.current && isMicOn) {
          voiceServiceRef.current.startListening(transcript);
        }
      },
      () => {
        setVoiceState('listening');
        if (voiceServiceRef.current && isMicOn) {
          voiceServiceRef.current.startListening(transcript);
        }
      }
    );
  };

  // Change Voice Persona dynamically
  const handlePersonaChange = (newPersona: VoicePersona) => {
    setVoicePersona(newPersona);
    if (voiceServiceRef.current) {
      voiceServiceRef.current.setPersona(newPersona);
    }
  };

  // 4. SUBMIT CANDIDATE ANSWER
  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;
    // Hard guard against double-submission (double click / Enter + click / timers).
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // Stop speech recognition
    let finalTranscript = transcript.trim();
    if (voiceServiceRef.current) {
      const captured = voiceServiceRef.current.stopListening();
      if (captured && !isEditingTranscript) {
        finalTranscript = captured;
      }
    }

    if (!finalTranscript) {
      setErrorMessage('Please speak or type your answer before submitting.');
      isSubmittingRef.current = false;
      return;
    }

    setVoiceState('evaluating');
    setErrorMessage(null);

    const timeSpentSeconds = Math.max(5, Math.round((Date.now() - questionStartTime) / 1000));
    const sttAvailable = voiceServiceRef.current?.isSpeechRecognitionAvailable() ?? false;
    const inputMethod: 'voice' | 'text_fallback' = isMicOn && sttAvailable ? 'voice' : 'text_fallback';

    try {
      const result = await api.submitAnswer(interviewId, {
        questionId: currentQuestion.id,
        transcript: finalTranscript,
        audioDurationSeconds: timeSpentSeconds,
        timeSpentSeconds,
        inputMethod,
      });

      setRemainingQuestionsCount(result.remainingQuestions);

      // Practice (ungraded): no score, no evaluation, allow re-record.
      if (result.isPractice) {
        setShowPracticeModal(true);
        setVoiceState('idle');
        return;
      }

      setLastEvaluation(result.evaluation);
      setPendingFollowUp(result.followUp || null);
      setShowFeedbackModal(true);
      setVoiceState('idle');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to evaluate answer. Please try again.');
      setVoiceState('listening');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // Practice-only: clear the recorded answer and re-open the mic for the same question.
  const handlePracticeReRecord = () => {
    setShowPracticeModal(false);
    setTranscript('');
    setIsEditingTranscript(false);
    setQuestionStartTime(Date.now());
    setVoiceState('listening');
    if (voiceServiceRef.current && isMicOn) {
      voiceServiceRef.current.startListening('');
    }
  };

  // Continue from the feedback modal: present a follow-up probe if the AI
  // generated one, otherwise advance to the next numbered question.
  const handleContinueAfterFeedback = async () => {
    if (pendingFollowUp) {
      await presentQuestion(pendingFollowUp);
    } else {
      await loadNextQuestion(interviewId);
    }
  };

  // 5. FINISH INTERVIEW & COMPLETE REPORT
  const handleFinishInterview = async () => {
    // Prevent duplicate reports if finish is triggered twice (timer + button).
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setVoiceState('processing');
    try {
      // 1. Gather & save visual engagement metrics
      if (visionServiceRef.current) {
        const metrics = visionServiceRef.current.stopAnalysis();
        await api.saveVisualMetrics(interviewId, metrics);
      }

      // 2. Finish interview and synthesize report
      await api.finishInterview(interviewId);
      onInterviewFinished(interviewId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to finish interview');
      setVoiceState('idle');
      isFinishingRef.current = false;
    }
  };

  // Confirmed finish flow launched from the control bar
  const handleConfirmFinish = async () => {
    setShowFinishDialog(false);
    await handleFinishInterview();
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activePersonaObj = VOICE_PERSONAS[voicePersona];
  const isPractice = !!interview?.isPractice;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in text-[#e5e7eb]">
      {/* 1. TOP STATUS BAR */}
      <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-white shadow-lg">
        {/* Left: Role & Category Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-sm shadow-md">
            Q{currentQuestion?.orderIndex || 1}
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              {interview?.jobRole} ({interview?.experienceLevel})
              {isPractice ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 font-semibold border border-amber-800/60">
                  Practice · Ungraded
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 font-semibold border border-emerald-800/60">
                  Live Simulation
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Question {currentQuestion?.orderIndex || 1} of {interview?.totalQuestions || 5}</span>
              <span>•</span>
              <span className="capitalize">{currentQuestion?.category || 'Technical'}</span>
              <span>•</span>
              <span className="capitalize">{currentQuestion?.difficultyLevel || 'Adaptive'}</span>
            </div>
          </div>
        </div>

        {/* Center: Countdown Timer */}
        <div className="flex items-center gap-2 px-4 py-1.5 bg-[#18181c] rounded-xl border border-[#27272a]">
          <Clock className={`w-4 h-4 ${timeRemainingSeconds < 180 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
          <span className="text-xs font-bold font-mono tracking-wider text-zinc-200">
            {formatTimer(timeRemainingSeconds)}
          </span>
        </div>

        {/* Right: Exit / Finish Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-finish-early"
            onClick={() => setShowFinishDialog(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-blue-950/80 hover:bg-blue-900/80 text-blue-300 border border-blue-800/60 rounded-xl transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Finish & Report
          </button>
          <button
            onClick={() => setShowExitDialog(true)}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl transition hover:bg-[#18181c]"
          >
            Exit
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center gap-2 animate-shake">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. MAIN INTERVIEW STAGE (BENTO GRID) */}
      {!hasStartedSession ? (
        /* READY TO START INTERVIEW ONBOARDING PANEL */
        <div className="p-8 bg-[#121215] border border-blue-600/40 rounded-3xl shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/80 border border-blue-700/60 text-blue-300 text-xs font-bold shadow-sm">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Interview Session Loaded & Ready</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Ready for Your AI Voice Interview?
            </h2>

            <p className="text-sm text-zinc-300 leading-relaxed">
              You are interviewing for the <strong className="text-white">{interview?.jobRole} ({interview?.experienceLevel})</strong> position.
              Your AI interviewer <strong className="text-blue-400">{activePersonaObj.name}</strong> will speak questions out loud with realistic voice output.
            </p>

            {isPractice && (
              <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-2xl text-xs text-amber-200 flex items-start gap-2 text-left">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-amber-100">Practice / warm-up session.</strong> Answers are not scored, you can re-record freely,
                  and no official assessment report or analytics will be generated.
                </span>
              </div>
            )}

            {/* Session Summary Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-left">
              <div className="p-3 bg-[#18181c] rounded-2xl border border-[#27272a]">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Total Questions</div>
                <div className="text-sm font-bold text-white mt-0.5">{interview?.totalQuestions || 5} Questions</div>
              </div>
              <div className="p-3 bg-[#18181c] rounded-2xl border border-[#27272a]">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Duration</div>
                <div className="text-sm font-bold text-white mt-0.5">{interview?.durationMinutes || 20} Minutes</div>
              </div>
              <div className="p-3 bg-[#18181c] rounded-2xl border border-[#27272a]">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Voice Persona</div>
                <div className="text-sm font-bold text-white mt-0.5">{activePersonaObj.name.split(' ')[0]} (Bold)</div>
              </div>
              <div className="p-3 bg-[#18181c] rounded-2xl border border-[#27272a]">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Assessment Type</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5 capitalize">{interview?.interviewType || 'Technical'}</div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="p-4 bg-[#18181c] rounded-2xl border border-[#27272a] text-xs text-zinc-300 text-left space-y-1.5">
              <div className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>How to deliver your best performance:</span>
              </div>
              <p className="text-zinc-400 pl-5">• Listen to the AI voice prompt or read the on-screen technical card.</p>
              <p className="text-zinc-400 pl-5">• Speak naturally into your microphone — your transcript will auto-populate.</p>
              <p className="text-zinc-400 pl-5">• When finished speaking, review your answer and click <strong>Submit Response</strong> for instant feedback.</p>
            </div>

            {/* Pre-interview device check */}
            <div className="p-4 bg-[#18181c] rounded-2xl border border-[#27272a] text-left">
              <div className="font-bold text-white flex items-center gap-1.5 text-xs mb-3">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Device check</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Camera preview */}
                <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-[#0a0a0b] border border-[#27272a] shrink-0 flex items-center justify-center">
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    playsInline
                    muted
                    aria-label="Camera preview"
                    className={`w-full h-full object-cover -scale-x-100 ${
                      cameraStatus === 'live' ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  {cameraStatus !== 'live' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center">
                      {cameraStatus === 'requesting' ? (
                        <>
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                          <span className="text-[10px] text-zinc-400">Starting…</span>
                        </>
                      ) : (
                        <>
                          <VideoOff className="w-5 h-5 text-zinc-400" />
                          <span className="text-[10px] text-zinc-400">
                            {cameraStatus === 'error' ? 'Camera unavailable' : 'Camera off'}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Status list */}
                <div className="flex-1 space-y-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        cameraStatus === 'live' ? 'bg-emerald-400' : cameraStatus === 'requesting' ? 'bg-amber-400' : 'bg-zinc-500'
                      }`}
                    />
                    <span className="text-zinc-300">
                      Camera:{' '}
                      {cameraStatus === 'live'
                        ? 'Ready'
                        : cameraStatus === 'requesting'
                        ? 'Starting…'
                        : cameraStatus === 'error'
                        ? 'Unavailable'
                        : 'Off (optional)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        micStatus === 'live'
                          ? 'bg-emerald-400'
                          : micStatus === 'requesting'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                    />
                    <span className="text-zinc-300">
                      Microphone:{' '}
                      {micStatus === 'live'
                        ? 'Ready'
                        : micStatus === 'requesting'
                        ? 'Starting…'
                        : micStatus === 'error'
                        ? 'Unavailable'
                        : 'Muted'}
                    </span>
                  </div>
                  {cameraError && <p className="text-amber-300/90 leading-snug">{cameraError}</p>}
                  {micError && <p className="text-amber-300/90 leading-snug">{micError}</p>}
                  {!isMicOn && !micError && (
                    <p className="text-amber-300/90 leading-snug">
                      Microphone is off. You can still type your answers on-screen.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => enableCamera()}
                      className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-[#202026] border border-[#27272a] text-zinc-200 hover:bg-[#28282e] transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {cameraStatus === 'live' ? 'Refresh camera' : 'Enable camera'}
                    </button>
                    <button
                      onClick={handleToggleMic}
                      className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-[#202026] border border-[#27272a] text-zinc-200 hover:bg-[#28282e] transition"
                    >
                      {isMicOn ? 'Disable mic' : 'Enable mic'}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">
                Camera is optional and stays in your browser only. Audio answers are transcribed to evaluate your response.
              </p>
            </div>

            {/* Prominent Start Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="btn-start-interview-session"
                onClick={handleStartInterviewSession}
                disabled={isStartingSession}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-blue-600/30 transition transform hover:scale-[1.02] flex items-center justify-center gap-3"
              >
                {isStartingSession ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting Voice Assessor...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span>Start Interview Now</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                onClick={() => setShowExitDialog(true)}
                className="w-full sm:w-auto px-6 py-4 text-xs font-semibold text-zinc-400 hover:text-white rounded-2xl hover:bg-[#18181c] border border-[#27272a] transition"
              >
                Exit Session
              </button>
            </div>
          </div>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-stretch">
        {/* AI interviewer panel (right on desktop, second on mobile) */}
        <div className="lg:col-span-4 order-2 space-y-6">
          {/* AI Voice Avatar Box */}
          <VoiceAvatar
            voiceState={voiceState}
            persona={voicePersona}
            onPersonaChange={handlePersonaChange}
            frequencyData={frequencyData}
            isMuted={isMuted}
            volume={volume}
            onRepeatQuestion={handleRepeatQuestion}
            onToggleMute={handleToggleVoiceMute}
            onVolumeChange={(val) => {
              setVolume(val);
              if (voiceServiceRef.current) {
                voiceServiceRef.current.setVolume(val);
              }
            }}
          />

          {/* Current Conversational Question Card */}
          <div className="p-6 bg-[#121215] border border-[#27272a] rounded-3xl shadow-md space-y-4">
            {/* Conversational Spoken Lead-in / Real-world transition */}
            {currentQuestion?.spokenLeadIn && (
              <div className="p-4 rounded-2xl bg-[#18181c] border border-blue-900/40 text-blue-200/90 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
                <MessageSquareQuote className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-blue-400 mb-1 flex items-center gap-1.5">
                    <span>{activePersonaObj.name} (Interviewer Remarks)</span>
                  </div>
                  <p className="italic font-medium text-zinc-300">
                    "{currentQuestion.spokenLeadIn}"
                  </p>
                </div>
              </div>
            )}

            {/* Core Spoken Question Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  currentQuestion?.parentQuestionId ? 'text-indigo-400' : 'text-emerald-400'
                }`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentQuestion?.parentQuestionId ? 'Adaptive Follow-up Probe' : 'Technical Assessment Prompt'}
                </span>
                {currentQuestion?.aiSource === 'fallback' && (
                  <span
                    title="The AI model was unavailable, so this question came from the built-in question bank."
                    className="text-[10px] font-semibold text-amber-300/90 bg-amber-950/40 border border-amber-800/60 rounded-lg px-2 py-0.5 whitespace-nowrap"
                  >
                    Offline question
                  </span>
                )}
                <button
                  onClick={handleRepeatQuestion}
                  disabled={
                    voiceState === 'ai_speaking' ||
                    voiceState === 'evaluating' ||
                    voiceState === 'processing'
                  }
                  title={
                    voiceState === 'ai_speaking'
                      ? 'The interviewer is already speaking'
                      : 'Repeat the current question aloud'
                  }
                  className="text-xs font-semibold text-zinc-400 hover:text-blue-400 flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-400"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Re-listen Voice
                </button>
              </div>

              <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {currentQuestion?.questionText || 'Preparing real-world interview question...'}
              </p>
            </div>

            {/* Expected Key Points / Focus Areas */}
            {currentQuestion?.expectedPoints && currentQuestion.expectedPoints.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-zinc-400 mr-1 font-medium">Evaluation Focus:</span>
                {currentQuestion.expectedPoints.map((pt, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 text-[10px] font-semibold bg-[#18181c] text-zinc-300 rounded-lg border border-[#27272a]"
                  >
                    {pt}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Candidate camera + transcript column (left on desktop, first on mobile) */}
        <div className="lg:col-span-8 order-1 space-y-6">
          {/* Candidate Camera View — primary focus */}
          <div className="relative bg-[#121215] border border-[#27272a] rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between">
            <div className="relative w-full h-[300px] sm:h-[420px] bg-[#0a0a0b] overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                aria-label="Your live camera preview"
                className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-300 ${
                  cameraStatus === 'live' ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Live camera indicator (only when the stream is actually rendering) */}
              {cameraStatus === 'live' && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-white/90 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Camera Live
                </div>
              )}

              {/* Privacy-preserving framing HUD + centre guide (only while live) */}
              {cameraStatus === 'live' && (
                <>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-white/90 pointer-events-none">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        visualState?.isCentered ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    <span>{visualState?.isCentered ? 'Framed & Centered' : 'Adjust framing'}</span>
                  </div>

                  <div className="absolute inset-x-1/4 inset-y-8 border-2 border-dashed border-white/20 rounded-2xl pointer-events-none" />

                  <div className="absolute bottom-2 inset-x-3 text-center pointer-events-none">
                    <span className="px-2 py-0.5 bg-black/80 backdrop-blur-sm text-[9px] text-zinc-300 rounded-md border border-white/10">
                      Camera framing is analysed locally in your browser only • not recorded or uploaded
                    </span>
                  </div>
                </>
              )}

              {/* Fallback / permission state */}
              {cameraStatus !== 'live' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center bg-[#0a0a0b]">
                  {cameraStatus === 'requesting' ? (
                    <>
                      <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
                      <p className="text-xs text-zinc-300 font-medium">Starting camera…</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-[#18181c] border border-[#27272a] flex items-center justify-center">
                        <VideoOff className="w-6 h-6 text-zinc-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-zinc-200">
                          {cameraStatus === 'error' ? 'Camera unavailable' : 'Camera is off'}
                        </p>
                        <p className="text-[11px] text-zinc-400 max-w-[260px]">
                          {cameraError ||
                            'You can continue with audio only. Your camera is never recorded or uploaded.'}
                        </p>
                      </div>
                      <button
                        onClick={() => enableCamera()}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retry Camera
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Real-time Spoken Answer Transcript & Text Editor */}
          <div className="p-5 bg-[#121215] border border-[#27272a] rounded-3xl shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${voiceState === 'listening' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
                <span className="text-xs font-bold text-white">
                  Your Spoken Answer Transcript
                </span>
              </div>

              <button
                onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                {isEditingTranscript ? 'Done Editing' : 'Edit Text'}
              </button>
            </div>

            {!sttAvailable && (
              <p className="text-[11px] text-amber-300/90 leading-snug">
                Live speech-to-text isn't supported in this browser, so voice is not being
                transcribed. You can still speak and type your answer here.
              </p>
            )}

            {/* Transcript Textarea */}
            <textarea
              rows={4}
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                if (voiceServiceRef.current) {
                  voiceServiceRef.current.setTranscript(e.target.value);
                }
              }}
              placeholder={
                voiceState === 'listening'
                  ? 'Listening to your voice... Speak clearly into your microphone as in a real interview.'
                  : voiceState === 'ai_speaking'
                  ? 'AI interviewer is speaking. Prepare your response...'
                  : 'Type or speak your answer here...'
              }
              className="w-full p-3.5 text-xs sm:text-sm bg-[#18181c] border border-[#27272a] rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
            />

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-zinc-400">
                {transcript.trim().split(/\s+/).filter(Boolean).length} words spoken
              </span>

              <button
                id="btn-submit-answer"
                onClick={handleSubmitAnswer}
                disabled={voiceState === 'evaluating' || !transcript.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {voiceState === 'evaluating' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Response</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating bottom control bar */}
      <div className="sticky bottom-4 z-30 flex justify-center pt-1">
        <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-[#121215]/95 backdrop-blur-md border border-[#27272a] rounded-2xl shadow-2xl">
          <ControlButton
            icon={isMicOn ? Mic : MicOff}
            label={isMicOn ? 'Mic' : 'Muted'}
            title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
            tone={isMicOn ? 'on' : 'off'}
            onClick={handleToggleMic}
            ariaPressed={!isMicOn}
          />
          <ControlButton
            icon={cameraStatus === 'live' ? Video : VideoOff}
            label={cameraStatus === 'requesting' ? 'Starting' : 'Camera'}
            title={cameraStatus === 'live' ? 'Turn camera off' : 'Turn camera on'}
            tone={cameraStatus === 'live' ? 'on' : 'off'}
            loading={cameraStatus === 'requesting'}
            onClick={handleToggleCamera}
            ariaPressed={cameraStatus !== 'live'}
          />
          <ControlButton
            icon={isMuted ? VolumeX : Volume2}
            label={isMuted ? 'Muted' : 'Speaker'}
            title={isMuted ? 'Unmute AI interviewer voice' : 'Mute AI interviewer voice'}
            tone={isMuted ? 'off' : 'neutral'}
            onClick={handleToggleVoiceMute}
            ariaPressed={isMuted}
          />

          <div className="hidden sm:flex items-center px-1.5">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                if (voiceServiceRef.current) {
                  voiceServiceRef.current.setVolume(val);
                }
              }}
              aria-label="AI interviewer voice volume"
              title="AI interviewer voice volume"
              className="w-16 h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="w-px h-8 bg-[#27272a] mx-0.5" />

          <button
            type="button"
            onClick={() => setShowFinishDialog(true)}
            title="End interview and generate report"
            aria-label="End interview and generate report"
            className="flex flex-col items-center justify-center gap-1 min-w-[54px] sm:min-w-[66px] px-2.5 py-2 rounded-xl border border-red-800/70 bg-red-950/60 text-red-300 text-[10px] font-semibold transition hover:bg-red-900/70 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121215]"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End</span>
          </button>
        </div>
      </div>
      </>
      )}

      {/* 3. IMMEDIATE EVALUATION DRAWER / MODAL */}
      {showFeedbackModal && lastEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            tabIndex={-1}
            autoFocus
            className="bg-[#121215] border border-[#27272a] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-950/80 text-blue-400 flex items-center justify-center font-black text-lg border border-blue-800/60">
                  {lastEvaluation.overallScore}%
                </div>
                <div>
                  <h3 id="feedback-modal-title" className="text-lg font-bold text-white">
                    Question Assessment
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Real-time feedback by {activePersonaObj.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Dimension Pill Scores */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-[#18181c] rounded-xl border border-[#27272a]">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Technical</div>
                <div className="text-sm font-bold text-white">
                  {lastEvaluation.technicalAccuracy}/100
                </div>
              </div>
              <div className="p-2.5 bg-[#18181c] rounded-xl border border-[#27272a]">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Communication</div>
                <div className="text-sm font-bold text-white">
                  {lastEvaluation.communication}/100
                </div>
              </div>
              <div className="p-2.5 bg-[#18181c] rounded-xl border border-[#27272a]">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">Reasoning</div>
                <div className="text-sm font-bold text-white">
                  {lastEvaluation.reasoning}/100
                </div>
              </div>
            </div>

            {/* AI Feedback Summary */}
            <div className="p-4 bg-[#18181c] rounded-2xl border border-[#27272a] text-xs text-zinc-300 leading-relaxed space-y-2">
              {lastEvaluation.aiSource === 'fallback' && (
                <p className="text-[10px] uppercase tracking-wide font-semibold text-amber-300/90">
                  Scored by the offline (non-AI) evaluator — the AI model was unavailable.
                </p>
              )}
              <p>
                <strong className="text-white">Interviewer Feedback: </strong>
                {lastEvaluation.feedback}
              </p>
              {lastEvaluation.suggestedAnswer && (
                <p className="text-[11px] text-zinc-400 border-t border-[#27272a] pt-2">
                  <strong className="text-zinc-300">Exemplar Concept: </strong>
                  {lastEvaluation.suggestedAnswer}
                </p>
              )}
            </div>

            {/* Follow-up Probe Notice */}
            {pendingFollowUp && (
              <div className="p-3.5 bg-indigo-950/40 rounded-2xl border border-indigo-900/60 text-[11px] text-indigo-200 flex items-start gap-2">
                <MessageSquareQuote className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>The interviewer will probe one part of your answer more deeply next.</span>
              </div>
            )}

            {/* Next Action Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {pendingFollowUp ? (
                <button
                  id="btn-follow-up"
                  onClick={handleContinueAfterFeedback}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <span>Continue to Follow-up Probe</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : remainingQuestionsCount > 0 ? (
                <button
                  id="btn-next-question"
                  onClick={handleContinueAfterFeedback}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <span>Continue to Next Question ({remainingQuestionsCount} left)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  id="btn-complete-report"
                  onClick={handleFinishInterview}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finish Interview & View Comprehensive Report</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3b. PRACTICE (UNGRADED) CONFIRMATION MODAL */}
      {showPracticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="practice-modal-title"
            tabIndex={-1}
            autoFocus
            className="bg-[#121215] border border-amber-800/50 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/80 text-amber-400 flex items-center justify-center border border-amber-800/60">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 id="practice-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
                  Answer Recorded
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 font-semibold border border-amber-800/60">
                    Practice · Ungraded
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">No official score or evaluation is recorded in practice mode.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 p-3.5 bg-[#18181c] rounded-2xl border border-[#27272a] leading-relaxed">
              Take your time. You can re-record this answer to refine your delivery, or continue to the next question.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                onClick={handlePracticeReRecord}
                className="w-full sm:w-auto px-5 py-3 bg-[#18181c] hover:bg-[#202026] text-zinc-200 text-xs font-bold rounded-xl border border-[#27272a] transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-record this answer</span>
              </button>

              {remainingQuestionsCount > 0 ? (
                <button
                  id="btn-practice-next"
                  onClick={() => loadNextQuestion(interviewId)}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <span>Next Question ({remainingQuestionsCount} left)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  id="btn-practice-finish"
                  onClick={handleFinishInterview}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finish Practice</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. EXIT CONFIRMATION DIALOG */}
      {showExitDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowExitDialog(false)}
        >
          <div
            ref={exitDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121215] border border-[#27272a] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-in focus:outline-none"
          >
            <h3 id="exit-modal-title" className="text-base font-bold text-white">Exit Interview Session?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your answered questions and evaluations are preserved. You can resume or view your assessment summary later from your candidate portal.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowExitDialog(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl transition hover:bg-[#18181c]"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-exit"
                onClick={onExit}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl transition shadow-md"
              >
                Exit Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. END INTERVIEW CONFIRMATION DIALOG */}
      {showFinishDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowFinishDialog(false)}
        >
          <div
            ref={finishDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="finish-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121215] border border-[#27272a] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-in focus:outline-none"
          >
            <h3 id="finish-modal-title" className="text-base font-bold text-white">
              {isPractice ? 'End Practice Session?' : 'End Interview & Generate Report?'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {isPractice
                ? 'Your practice answers are not scored. This will end the warm-up session.'
                : 'This will submit your interview and generate your assessment report. You will not be able to add more answers afterwards.'}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowFinishDialog(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl transition hover:bg-[#18181c]"
              >
                Keep Going
              </button>
              <button
                id="btn-confirm-finish"
                onClick={handleConfirmFinish}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-md"
              >
                {isPractice ? 'End Practice' : 'End Interview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
