/**
 * Interview Setup Wizard - Role, Difficulty, Skills, and Hardware Checks
 */

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { VoiceService } from '../../services/voice.ts';
import { extractSkillsFromText } from '../../utils/personalization.ts';
import { VisionService, VisualAnalysisState } from '../../services/vision.ts';
import {
  Mic,
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Volume2,
  Layers,
  Clock,
  HelpCircle,
  X,
  Plus,
  FileText
} from 'lucide-react';

interface InterviewSetupProps {
  onInterviewCreated: (interviewId: string) => void;
  onCancel: () => void;
  onOpenPrivacy: () => void;
}

const PRESET_ROLES = [
  'Full-Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Data Analyst / Scientist',
  'Cloud / DevOps Engineer',
  'Cybersecurity Analyst',
  'UI/UX Designer',
  'Mobile Developer (iOS/Android)',
  'Product Manager',
  'Human Resources (HR) Specialist',
  'Marketing & Growth Strategist',
  'Custom Role',
];

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  'Full-Stack Developer': ['React', 'Node.js', 'PostgreSQL', 'System Design', 'TypeScript', 'REST APIs', 'Docker'],
  'Frontend Developer': ['React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'State Management', 'Web Performance'],
  'Backend Developer': ['Node.js / Express', 'Databases & Indexing', 'Microservices', 'Distributed Systems', 'Caching (Redis)'],
  'Data Analyst / Scientist': ['SQL', 'Python', 'Pandas', 'Statistical Analysis', 'Tableau / BI', 'Machine Learning'],
  'Cloud / DevOps Engineer': ['AWS / GCP', 'Kubernetes', 'CI/CD Pipelines', 'Terraform', 'Docker', 'Monitoring'],
  'Cybersecurity Analyst': ['Threat Modeling', 'OWASP Top 10', 'Network Security', 'Cryptography', 'Incident Response'],
  'UI/UX Designer': ['Figma', 'User Research', 'Design Systems', 'Usability Testing', 'Wireframing & Prototyping'],
  'Mobile Developer (iOS/Android)': ['Swift / Kotlin', 'React Native', 'Mobile UI Patterns', 'Offline Storage', 'API Integration'],
  'Product Manager': ['Product Discovery', 'Roadmapping', 'Prioritization', 'Product Analytics', 'Experiment Design'],
  'Human Resources (HR) Specialist': ['Talent Acquisition', 'Structured Interviewing', 'Employee Relations', 'People Analytics', 'Workforce Planning'],
  'Marketing & Growth Strategist': ['Growth Experiments', 'Funnel Analytics', 'Content Strategy', 'SEO / Paid Media', 'Customer Segmentation'],
};

// Flat, de-duplicated vocabulary used for optional job-description skill prefill.
const SKILL_VOCABULARY: string[] = Array.from(
  new Set(Object.values(SKILL_SUGGESTIONS).flat())
);

