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
  ArrowRight,
  Volume2,
  CircleCheck,
  Sparkle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AudioWaveform } from '../common/AudioWaveform.tsx';

interface LandingPageProps {
  onStartInterview: () => void;
  onOpenPrivacy: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartInterview,
  onOpenPrivacy,
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
    <div className="landing-page w-full bg-[#0a0a0b] text-[#e5e7eb] selection:bg-blue-600 selection:text-white">
      {/* 1. HERO SECTION */}
      <section className="landing-hero relative overflow-hidden border-b border-[#27272a]">
        <div className="landing-hero-glow landing-hero-glow-one" />
        <div className="landing-hero-glow landing-hero-glow-two" />

        <div className="landing-hero-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow">
              <Sparkles className="w-4 h-4" />
              <span>Practice that sounds like the real thing</span>
            </div>

            <h1 className="landing-title">
              Walk into your next interview <span>ready to speak.</span>
            </h1>

            <p className="landing-subtitle">
              Build confidence through realistic voice interviews, then get clear feedback on how you think, explain, and solve problems.
            </p>

            <div className="landing-actions">
              <button
                id="btn-hero-start"
                onClick={onStartInterview}
                className="landing-primary group"
              >
                <span>Start a practice interview</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                id="btn-hero-demo-voice"
                onClick={handleTestVoice}
                className="landing-secondary"
              >
                <Volume2 className={`w-4 h-4 ${demoSpeaking ? 'text-blue-500 animate-pulse' : ''}`} />
                <span>{demoSpeaking ? 'Playing interviewer voice…' : 'Hear the interviewer'}</span>
              </button>
            </div>

            {demoSpeaking && (
              <div className="landing-waveform animate-fade-in">
                <AudioWaveform voiceState="ai_speaking" />
              </div>
            )}

            <div className="landing-trust-row" aria-label="Practice features">
              <span><CircleCheck /> Adaptive questions</span>
              <span><CircleCheck /> Private by design</span>
              <span><CircleCheck /> Useful feedback</span>
            </div>
          </div>

          <div className="landing-visual" aria-label="Example interview session preview">
            <div className="landing-orbit landing-orbit-one" />
            <div className="landing-orbit landing-orbit-two" />
            <div className="landing-session-card">
              <div className="landing-session-topline">
                <div className="landing-session-brand">
                  <span className="landing-session-mark"><Sparkle /></span>
                  <span><strong>Practice room</strong><small>Full-stack engineer</small></span>
                </div>
                <span className="landing-session-status"><i /> SESSION PREVIEW</span>
              </div>

              <div className="landing-question-label"><span>01</span> YOUR INTERVIEWER ASKS</div>
              <p className="landing-question">“Tell me about a technical decision you made that improved a product.”</p>

              <div className="landing-voice-row">
                <div className="landing-avatar"><Sparkles /></div>
                <div className="landing-voice-content">
                  <div className="landing-voice-copy"><span>IntervAI</span><small>{demoSpeaking ? 'Speaking now' : 'Voice interview'}</small></div>
                  <div className="landing-bars" aria-hidden="true">
                    {[14, 23, 17, 30, 20, 36, 24, 15, 28, 18, 32, 21, 13, 25, 17, 31, 19, 12, 26, 16, 22, 14, 29, 18, 24, 13, 20, 30, 16, 23, 12, 27, 18, 22, 14, 31, 17, 25, 13, 20].map((height, index) => (
                      <span key={index} style={{ height: `${height}px` }} />
                    ))}
                  </div>
                </div>
                <span className="landing-audio-icon"><Volume2 /></span>
              </div>

              <div className="landing-answer-hint">
                <span className="landing-mic"><Mic /></span>
                <span><strong>Your turn to answer</strong><small>Speak naturally. Take a moment to think.</small></span>
                <span className="landing-answer-arrow"><ArrowRight /></span>
              </div>

              <div className="landing-feedback-strip">
                <span><Brain /> Thoughtful follow-ups</span>
                <span><BarChart3 /> Feedback you can use</span>
              </div>
            </div>
            <div className="landing-floating-note"><span><ShieldCheck /></span><div><strong>Your practice stays yours</strong><small>No facial recognition. Ever.</small></div></div>
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
