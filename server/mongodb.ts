/**
 * MongoDB Atlas Connection & Mongoose Schemas for IntervAI
 * Mongo persistence is optional and only enabled when MONGODB_URI is explicitly configured.
 */

import mongoose, { Schema, Model } from 'mongoose';
import {
  User,
  Interview,
  Question,
  Answer,
  Evaluation,
  VisualEngagementMetrics,
  AssessmentReport,
  InterviewTemplate,
  ScoringConfig,
  IntegrityEvent
} from '../src/types/index.ts';

// Disable global buffering so operations fail immediately if not connected rather than hanging for 10s
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 3000);

export function getMongoUri(): string | null {
  const uri = (process.env.MONGODB_URI || '').trim();
  return uri || null;
}

function describeUri(uri: string): { cluster: string; database: string; uriMasked: string } {
  try {
    const parsed = new URL(uri);
    const hasCredentials = !!(parsed.username || parsed.password);
    const credentials = hasCredentials ? '****:****@' : '';
    return {
      cluster: parsed.host,
      database: parsed.pathname.replace(/^\//, '') || 'intervai',
      uriMasked: `${parsed.protocol}//${credentials}${parsed.host}${parsed.pathname}`
    };
  } catch {
    return { cluster: 'configured', database: 'intervai', uriMasked: 'MongoDB URI configured' };
  }
}

// Connection state tracker
export const mongoState = {
  connected: false,
  connecting: false,
  error: null as string | null,
  configured: false,
  mode: 'memory' as 'mongo' | 'memory',
  cluster: 'not configured',
  database: 'intervai',
  uriMasked: 'not configured',
  lastConnected: null as string | null
};

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// ----------------------------------------------------------------------------
// Mongoose Schemas & Models (with bufferCommands: false)
// ----------------------------------------------------------------------------

// 1. User Schema
export interface IUserModelData extends Omit<User, 'id'> {
  _id: string;
  id: string;
  passwordHash: string;
}

const UserSchema = new Schema<IUserModelData>({
  _id: { type: String, required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['candidate', 'admin'], default: 'candidate' },
  avatarUrl: { type: String },
  bio: { type: String },
  targetRole: { type: String },
  experienceLevel: { type: String, enum: ['entry', 'mid', 'senior', 'lead'], default: 'mid' },
  skills: [{ type: String }],
  consentCamera: { type: Boolean, default: true },
  consentMicrophone: { type: Boolean, default: true },
  consentAiEvaluation: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, bufferCommands: false });

// 2. Interview Schema
export interface IInterviewModelData extends Omit<Interview, 'id'> {
  _id: string;
  id: string;
}

const InterviewSchema = new Schema<IInterviewModelData>({
  _id: { type: String, required: true },
  id: { type: String, required: true },
  candidateId: { type: String, required: true, index: true },
  candidateName: { type: String, required: true },
  jobRole: { type: String, required: true },
  experienceLevel: { type: String, required: true },
  interviewType: { type: String, required: true },
  difficulty: { type: String, required: true },
  currentDifficulty: { type: String },
  skills: [{ type: String }],
  totalQuestions: { type: Number, default: 5 },
  durationMinutes: { type: Number, default: 20 },
  status: { type: String, enum: ['setup', 'in_progress', 'completed', 'abandoned'], default: 'setup' },
  startedAt: { type: String },
  completedAt: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, bufferCommands: false });

// 3. Question Schema
export interface IQuestionModelData extends Omit<Question, 'id'> {
  _id: string;
  id: string;
}

const QuestionSchema = new Schema<IQuestionModelData>({
  _id: { type: String, required: true },
  id: { type: String, required: true },
  interviewId: { type: String, required: true, index: true },
  orderIndex: { type: Number, required: true },
  questionText: { type: String, required: true },
  spokenLeadIn: { type: String },
  spokenDialogue: { type: String },
  category: { type: String, required: true },
  difficultyLevel: { type: String, required: true },
  expectedPoints: [{ type: String }],
  hints: { type: String },
  audioUrl: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, bufferCommands: false });

// 4. Answer Schema
export interface IAnswerModelData extends Omit<Answer, 'id'> {
  _id: string;
  id: string;
}

const AnswerSchema = new Schema<IAnswerModelData>({
  _id: { type: String, required: true },
  id: { type: String, required: true },
  interviewId: { type: String, required: true, index: true },
  questionId: { type: String, required: true },
  candidateId: { type: String, required: true },
  transcript: { type: String, required: true },
  audioDurationSeconds: { type: Number, default: 0 },
  timeSpentSeconds: { type: Number, default: 0 },
  inputMethod: { type: String, enum: ['voice', 'text_fallback'], default: 'voice' },
  submittedAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, bufferCommands: false });

// 5. Evaluation Schema
export interface IEvaluationModelData extends Omit<Evaluation, 'id'> {
  _id: string;
  id: string;
}

const EvaluationSchema = new Schema<IEvaluationModelData>({
  _id: { type: String, required: true },
  id: { type: String, required: true },
  answerId: { type: String, required: true },
  questionId: { type: String, required: true },
  interviewId: { type: String, required: true, index: true },
  technicalAccuracy: { type: Number, required: true },
  relevance: { type: Number, required: true },
  completeness: { type: Number, required: true },
  communication: { type: Number, required: true },
  reasoning: { type: Number, required: true },
  overallScore: { type: Number, required: true },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  feedback: { type: String, required: true },
  suggestedAnswer: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, bufferCommands: false });

// 6. Visual Engagement Metrics Schema
export interface IVisualMetricsModelData extends Omit<VisualEngagementMetrics, 'id'> {
  _id: string;
  id: string;
}

const VisualMetricsSchema = new Schema<IVisualMetricsModelData>({
  _id: { type: String, required: true },
  id: { type: String, required: true },
  interviewId: { type: String, required: true, unique: true, index: true },
  sampleCount: { type: Number, default: 0 },
  facePresenceRatio: { type: Number, default: 100 },
  cameraAvailabilityRatio: { type: Number, default: 100 },
  screenCenterOrientationRatio: { type: Number, default: 95 },
  lookingAwayCount: { type: Number, default: 0 },
  cameraStabilityScore: { type: Number, default: 90 },
  lightingQualityScore: { type: Number, default: 90 },
  overallEngagementScore: { type: Number, default: 90 },
  note: { type: String }
}, { timestamps: true, bufferCommands: false });

// 7. Assessment Report Schema
export interface IAssessmentReportModelData extends Omit<AssessmentReport, 'id'> {
  _id: string;
  id: string;
}

const AssessmentReportSchema = new Schema<IAssessmentReportModelData>({
  _id: { type: String, required: true },
  id: { type: String, required: true },
  interviewId: { type: String, required: true, unique: true, index: true },
  candidateId: { type: String, required: true, index: true },
  overallScore: { type: Number, required: true },
  technicalScore: { type: Number, required: true },
  communicationScore: { type: Number, required: true },
  reasoningScore: { type: Number, required: true },
  relevanceScore: { type: Number, required: true },
  completenessScore: { type: Number, required: true },
  visualEngagementScore: { type: Number, required: true },
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  recommendations: [{ type: String }],
  executiveSummary: { type: String, required: true },
  suggestedRoles: [{ type: String }],
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, bufferCommands: false });

// 8. Integrity Event Schema
export interface IIntegrityEventModelData extends Omit<IntegrityEvent, 'id'> {
  _id: string;
  id: string;
}

const IntegrityEventSchema = new Schema<IIntegrityEventModelData>({
  _id: { type: String, required: true },
  id: { type: String, required: true },
  interviewId: { type: String, required: true, index: true },
  eventType: { type: String, required: true },
  details: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true, bufferCommands: false });

// 9. Template Schema
export interface ITemplateModelData extends Omit<InterviewTemplate, 'id'> {
  _id: string;
  id: string;
}

const TemplateSchema = new Schema<ITemplateModelData>({
  _id: { type: String, required: true },
  id: { type: String, required: true },
  title: { type: String, required: true },
  jobRole: { type: String, required: true },
  experienceLevel: { type: String, required: true },
  interviewType: { type: String, required: true },
  defaultDifficulty: { type: String, required: true },
  skills: [{ type: String }],
  questionCount: { type: Number, default: 5 },
  durationMinutes: { type: Number, default: 20 },
  description: { type: String }
}, { timestamps: true, bufferCommands: false });

// 10. Scoring Config Schema
export interface IScoringConfigModelData extends Omit<ScoringConfig, 'id'> {
  _id: string;
  id: string;
}

const ScoringConfigSchema = new Schema<IScoringConfigModelData>({
  _id: { type: String, required: true, default: 'default' },
  id: { type: String, required: true, default: 'default' },
  weightTechnical: { type: Number, default: 0.35 },
  weightCommunication: { type: Number, default: 0.20 },
  weightReasoning: { type: Number, default: 0.20 },
  weightRelevance: { type: Number, default: 0.15 },
  weightCompleteness: { type: Number, default: 0.10 },
  weightVisualEngagement: { type: Number, default: 0.0 },
  passingScore: { type: Number, default: 70 }
}, { timestamps: true, bufferCommands: false });

// Models export
export const UserModel: Model<IUserModelData> =
  (mongoose.models.User as Model<IUserModelData>) || mongoose.model<IUserModelData>('User', UserSchema);

export const InterviewModel: Model<IInterviewModelData> =
  (mongoose.models.Interview as Model<IInterviewModelData>) || mongoose.model<IInterviewModelData>('Interview', InterviewSchema);

export const QuestionModel: Model<IQuestionModelData> =
  (mongoose.models.Question as Model<IQuestionModelData>) || mongoose.model<IQuestionModelData>('Question', QuestionSchema);

export const AnswerModel: Model<IAnswerModelData> =
  (mongoose.models.Answer as Model<IAnswerModelData>) || mongoose.model<IAnswerModelData>('Answer', AnswerSchema);

export const EvaluationModel: Model<IEvaluationModelData> =
  (mongoose.models.Evaluation as Model<IEvaluationModelData>) || mongoose.model<IEvaluationModelData>('Evaluation', EvaluationSchema);

export const VisualMetricsModel: Model<IVisualMetricsModelData> =
  (mongoose.models.VisualMetrics as Model<IVisualMetricsModelData>) || mongoose.model<IVisualMetricsModelData>('VisualMetrics', VisualMetricsSchema);

export const AssessmentReportModel: Model<IAssessmentReportModelData> =
  (mongoose.models.AssessmentReport as Model<IAssessmentReportModelData>) || mongoose.model<IAssessmentReportModelData>('AssessmentReport', AssessmentReportSchema);

export const IntegrityEventModel: Model<IIntegrityEventModelData> =
  (mongoose.models.IntegrityEvent as Model<IIntegrityEventModelData>) || mongoose.model<IIntegrityEventModelData>('IntegrityEvent', IntegrityEventSchema);

export const TemplateModel: Model<ITemplateModelData> =
  (mongoose.models.Template as Model<ITemplateModelData>) || mongoose.model<ITemplateModelData>('Template', TemplateSchema);

export const ScoringConfigModel: Model<IScoringConfigModelData> =
  (mongoose.models.ScoringConfig as Model<IScoringConfigModelData>) || mongoose.model<IScoringConfigModelData>('ScoringConfig', ScoringConfigSchema);

/**
 * Initialize MongoDB Connection with non-blocking resilience
 * - No MONGODB_URI configured: run in in-memory mode with a clear notice.
 * - Configured but connection fails: report the failure clearly, never silently fall back.
 */
export async function connectMongoDB(): Promise<boolean> {
  const uri = getMongoUri();

  if (!uri) {
    mongoState.configured = false;
    mongoState.mode = 'memory';
    mongoState.connected = false;
    mongoState.connecting = false;
    mongoState.cluster = 'not configured';
    mongoState.database = 'intervai';
    mongoState.uriMasked = 'not configured';
    console.warn(
      '[MongoDB] MONGODB_URI is not configured - running in in-memory-only mode. ' +
        'Set MONGODB_URI in your environment or .env to enable persistence.'
    );
    return false;
  }

  const descriptor = describeUri(uri);
  mongoState.configured = true;
  mongoState.mode = 'mongo';
  mongoState.cluster = descriptor.cluster;
  mongoState.database = descriptor.database;
  mongoState.uriMasked = descriptor.uriMasked;

  if (mongoose.connection.readyState === 1) {
    mongoState.connected = true;
    return true;
  }

  if (mongoState.connecting) {
    return false;
  }

  mongoState.connecting = true;
  console.log(`[MongoDB] Initiating connection to MongoDB cluster: ${descriptor.cluster}...`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      dbName: descriptor.database,
      bufferCommands: false
    });

    mongoState.connected = true;
    mongoState.connecting = false;
    mongoState.error = null;
    mongoState.lastConnected = new Date().toISOString();
    console.log(`[MongoDB] Connected to MongoDB database: ${descriptor.database}`);
    return true;
  } catch (err: any) {
    mongoState.connected = false;
    mongoState.connecting = false;
    mongoState.error = err?.message || 'Connection failed';
    console.error(
      `[MongoDB] Configured connection FAILED: ${err?.message || 'Connection failed'}. ` +
        'Data will NOT be persisted. Check MONGODB_URI and network access.'
    );
    return false;
  }
}