export const InterviewSetup: React.FC<InterviewSetupProps> = ({
  onInterviewCreated,
  onCancel,
  onOpenPrivacy,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState<number>(1);

  // Form State
  const [jobRole, setJobRole] = useState<string>('Full-Stack Developer');
  const [customRole, setCustomRole] = useState<string>('');
  const [experienceLevel, setExperienceLevel] = useState<'entry' | 'mid' | 'senior' | 'lead'>('mid');
  const [interviewType, setInterviewType] = useState<'technical' | 'hr' | 'behavioral' | 'situational' | 'mixed'>('technical');
  const [difficulty, setDifficulty] = useState<'adaptive' | 'easy' | 'medium' | 'hard'>('adaptive');
  const [skills, setSkills] = useState<string[]>(['React', 'Node.js', 'PostgreSQL', 'System Design']);
  const [newSkillInput, setNewSkillInput] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [durationMinutes, setDurationMinutes] = useState<number>(20);
  const [isPractice, setIsPractice] = useState<boolean>(false);
  const [consentAccepted, setConsentAccepted] = useState<boolean>(false);

  // Hardware Checks
  const [micActive, setMicActive] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [visualState, setVisualState] = useState<VisualAnalysisState | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const visionServiceRef = useRef<VisionService | null>(null);
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hardwareCheckRunRef = useRef<number>(0);

  // Update skills when role changes
  const handleRoleChange = (role: string) => {
    setJobRole(role);
    // Replace role defaults as a unit so skills from the previous role never
    // silently leak into the interview focus. Custom roles start with no tags.
    setSkills(SKILL_SUGGESTIONS[role] || []);
  };

  const handleAddSkill = () => {
    if (newSkillInput.trim() && !skills.includes(newSkillInput.trim())) {
      setSkills([...skills, newSkillInput.trim()]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  // Optional prefill: detect known skills from the pasted job description.
  // The detected values are merged into the editable skills list; the candidate
  // can still remove or add entries before launching.
  const handlePrefillFromJd = () => {
    const detected = extractSkillsFromText(jobDescription, SKILL_VOCABULARY);
    if (detected.length === 0) return;
    setSkills((prev) => {
      const merged = [...prev];
      detected.forEach((d) => {
        if (!merged.some((m) => m.toLowerCase() === d.toLowerCase())) merged.push(d);
      });
      return merged;
    });
  };

  // Hardware test triggers
  const startHardwareCheck = async () => {
    const runId = ++hardwareCheckRunRef.current;
    setMicError(null);
    setCameraError(null);

    // 1. Microphone test
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (runId !== hardwareCheckRunRef.current) {
        audioStream.getTracks().forEach((track) => track.stop());
        return;
      }
      micStreamRef.current = audioStream;
      voiceServiceRef.current = new VoiceService();
      await voiceServiceRef.current.initMicAnalyser(audioStream);
      if (runId !== hardwareCheckRunRef.current) return;
      setMicActive(true);

      const checkVolume = () => {
        if (voiceServiceRef.current) {
          const vol = voiceServiceRef.current.getAudioVolumeLevel();
          setMicVolume(vol);
        }
        animFrameRef.current = requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err: any) {
      if (runId === hardwareCheckRunRef.current) {
        setMicError('Microphone access denied or unavailable. You can still use Text Fallback mode.');
        setMicActive(false);
      }
    }

    // 2. Camera test
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (runId !== hardwareCheckRunRef.current) {
        videoStream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = videoStream;
      setCameraStream(videoStream);
      setCameraActive(true);
    } catch (err: any) {
      if (runId === hardwareCheckRunRef.current) {
        setCameraError('Camera access denied or unavailable (optional for practice feedback).');
        setCameraActive(false);
      }
    }
  };

  const stopHardwareCheck = () => {
    hardwareCheckRunRef.current += 1;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (visionServiceRef.current) {
      visionServiceRef.current.dispose();
      visionServiceRef.current = null;
    }
    if (voiceServiceRef.current) {
      voiceServiceRef.current.cleanup();
      voiceServiceRef.current = null;
    }
  };

  useEffect(() => {
    if (step === 2 && consentAccepted) {
      void startHardwareCheck();
    } else {
      stopHardwareCheck();
      if (step === 2) {
        setMicActive(false);
        setCameraActive(false);
        setCameraStream(null);
        setMicVolume(0);
        setVisualState(null);
      }
    }
    return () => stopHardwareCheck();
  }, [step, consentAccepted]);

  useEffect(() => {
    const video = videoRef.current;
    if (step !== 2 || !consentAccepted || !cameraActive || !cameraStream || !video) return;

    video.srcObject = cameraStream;
    void video.play().catch(() => {});

    const vision = new VisionService();
    vision.bindVideo(video, setVisualState);
    visionServiceRef.current = vision;
    vision.startAnalysis(800);

    return () => {
      vision.dispose();
      if (visionServiceRef.current === vision) visionServiceRef.current = null;
      if (video.srcObject === cameraStream) video.srcObject = null;
    };
  }, [step, consentAccepted, cameraActive, cameraStream]);

  const handleLaunchInterview = async () => {
    if (!consentAccepted) {
      setServerError('Please review and accept the privacy & responsible AI consent before proceeding.');
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      const targetJobRole = jobRole === 'Custom Role' && customRole ? customRole : jobRole;
      const created = await api.createInterview({
        jobRole: targetJobRole,
        experienceLevel,
        interviewType,
        difficulty,
        skills,
        totalQuestions,
        durationMinutes,
        jobDescription: jobDescription.trim() || undefined,
        isPractice: isPractice || undefined,
      });

      // Start interview session
      await api.startInterview(created.id);
      onInterviewCreated(created.id);
    } catch (err: any) {
      setServerError(err.message || 'Failed to initialize interview. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="interview-setup max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-[#e5e7eb]">
      {/* Wizard Card Container */}
      <div className="bg-[#121215] border border-[#27272a] rounded-3xl shadow-xl p-6 sm:p-10 space-y-8">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60 rounded-full">
                Step {step} of 2
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {step === 1 && 'Interview Setup'}
                {step === 2 && 'Device Check & Consent'}
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Configure your adaptive AI voice interview parameters
            </p>
          </div>

          <button
            onClick={onCancel}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-[#27272a] hover:bg-[#18181c] transition"
          >
            Cancel
          </button>
        </div>

        {serverError && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{serverError}</span>
          </div>
        )}

        {/* STEP 1: ROLE, EXPERIENCE, AND ASSESSMENT SETTINGS */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Role Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                Select Target Job Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleChange(role)}
                    className={`p-3.5 text-left text-xs font-semibold rounded-2xl border transition flex items-center justify-between ${
                      jobRole === role
                        ? 'bg-blue-950/70 text-blue-300 border-blue-500 ring-1 ring-blue-500/40'
                        : 'bg-[#18181c] text-zinc-300 border-[#27272a] hover:bg-[#202026] hover:border-zinc-700'
                    }`}
                  >
                    <span>{role}</span>
                    {jobRole === role && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </button>
                ))}
              </div>

              {jobRole === 'Custom Role' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Enter custom job title (e.g. AI Research Engineer)"
                    className="w-full px-4 py-2.5 text-sm bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                Experience Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'entry', label: 'Entry Level', desc: '0 - 2 yrs' },
                  { id: 'mid', label: 'Mid Level', desc: '2 - 5 yrs' },
                  { id: 'senior', label: 'Senior', desc: '5 - 8 yrs' },
                  { id: 'lead', label: 'Staff / Lead', desc: '8+ yrs' },
                ].map((exp) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => setExperienceLevel(exp.id as any)}
                    className={`p-3 text-center rounded-2xl border transition ${
                      experienceLevel === exp.id
                        ? 'bg-blue-950/70 text-blue-300 border-blue-500 ring-1 ring-blue-500/40'
                        : 'bg-[#18181c] text-zinc-300 border-[#27272a] hover:bg-[#202026] hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{exp.label}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{exp.desc}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {step === 1 && (
          <div className="interview-setup-divider"><span>Assessment details</span></div>
        )}

        {/* Remaining setup fields share step 1 to reduce the pre-interview flow. */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Practice / Ungraded Mode Toggle */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition ${
                isPractice ? 'bg-amber-950/30 border-amber-800/60' : 'bg-[#18181c] border-[#27272a]'
              }`}
            >
              <div className="flex items-start gap-3">
                <Sparkles className={`w-5 h-5 mt-0.5 shrink-0 ${isPractice ? 'text-amber-400' : 'text-zinc-500'}`} />
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    Practice / Warm-up Mode
                    {isPractice && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60">
                        Ungraded
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Run through the interview with no official scores, evaluation, or report. You can re-record answers freely. Excluded from your analytics.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPractice}
                aria-label="Toggle practice mode"
                onClick={() => setIsPractice(!isPractice)}
                className={`relative w-12 h-6 rounded-full transition shrink-0 ${
                  isPractice ? 'bg-amber-500' : 'bg-[#27272a]'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    isPractice ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            {/* Interview Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                Interview Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: 'technical', label: 'Technical' },
                  { id: 'behavioral', label: 'Behavioral' },
                  { id: 'situational', label: 'Situational' },
                  { id: 'hr', label: 'HR / Culture' },
                  { id: 'mixed', label: 'Mixed Hybrid' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInterviewType(t.id as any)}
                    className={`py-2.5 px-3 text-center text-xs font-bold rounded-xl border transition ${
                      interviewType === t.id
                        ? 'bg-blue-950/70 text-blue-300 border-blue-500'
                        : 'bg-[#18181c] text-zinc-300 border-[#27272a] hover:bg-[#202026]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Calibration */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                Difficulty Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  { id: 'adaptive', label: '⚡ Adaptive Dynamic', desc: 'AI auto-adjusts based on answer quality' },
                  { id: 'easy', label: 'Standard / Easy', desc: 'Core fundamentals & conceptual focus' },
                  { id: 'medium', label: 'Challenging / Mid', desc: 'Practical trade-offs & implementations' },
                  { id: 'hard', label: 'Expert / Hard', desc: 'Architecture, failure modes & scale' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id as any)}
                    className={`p-3 text-left rounded-2xl border transition ${
                      difficulty === d.id
                        ? 'bg-blue-950/70 text-blue-300 border-blue-500 ring-1 ring-blue-500/40'
                        : 'bg-[#18181c] text-zinc-300 border-[#27272a] hover:bg-[#202026]'
                    }`}
                  >
                    <div className="text-xs font-bold">{d.label}</div>
                    <div className="text-[10px] text-zinc-400 mt-1 leading-tight">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Skills Tags */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                Target Competencies & Focus Skills ({skills.length})
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#18181c] text-zinc-200 text-xs font-medium rounded-full border border-[#27272a]"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  placeholder="Add custom skill (e.g. GraphQL, AWS, Concurrency)..."
                  className="flex-1 px-3.5 py-2 text-xs bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-4 py-2 bg-[#202026] text-zinc-200 hover:bg-[#27272f] text-xs font-semibold rounded-xl border border-[#27272a] flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* Job Description (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Job Description / Role Context (Optional)
                </label>
                <button
                  type="button"
                  onClick={handlePrefillFromJd}
                  disabled={!jobDescription.trim()}
                  className="px-3 py-1.5 bg-[#202026] text-zinc-200 hover:bg-[#27272f] text-[11px] font-semibold rounded-lg border border-[#27272a] flex items-center gap-1 transition disabled:opacity-40"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-detect skills
                </button>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={5}
                maxLength={8000}
                placeholder="Paste the target job description. Used only to tailor question topics for THIS interview."
                className="w-full px-3.5 py-2.5 text-xs bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-zinc-500">
                  Treated as untrusted input; not used as instructions. Do not paste sensitive personal data.
                </p>
                <span className="text-[10px] text-zinc-500 shrink-0 ml-2">{jobDescription.length}/8000</span>
              </div>
            </div>

            {/* Resume personalization status */}
            <div className="p-3.5 rounded-xl border border-[#27272a] bg-[#18181c] flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                {user?.resumeText ? (
                  <p className="text-zinc-300">
                    A resume is on file
                    {user.resumeFileName ? (
                      <>
                        {' '}
                        (<span className="text-zinc-100 font-medium">{user.resumeFileName}</span>)
                      </>
                    ) : null}
                    . Questions will be personalised to it. Manage or remove it in your profile.
                  </p>
                ) : (
                  <p className="text-zinc-400">
                    No resume on file. Upload a PDF resume in your profile to personalise question topics to your
                    experience.
                  </p>
                )}
              </div>
            </div>

            {/* Questions & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                  Number of Questions
                </label>
                <div className="flex gap-2">
                  {[3, 5, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTotalQuestions(num)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                        totalQuestions === num
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-[#18181c] text-zinc-300 border-[#27272a] hover:bg-[#202026]'
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
                  Target Duration
                </label>
                <div className="flex gap-2">
                  {[10, 15, 20, 30].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setDurationMinutes(min)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                        durationMinutes === min
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-[#18181c] text-zinc-300 border-[#27272a] hover:bg-[#202026]'
                      }`}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  if (jobRole === 'Custom Role' && !customRole.trim()) {
                    setServerError('Enter your custom job role to continue.');
                    return;
                  }
                  setServerError(null);
                  setStep(2);
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
              >
                <span>Review and start interview</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DEVICE VERIFICATION & ETHICAL CONSENT */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mic Test Card */}
              <div className="p-5 bg-[#18181c] border border-[#27272a] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Microphone Check</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      micActive
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                    }`}
                  >
                    {micActive ? 'Mic Connected' : consentAccepted ? 'Text Fallback Ready' : 'Awaiting consent'}
                  </span>
                </div>

                <p className="text-xs text-zinc-400">
                  {consentAccepted
                    ? 'Speak into your microphone. Watch the live volume level bar respond to your voice.'
                    : 'Accept the privacy consent below to check your microphone. Text fallback is available if the mic is unavailable.'}
                </p>

                {/* Volume meter bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                    <span>Input Volume</span>
                    <span>{micVolume}%</span>
                  </div>
                  <div className="w-full h-3 bg-[#27272a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75 rounded-full"
                      style={{ width: `${Math.max(4, micVolume)}%` }}
                    />
                  </div>
                </div>

                {micError && (
                  <p className="text-[11px] text-amber-400 mt-1">{micError}</p>
                )}
              </div>

              {/* Camera Test Card */}
              <div className="p-5 bg-[#18181c] border border-[#27272a] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-blue-400" />
                    <h4 className="text-sm font-bold text-white">Camera Mirror</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      cameraActive
                        ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                        : 'bg-[#27272a] text-zinc-400'
                    }`}
                  >
                    {cameraActive ? 'Camera Active' : 'Optional'}
                  </span>
                </div>

                <div className="relative w-full h-32 bg-[#0a0a0b] rounded-xl overflow-hidden flex items-center justify-center border border-[#27272a]">
                  {cameraActive && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover -scale-x-100"
                    />
                  )}
                  {!cameraActive && (
                    <span className="text-xs text-zinc-500">Camera preview not active (optional)</span>
                  )}
                </div>

              {cameraActive && visualState && (
                <p
                  role="status"
                  aria-live="polite"
                  className={`text-[11px] leading-relaxed ${
                    visualState.faceDetectionStatus === 'error' || visualState.faceCount === 0 || (visualState.faceCount ?? 0) > 1
                      ? 'text-red-500 dark:text-red-300'
                      : visualState.faceDetectionStatus === 'ready' && visualState.isCentered
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {visualState.faceDetectionStatus === 'error'
                    ? visualState.faceDetectionError || 'Face detection is unavailable. You can continue without it.'
                    : visualState.faceDetectionStatus !== 'ready'
                    ? 'Loading local face check… Video frames stay on this device.'
                    : visualState.faceCount === 0
                    ? 'No face detected. Move into view and face the camera.'
                    : (visualState.faceCount ?? 0) > 1
                    ? 'More than one face detected. Please make sure only you are in frame.'
                    : visualState.isCentered
                    ? 'One face detected and centered. Face count is checked locally and is not saved.'
                    : 'One face detected. Center yourself in the camera guide.'}
                </p>
              )}

                {cameraError && (
                  <p className="text-[11px] text-zinc-400">{cameraError}</p>
                )}
              </div>
            </div>

            {isPractice && (
              <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-2xl text-[11px] text-amber-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  This is a <strong className="text-amber-100">practice / warm-up session</strong>. Your answers are not scored and no official
                  assessment report or analytics will be generated.
                </span>
              </div>
            )}

            {/* Consent & Ethics Checkbox */}
            <div className="p-4 bg-blue-950/30 border border-blue-900/50 rounded-2xl space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-blue-600 rounded border-zinc-700 bg-zinc-900 focus:ring-blue-500"
                />
                <span className="text-xs text-zinc-300 leading-relaxed">
                  I acknowledge that my spoken responses will be evaluated by AI models for structured interview feedback. If I enable the camera, face count and framing are checked locally; images and face counts are not uploaded or stored. No face identification or psychological profiling is performed. Aggregate camera metrics may appear in my report.{' '}
                  <button
                    type="button"
                    onClick={onOpenPrivacy}
                    className="text-blue-400 hover:text-blue-300 font-semibold underline"
                  >
                    Read Policy
                  </button>
                </span>
              </label>
            </div>

            {/* Launch Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 text-zinc-300 hover:bg-[#18181c] text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="button"
                id="btn-launch-room"
                onClick={handleLaunchInterview}
                disabled={loading || !consentAccepted}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-blue-600/30 transition flex items-center gap-2.5 disabled:opacity-50"
              >
                <Mic className="w-4 h-4" />
                <span>{loading ? 'Initializing AI Assessor Room...' : 'Enter AI Voice Interview Room'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
