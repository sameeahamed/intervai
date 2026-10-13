/**
 * High-Converting SaaS Landing Page for IntervAI
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Mic,
  Brain,
  Video,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Play,
  Volume2,
  HelpCircle,
  Users,
  Award,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AudioWaveform } from '../common/AudioWaveform.tsx';

interface LandingPageProps {
  onStartInterview: () => void;
  onOpenPrivacy: () => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartInterview,
  onOpenPrivacy,
  onOpenAuth,
}) => {
  const [demoSpeaking, setDemoSpeaking] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const handleTestVoice = () => {
    if (demoSpeaking) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setDemoSpeaking(false);
      return;
    }

    setDemoSpeaking(true);
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(
        'Welcome to IntervAI! I will be your AI interviewer today. Whenever you are ready, configure your target role and let us begin.'
      );
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onend = () => setDemoSpeaking(false);
      u.onerror = () => setDemoSpeaking(false);
      window.speechSynthesis.speak(u);
    } else {
      setTimeout(() => setDemoSpeaking(false), 4000);
    }
  };

  const faqs = [
    {
      q: 'How does the real-time AI voice interaction work?',
      a: 'IntervAI combines high-fidelity Text-to-Speech synthesis with browser-level continuous Speech-to-Text. The AI interviewer speaks questions aloud, listens to your verbal responses via your microphone, displays live transcripts, and dynamically evaluates your answers.',
    },
    {
      q: 'What is adaptive questioning?',
      a: 'The AI dynamically calibrates follow-up questions based on your previous answers, performance scores, and identified technical gaps. If you excel, it challenges you with deeper architectural trade-offs; if you struggle, it probes foundational concepts.',
    },
    {
      q: 'How is candidate privacy and camera analysis handled?',
      a: 'Camera video is processed entirely client-side inside your browser for basic practice feedback (lighting, camera stability, and screen orientation). We strictly guarantee zero facial recognition, zero biometric storage, and zero psychological or honesty profiling.',
    },
    {
      q: 'What job roles and interview types are supported?',
      a: 'IntervAI supports 12+ pre-configured roles—including Full-Stack, Frontend, Backend, Data Analyst, Cloud/DevOps, UI/UX, and Cybersecurity—as well as custom roles. Interview types include Technical, HR, Behavioral, Situational, and Mixed.',
    },
  ];

  return (
    <div className="w-full bg-[#0a0a0b] text-[#e5e7eb] selection:bg-blue-600 selection:text-white">
      {/* 1. HERO SECTION */}
      <section className="relative pt-16 pb-24 overflow-hidden border-b border-[#27272a]">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Next-Generation AI Voice Interview Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Master Your Next Interview with{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                Conversational AI
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
              Practice real-time spoken voice interviews with an adaptive AI assessor. Receive instant structured feedback on technical accuracy, communication, reasoning, and presentation.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                id="btn-hero-start"
                onClick={onStartInterview}
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2.5 group"
              >
                <span>Launch Interview Room</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                id="btn-hero-demo-voice"
                onClick={handleTestVoice}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#18181c] hover:bg-[#202026] text-zinc-200 border border-[#27272a] font-semibold text-base rounded-2xl transition flex items-center justify-center gap-2"
              >
                <Volume2 className={`w-4 h-4 ${demoSpeaking ? 'text-blue-400 animate-pulse' : ''}`} />
                <span>{demoSpeaking ? 'Listening to AI Voice...' : 'Preview AI Voice'}</span>
              </button>
            </div>

            {/* Mini Waveform preview */}
            {demoSpeaking && (
              <div className="pt-2 animate-fade-in max-w-xs mx-auto">
                <AudioWaveform voiceState="ai_speaking" />
              </div>
            )}

            {/* Feature Pills */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Real-Time Voice STT & TTS</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Adaptive Dynamic Difficulty</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero Facial Recognition</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Comprehensive PDF/CSV Reports</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORE CAPABILITIES */}
      <section className="py-20 bg-[#0d0d10] border-b border-[#27272a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              End-to-End Interview Intelligence
            </h2>
            <p className="text-sm text-zinc-400 mt-2">
              Designed to simulate real-world hiring loops with rigor, speed, and objective feedback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 bg-[#121215] border border-[#27272a] rounded-2xl hover:border-zinc-700 transition space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-950/80 text-blue-400 flex items-center justify-center border border-blue-800/60">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Real-Time Voice Loop</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Natural AI spoken prompts and continuous speech-to-text listener. Speak your answers freely without manual typing bottlenecks.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 bg-[#121215] border border-[#27272a] rounded-2xl hover:border-zinc-700 transition space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 text-indigo-400 flex items-center justify-center border border-indigo-800/60">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Adaptive Difficulty Engine</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                AI adjusts question complexity dynamically based on previous answer completeness and identified technical weaknesses.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 bg-[#121215] border border-[#27272a] rounded-2xl hover:border-zinc-700 transition space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 text-purple-400 flex items-center justify-center border border-purple-800/60">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Visual Engagement Signals</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Local in-browser frame analysis measures lighting quality, camera stability, and center framing for presentation confidence.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 bg-[#121215] border border-[#27272a] rounded-2xl hover:border-zinc-700 transition space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-800/60">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Multi-Dimensional Scoring</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Instant breakdown of Technical Accuracy, Relevance, Completeness, Communication, and Reasoning with exemplar model answers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="py-20 border-b border-[#27272a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">How It Works</h2>
            <p className="text-sm text-zinc-400 mt-2">
              From configuration to comprehensive performance scorecard in 4 steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="relative p-6 bg-[#121215] border border-[#27272a] rounded-2xl">
              <div className="text-3xl font-extrabold text-blue-500/30 mb-2">01</div>
              <h4 className="font-bold text-white text-base mb-1">Select Role & Skills</h4>
              <p className="text-xs text-zinc-400">
                Choose from 12+ industry roles, experience levels, interview types, and customize skill focus areas.
              </p>
            </div>

            <div className="relative p-6 bg-[#121215] border border-[#27272a] rounded-2xl">
              <div className="text-3xl font-extrabold text-indigo-500/30 mb-2">02</div>
              <h4 className="font-bold text-white text-base mb-1">Enter Interview Room</h4>
              <p className="text-xs text-zinc-400">
                Connect your microphone and camera with clear permission checks and zero-bias privacy guarantees.
              </p>
            </div>

            <div className="relative p-6 bg-[#121215] border border-[#27272a] rounded-2xl">
              <div className="text-3xl font-extrabold text-purple-500/30 mb-2">03</div>
              <h4 className="font-bold text-white text-base mb-1">Speak & Converse</h4>
              <p className="text-xs text-zinc-400">
                AI interviewer speaks questions aloud. Answer verbally with real-time transcription and adaptive follow-ups.
              </p>
            </div>

            <div className="relative p-6 bg-[#121215] border border-[#27272a] rounded-2xl">
              <div className="text-3xl font-extrabold text-emerald-500/30 mb-2">04</div>
              <h4 className="font-bold text-white text-base mb-1">Get Detailed Report</h4>
              <p className="text-xs text-zinc-400">
                Inspect radar competency charts, question-by-question feedback, model answers, and export to PDF/CSV.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRIVACY & ETHICAL AI HIGHLIGHT */}
      <section className="py-16 bg-blue-950/20 border-b border-[#27272a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-950/80 border border-blue-800/60 text-blue-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-bold text-white">Strict Responsible AI & Privacy Guarantee</h3>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            IntervAI is engineered with ethical AI standards. We process camera feeds entirely client-side, never store raw candidate video on external servers, and strictly prohibit face recognition or psychological inferences.
          </p>
          <button
            onClick={onOpenPrivacy}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4"
          >
            Read our Complete Privacy & AI Transparency Charter →
          </button>
        </div>
      </section>

      {/* 5. INTERACTIVE FAQ */}
      <section className="py-20 border-b border-[#27272a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-zinc-400 mt-1">Everything you need to know about IntervAI</p>
          </div>

          <div className="space-y-3">
            {faqs.map((f, idx) => (
              <div
                key={idx}
                className="border border-[#27272a] rounded-2xl bg-[#121215] overflow-hidden"
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between text-sm font-semibold text-zinc-200 hover:text-white transition"
                >
                  <span>{f.q}</span>
                  {faqOpen === idx ? (
                    <ChevronUp className="w-4 h-4 text-blue-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                </button>
                {faqOpen === idx && (
                  <div className="px-6 pb-4 text-xs text-zinc-400 leading-relaxed border-t border-[#27272a] pt-3">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. BOTTOM CALL TO ACTION */}
      <section className="py-20 bg-gradient-to-b from-[#121215] to-[#0a0a0b] text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Ready to Experience the Future of Interview Preparation?
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Try an adaptive AI voice interview session in your browser now. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={onStartInterview}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base rounded-2xl shadow-xl shadow-blue-600/30 transition flex items-center gap-2"
            >
              <Mic className="w-5 h-5" />
              Start Free Interview Practice
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