/**
 * Health check status helper
 */
export async function getMongoStatus() {
  const readyState = mongoose.connection.readyState;
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const configured = !!getMongoUri();
  const status = !configured ? 'not_configured' : states[readyState] || 'unknown';

  let pingMs: number | null = null;
  let counts = {
    users: 0,
    interviews: 0,
    questions: 0,
    answers: 0,
    evaluations: 0,
    reports: 0
  };

  if (readyState === 1 && mongoose.connection.db) {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      pingMs = Date.now() - start;

      counts.users = await UserModel.countDocuments().catch(() => 0);
      counts.interviews = await InterviewModel.countDocuments().catch(() => 0);
      counts.questions = await QuestionModel.countDocuments().catch(() => 0);
      counts.answers = await AnswerModel.countDocuments().catch(() => 0);
      counts.evaluations = await EvaluationModel.countDocuments().catch(() => 0);
      counts.reports = await AssessmentReportModel.countDocuments().catch(() => 0);
    } catch {
      // ignore ping errors
    }
  }

  const descriptor = configured && getMongoUri()
    ? describeUri(getMongoUri() as string)
    : { cluster: 'not configured', database: 'intervai', uriMasked: 'not configured - set MONGODB_URI' };

  return {
    status,
    connected: readyState === 1,
    configured,
    mode: configured ? mongoState.mode : 'memory',
    cluster: descriptor.cluster,
    database: descriptor.database,
    uriMasked: descriptor.uriMasked,
    pingMs,
    counts,
    lastConnected: mongoState.lastConnected,
    error: mongoState.error
  };
}
