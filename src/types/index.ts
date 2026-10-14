/**
 * TypeScript Interfaces and Types for IntervAI Platform
 */

export type UserRole = 'candidate' | 'admin';

export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead';

export type InterviewType = 'technical' | 'hr' | 'behavioral' | 'situational' | 'mixed';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'adaptive';

export type InterviewStatus = 'setup' | 'in_progress' | 'completed' | 'abandoned';

export type VoiceState = 'idle' | 'ai_speaking' | 'listening' | 'processing' | 'evaluating' | 'next_question' | 'loading';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  targetRole?: string;
  experienceLevel?: ExperienceLevel;
  skills?: string[];
  resumeText?: string;
  resumeFileName?: string;
  resumeUpdatedAt?: string;
  consentCamera?: boolean;
  consentMicrophone?: boolean;
  consentAiEvaluation?: boolean;
  createdAt?: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  jobRole: string;
  experienceLevel: ExperienceLevel;
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
  currentDifficulty?: DifficultyLevel;
  skills: string[];
  jobDescription?: string;
  isPractice?: boolean;
  totalQuestions: number;
  durationMinutes: number;
  status: InterviewStatus;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  questions?: Question[];
  answers?: Answer[];
  evaluations?: Evaluation[];
  visualMetrics?: VisualEngagementMetrics;
  report?: AssessmentReport;
}

export interface Question {
  id: string;
  interviewId: string;
  orderIndex: number;
  parentQuestionId?: string;
  questionText: string;
  spokenLeadIn?: string;
  spokenDialogue?: string;
  category: string;
  difficultyLevel: string;
  expectedPoints?: string[];
  hints?: string;
  audioUrl?: string;
  createdAt?: string;
  aiSource?: 'gemini' | 'fallback';
}

export interface Answer {
  id: string;
  interviewId: string;
  questionId: string;
  candidateId: string;
  transcript: string;
  audioDurationSeconds: number;
  timeSpentSeconds: number;
  inputMethod: 'voice' | 'text_fallback';
  submittedAt: string;
  evaluation?: Evaluation;
}

export interface Evaluation {
  id: string;
  answerId: string;
  questionId: string;
  interviewId: string;
  technicalAccuracy: number; // 0 - 100
  relevance: number;        // 0 - 100
  completeness: number;     // 0 - 100
  communication: number;    // 0 - 100
  reasoning: number;        // 0 - 100
  overallScore: number;     // 0 - 100
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  suggestedAnswer: string;
  createdAt?: string;
  aiSource?: 'gemini' | 'fallback';
}

export interface VisualEngagementMetrics {
  id: string;
  interviewId: string;
  sampleCount: number;
  facePresenceRatio: number;          // 0 - 100%
  cameraAvailabilityRatio: number;    // 0 - 100%
  screenCenterOrientationRatio: number; // 0 - 100%
  lookingAwayCount: number;
  cameraStabilityScore: number;       // 0 - 100
  lightingQualityScore: number;       // 0 - 100
  overallEngagementScore: number;     // 0 - 100
  note?: string;
}

export interface IntegrityEvent {
  id: string;
  interviewId: string;
  eventType: 'tab_blur' | 'tab_focus' | 'cam_disconnect' | 'mic_disconnect' | 'long_pause';
  details?: string;
  createdAt: string;
}

export interface AssessmentReport {
  id: string;
  interviewId: string;
  candidateId: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  reasoningScore: number;
  relevanceScore: number;
  completenessScore: number;
  visualEngagementScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  executiveSummary: string;
  suggestedRoles?: string[];
  createdAt: string;
  aiSource?: 'gemini' | 'fallback';
}

export interface InterviewTemplate {
  id: string;
  title: string;
  jobRole: string;
  experienceLevel: ExperienceLevel;
  interviewType: InterviewType;
  defaultDifficulty: DifficultyLevel;
  skills: string[];
  questionCount: number;
  durationMinutes: number;
  description: string;
}

export interface ScoringConfig {
  id: string;
  weightTechnical: number;
  weightCommunication: number;
  weightReasoning: number;
  weightRelevance: number;
  weightCompleteness: number;
  weightVisualEngagement: number;
  passingScore: number;
}

export interface AdminAnalytics {
  totalInterviews: number;
  completedInterviews: number;
  totalCandidates: number;
  averageScore: number;
  averageDurationMinutes: number;
  roleDistribution: { role: string; count: number; avgScore: number }[];
  difficultyDistribution: { difficulty: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
  recentInterviews: Interview[];
  integrityFlaggedCount: number;
}
