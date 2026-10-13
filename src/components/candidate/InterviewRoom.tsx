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
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Loader2,
  RotateCcw,
  Edit3,
  MessageSquareQuote,
  UserCheck
} from 'lucide-react';

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
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(1.0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [visualState, setVisualState] = useState<VisualAnalysisState | null>(null);
  const [showExitDialog, setShowExitDialog] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Service Refs
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const visionServiceRef = useRef<VisionService | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Exit confirmation is dismissable (Escape / backdrop); the feedback and
  // practice dialogs intentionally require an explicit action.
  const exitDialogRef = useDialogA11y(showExitDialog, () => setShowExitDialog(false));

  // 1. INITIALIZE INTERVIEW SESSION & SERVICES
  useEffect(() => {
    let isMounted = true;

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
      cleanupResources();
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

  const cleanupResources = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (voiceServiceRef.current) voiceServiceRef.current.cleanup();
    if (visionServiceRef.current) visionServiceRef.current.stopAnalysis();
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
    if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach((t) => t.stop());
  };

  // 2. HARDWARE ACCESS & STREAMS
  const startMediaDevices = async () => {
    // Mic stream
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = audioStream;
      if (voiceServiceRef.current) {
        await voiceServiceRef.current.initMicAnalyser(audioStream);

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
    } catch {
      setIsMicOn(false);
    }

    // Camera stream
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360 },
      });
      videoStreamRef.current = videoStream;
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
        videoRef.current.play();
      }
      setIsCameraOn(true);

      if (visionServiceRef.current && videoRef.current) {
        visionServiceRef.current.bindVideo(videoRef.current, (state) => {
          setVisualState(state);
        });
        visionServiceRef.current.startAnalysis(1000);
      }
    } catch {
      setIsCameraOn(false);
    }
  };

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

  // Toggle Microphone State & sync with STT VoiceService
  const handleToggleMic = () => {
    const nextMicState = !isMicOn;
    setIsMicOn(nextMicState);

    // Mute / Unmute media stream tracks
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextMicState;
      });
    }

    if (voiceServiceRef.current) {
      if (nextMicState) {
        setVoiceState('listening');
        voiceServiceRef.current.startListening(transcript);
      } else {
        voiceServiceRef.current.stopListening();
        if (voiceState === 'listening') {
          setVoiceState('idle');
        }
      }
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
      return;
    }

    setVoiceState('evaluating');
    setErrorMessage(null);

    const timeSpentSeconds = Math.max(5, Math.round((Date.now() - questionStartTime) / 1000));

    try {
      const result = await api.submitAnswer(interviewId, {
        questionId: currentQuestion.id,
        transcript: finalTranscript,
        audioDurationSeconds: timeSpentSeconds,
        timeSpentSeconds,
        inputMethod: isMicOn ? 'voice' : 'text_fallback',
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
    }
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
            onClick={handleFinishInterview}
            className="px-3.5 py-1.5 text-xs font-semibold bg-blue-950/80 hover:bg-blue-900/80 text-blue-300 border border-blue-800/60 rounded-xl transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            {isPractice ? 'Finish Practice' : 'Finish & Generate Report'}
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Voice Interviewer & Conversational Question Display (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* AI Voice Avatar Box */}
          <VoiceAvatar
            voiceState={voiceState}
            persona={voicePersona}
            onPersonaChange={handlePersonaChange}
            frequencyData={frequencyData}
            isMuted={isMuted}
            volume={volume}
            onRepeatQuestion={handleRepeatQuestion}
            onToggleMute={() => {
              setIsMuted(!isMuted);
              if (voiceServiceRef.current) {
                voiceServiceRef.current.setVolume(!isMuted ? 0 : 1);
              }
            }}
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
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  currentQuestion?.parentQuestionId ? 'text-indigo-400' : 'text-emerald-400'
                }`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentQuestion?.parentQuestionId ? 'Adaptive Follow-up Probe' : 'Technical Assessment Prompt'}
                </span>
                <button
                  onClick={handleRepeatQuestion}
                  className="text-xs font-semibold text-zinc-400 hover:text-blue-400 flex items-center gap-1 transition"
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

        {/* Right Column: Candidate Video Feed & Live Transcript Input (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Candidate Camera View with Responsible Engagement Overlay */}
          <div className="relative bg-[#121215] border border-[#27272a] rounded-3xl overflow-hidden shadow-lg flex flex-col justify-between min-h-[220px]">
            <div className="relative w-full h-48 sm:h-56 bg-[#0a0a0b] overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />

              {/* Responsible Visual Engagement Indicators (HUD) */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] font-semibold text-white/90 drop-shadow-md pointer-events-none">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm border border-white/10">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      visualState?.isCentered ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span>{visualState?.isCentered ? 'Framed & Centered' : 'Align Centered'}</span>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm border border-white/10">
                  <span>Light: {visualState?.lightingQuality || 'Good'}</span>
                  <span>•</span>
                  <span>Cam: {visualState?.stability || 'Stable'}</span>
                </div>
              </div>

              {/* Center Framing Guide Box */}
              <div className="absolute inset-x-1/4 inset-y-8 border-2 border-dashed border-white/20 rounded-2xl pointer-events-none" />

              {/* Ethics Label at bottom of video */}
              <div className="absolute bottom-2 inset-x-3 text-center pointer-events-none">
                <span className="px-2 py-0.5 bg-black/80 backdrop-blur-sm text-[9px] text-zinc-300 rounded-md border border-white/10">
                  🔒 Local Practice Telemetry Only • No Face Recognition
                </span>
              </div>
            </div>

            {/* Video & Mic Toggle Bar */}
            <div className="p-3 bg-[#18181c] flex items-center justify-between border-t border-[#27272a] text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`p-2 rounded-xl border transition ${
                    isMicOn
                      ? 'bg-[#202026] text-zinc-200 border-[#27272a]'
                      : 'bg-red-950/80 text-red-300 border-red-800'
                  }`}
                  title={isMicOn ? 'Mute Microphone' : 'Enable Microphone'}
                >
                  {isMicOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setIsCameraOn(!isCameraOn)}
                  className={`p-2 rounded-xl border transition ${
                    isCameraOn
                      ? 'bg-[#202026] text-zinc-200 border-[#27272a]'
                      : 'bg-[#202026]/50 text-zinc-500 border-[#27272a]'
                  }`}
                  title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  {isCameraOn ? <Video className="w-4 h-4 text-blue-400" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted Audio Channel</span>
              </div>
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
    </div>
  );
};
