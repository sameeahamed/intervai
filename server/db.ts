/**
 * High-Performance Durable Database Service for IntervAI
 * Powered by MongoDB Atlas with fast memory-caching
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
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
  IntegrityEvent,
  AdminAnalytics
} from '../src/types/index.ts';
import {
  connectMongoDB,
  UserModel,
  InterviewModel,
  QuestionModel,
  AnswerModel,
  EvaluationModel,
  VisualMetricsModel,
  AssessmentReportModel,
  IntegrityEventModel,
  TemplateModel,
  ScoringConfigModel,
  getMongoStatus,
  mongoState,
  isMongoConnected
} from './mongodb.ts';

// Safe non-blocking write helper to ensure zero buffering timeouts
function safeMongoWrite(opName: string, operation: () => Promise<any>) {
  if (!isMongoConnected()) {
    return;
  }
  operation().catch(err => {
    console.warn(`[MongoDB] ${opName} background write notice:`, err?.message || err);
  });
}

const SALT_LEN = 16;

function hashPassword(password: string): string {
  if (typeof password !== 'string') return '';
  const salt = randomBytes(SALT_LEN);
  const buf = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${buf.toString('base64')}`;
}

function verifyPassword(stored: string | undefined, supplied: string): boolean {
  if (!stored || typeof stored !== 'string') return false;
  try {
    const [scheme, saltB64, hashB64] = stored.split('$');
    if (scheme === 'scrypt' && saltB64 && hashB64) {
      const salt = Buffer.from(saltB64, 'base64');
      const hash = Buffer.from(hashB64, 'base64');
      const candidate = scryptSync(supplied, salt, 64);
      if (hash.length !== candidate.length) return false;
      return timingSafeEqual(hash, candidate);
    }
  } catch {
    return false;
  }
  // Legacy plaintext fallback
  return stored === supplied;
}

// In-Memory Synchronous Store for instant UI responses, backed by MongoDB
class Database {
  private users: Map<string, User> = new Map();
  private userPasswords: Map<string, string> = new Map(); // Store hashed/raw passwords
  private interviews: Map<string, Interview> = new Map();
  private questions: Map<string, Question[]> = new Map(); // key = interviewId
  private answers: Map<string, Answer[]> = new Map(); // key = interviewId
  private evaluations: Map<string, Evaluation[]> = new Map(); // key = interviewId
  private visualMetrics: Map<string, VisualEngagementMetrics> = new Map(); // key = interviewId
  private reports: Map<string, AssessmentReport> = new Map(); // key = interviewId
  private integrityEvents: Map<string, IntegrityEvent[]> = new Map(); // key = interviewId
  private templates: Map<string, InterviewTemplate> = new Map();
  private scoringConfig: ScoringConfig = {
    id: 'default',
    weightTechnical: 0.35,
    weightCommunication: 0.20,
    weightReasoning: 0.20,
    weightRelevance: 0.15,
    weightCompleteness: 0.10,
    weightVisualEngagement: 0.0,
    passingScore: 70
  };

  private isInitialized = false;

  constructor() {
    // Seed initial local defaults so the app is instantly responsive
    this.seedInitialLocalData();
    // Connect to MongoDB Atlas and sync
    this.initMongoSync();
  }

  private async initMongoSync() {
    try {
      const connected = await connectMongoDB();
      if (connected) {
        await this.syncFromMongoDB();
      }
    } catch (err: any) {
      console.warn('[DB] MongoDB initial sync notice:', err.message);
    }
  }

  /**
   * Sync collections from MongoDB Atlas into memory and seed if collection is empty
   */
  public async syncFromMongoDB() {
    try {
      // 1. Sync Users
      const mongoUsers = await UserModel.find({}).lean();
      if (mongoUsers.length > 0) {
        for (const u of mongoUsers) {
          const userObj: User = {
            id: u.id || (u as any)._id,
            name: u.name,
            email: u.email,
            role: (u.role as any) || 'candidate',
            avatarUrl: u.avatarUrl,
            bio: u.bio,
            targetRole: u.targetRole,
            experienceLevel: (u.experienceLevel as any) || 'mid',
            skills: u.skills || [],
            resumeText: u.resumeText,
            consentCamera: u.consentCamera,
            consentMicrophone: u.consentMicrophone,
            consentAiEvaluation: u.consentAiEvaluation,
            createdAt: u.createdAt
          };
          this.users.set(userObj.id, userObj);
          if ((u as any).passwordHash) {
            this.userPasswords.set(userObj.email.toLowerCase().trim(), (u as any).passwordHash);
          }
        }
        console.log(`[MongoDB] Synced ${mongoUsers.length} users from MongoDB Atlas.`);
      } else {
        // Seed default users to MongoDB
        await this.persistInitialDataToMongo();
      }

      // 2. Sync Templates
      const mongoTemplates = await TemplateModel.find({}).lean();
      if (mongoTemplates.length > 0) {
        for (const t of mongoTemplates) {
          this.templates.set(t.id || (t as any)._id, {
            id: t.id || (t as any)._id,
            title: t.title,
            jobRole: t.jobRole,
            experienceLevel: t.experienceLevel as any,
            interviewType: t.interviewType as any,
            defaultDifficulty: t.defaultDifficulty as any,
            skills: t.skills || [],
            questionCount: t.questionCount,
            durationMinutes: t.durationMinutes,
            description: t.description || ''
          });
        }
      }

      // 3. Sync Interviews
      const mongoInterviews = await InterviewModel.find({}).lean();
      for (const i of mongoInterviews) {
        const id = i.id || (i as any)._id;
        this.interviews.set(id, {
          id,
          candidateId: i.candidateId,
          candidateName: i.candidateName,
          jobRole: i.jobRole,
          experienceLevel: i.experienceLevel as any,
          interviewType: i.interviewType as any,
          difficulty: i.difficulty as any,
          currentDifficulty: i.currentDifficulty as any,
          skills: i.skills || [],
          jobDescription: i.jobDescription,
          isPractice: i.isPractice,
          totalQuestions: i.totalQuestions,
          durationMinutes: i.durationMinutes,
          status: i.status as any,
          startedAt: i.startedAt,
          completedAt: i.completedAt,
          createdAt: i.createdAt
        });
      }

      // 4. Sync Questions
      const mongoQuestions = await QuestionModel.find({}).lean();
      for (const q of mongoQuestions) {
        const intvId = q.interviewId;
        const list = this.questions.get(intvId) || [];
        list.push({
          id: q.id || (q as any)._id,
          interviewId: q.interviewId,
          orderIndex: q.orderIndex,
          parentQuestionId: q.parentQuestionId,
          questionText: q.questionText,
          category: q.category,
          difficultyLevel: q.difficultyLevel,
          expectedPoints: q.expectedPoints || [],
          hints: q.hints,
          audioUrl: q.audioUrl,
          createdAt: q.createdAt
        });
        this.questions.set(intvId, list);
      }

      // 5. Sync Answers
      const mongoAnswers = await AnswerModel.find({}).lean();
      for (const a of mongoAnswers) {
        const intvId = a.interviewId;
        const list = this.answers.get(intvId) || [];
        list.push({
          id: a.id || (a as any)._id,
          interviewId: a.interviewId,
          questionId: a.questionId,
          candidateId: a.candidateId,
          transcript: a.transcript,
          audioDurationSeconds: a.audioDurationSeconds || 0,
          timeSpentSeconds: a.timeSpentSeconds || 0,
          inputMethod: a.inputMethod as any,
          submittedAt: a.submittedAt
        });
        this.answers.set(intvId, list);
      }

      // 6. Sync Evaluations
      const mongoEvaluations = await EvaluationModel.find({}).lean();
      for (const e of mongoEvaluations) {
        const intvId = e.interviewId;
        const list = this.evaluations.get(intvId) || [];
        list.push({
          id: e.id || (e as any)._id,
          answerId: e.answerId,
          questionId: e.questionId,
          interviewId: e.interviewId,
          technicalAccuracy: e.technicalAccuracy,
          relevance: e.relevance,
          completeness: e.completeness,
          communication: e.communication,
          reasoning: e.reasoning,
          overallScore: e.overallScore,
          strengths: e.strengths || [],
          weaknesses: e.weaknesses || [],
          feedback: e.feedback,
          suggestedAnswer: e.suggestedAnswer,
          createdAt: e.createdAt
        });
        this.evaluations.set(intvId, list);
      }

      // 7. Sync Reports
      const mongoReports = await AssessmentReportModel.find({}).lean();
      for (const r of mongoReports) {
        this.reports.set(r.interviewId, {
          id: r.id || (r as any)._id,
          interviewId: r.interviewId,
          candidateId: r.candidateId,
          overallScore: r.overallScore,
          technicalScore: r.technicalScore,
          communicationScore: r.communicationScore,
          reasoningScore: r.reasoningScore,
          relevanceScore: r.relevanceScore,
          completenessScore: r.completenessScore,
          visualEngagementScore: r.visualEngagementScore,
          strengths: r.strengths || [],
          weaknesses: r.weaknesses || [],
          recommendations: r.recommendations || [],
          executiveSummary: r.executiveSummary,
          suggestedRoles: r.suggestedRoles || [],
          createdAt: r.createdAt
        });
      }

      // 8. Sync Visual Metrics
      const mongoMetrics = await VisualMetricsModel.find({}).lean();
      for (const vm of mongoMetrics) {
        this.visualMetrics.set(vm.interviewId, {
          id: vm.id || (vm as any)._id,
          interviewId: vm.interviewId,
          sampleCount: vm.sampleCount || 0,
          facePresenceRatio: vm.facePresenceRatio,
          cameraAvailabilityRatio: vm.cameraAvailabilityRatio,
          screenCenterOrientationRatio: vm.screenCenterOrientationRatio,
          lookingAwayCount: vm.lookingAwayCount || 0,
          cameraStabilityScore: vm.cameraStabilityScore,
          lightingQualityScore: vm.lightingQualityScore,
          overallEngagementScore: vm.overallEngagementScore,
          note: vm.note
        });
      }

      // 9. Sync Scoring Config
      const mongoConfig = await ScoringConfigModel.findOne({ id: 'default' }).lean();
      if (mongoConfig) {
        this.scoringConfig = {
          id: 'default',
          weightTechnical: mongoConfig.weightTechnical,
          weightCommunication: mongoConfig.weightCommunication,
          weightReasoning: mongoConfig.weightReasoning,
          weightRelevance: mongoConfig.weightRelevance,
          weightCompleteness: mongoConfig.weightCompleteness,
          weightVisualEngagement: mongoConfig.weightVisualEngagement,
          passingScore: mongoConfig.passingScore
        };
      }

      this.isInitialized = true;
      console.log(`[MongoDB] Atlas sync complete! Total records active.`);
    } catch (err: any) {
      console.error(`[MongoDB] Error syncing from MongoDB Atlas:`, err.message);
    }
  }

  private async persistInitialDataToMongo() {
    try {
      console.log('[MongoDB] Persisting default initial data to MongoDB Atlas collections...');
      // Persist Users
      for (const [id, user] of this.users.entries()) {
        const pass = this.userPasswords.get(user.email.toLowerCase().trim());
        if (!pass) {
          const hashed = hashPassword('candidate123');
          this.userPasswords.set(user.email.toLowerCase().trim(), hashed);
          await UserModel.findOneAndUpdate({ _id: id }, { _id: id, id, ...user, passwordHash: hashed }, { upsert: true, new: true }).exec();
          continue;
        }
        await UserModel.findOneAndUpdate({ _id: id }, { _id: id, id, ...user, passwordHash: pass }, { upsert: true, new: true }).exec();
      }

      // Persist Templates
      for (const [id, t] of this.templates.entries()) {
        await TemplateModel.findOneAndUpdate(
          { _id: id },
          { _id: id, id, ...t },
          { upsert: true, new: true }
        );
      }

      // Persist Scoring Config
      await ScoringConfigModel.findOneAndUpdate(
        { _id: 'default' },
        { _id: 'default', id: 'default', ...this.scoringConfig },
        { upsert: true, new: true }
      );

      // Persist Interviews
      for (const [id, intv] of this.interviews.entries()) {
        await InterviewModel.findOneAndUpdate(
          { _id: id },
          { _id: id, id, ...intv },
          { upsert: true, new: true }
        );
      }

      // Persist Questions
      for (const [intvId, qList] of this.questions.entries()) {
        for (const q of qList) {
          await QuestionModel.findOneAndUpdate(
            { _id: q.id },
            { _id: q.id, id: q.id, ...q },
            { upsert: true, new: true }
          );
        }
      }

      // Persist Answers
      for (const [intvId, aList] of this.answers.entries()) {
        for (const a of aList) {
          await AnswerModel.findOneAndUpdate(
            { _id: a.id },
            { _id: a.id, id: a.id, ...a },
            { upsert: true, new: true }
          );
        }
      }

      // Persist Evaluations
      for (const [intvId, eList] of this.evaluations.entries()) {
        for (const e of eList) {
          await EvaluationModel.findOneAndUpdate(
            { _id: e.id },
            { _id: e.id, id: e.id, ...e },
            { upsert: true, new: true }
          );
        }
      }

      // Persist Visual Metrics
      for (const [intvId, vm] of this.visualMetrics.entries()) {
        await VisualMetricsModel.findOneAndUpdate(
          { _id: vm.id },
          { _id: vm.id, id: vm.id, ...vm },
          { upsert: true, new: true }
        );
      }

      // Persist Reports
      for (const [intvId, r] of this.reports.entries()) {
        await AssessmentReportModel.findOneAndUpdate(
          { _id: r.id },
          { _id: r.id, id: r.id, ...r },
          { upsert: true, new: true }
        );
      }

      console.log('[MongoDB] All initial dataset written to MongoDB Atlas successfully.');
    } catch (err: any) {
      console.error('[MongoDB] Failed initial seed to Mongo:', err.message);
    }
  }

  private seedInitialLocalData() {
    // 1. Seed Default Users
    const candidateUser: User = {
      id: 'usr-cand-101',
      name: 'Alex Rivera',
      email: 'candidate@intervai.com',
      role: 'candidate',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Senior Software Engineer specializing in modern distributed systems, React, Node.js, and cloud architecture.',
      targetRole: 'Full-Stack Software Engineer',
      experienceLevel: 'senior',
      skills: ['React', 'TypeScript', 'Node.js', 'System Design', 'PostgreSQL', 'Docker', 'GraphQL'],
      consentCamera: true,
      consentMicrophone: true,
      consentAiEvaluation: true,
      createdAt: '2026-01-10T10:00:00Z'
    };
    this.users.set(candidateUser.id, candidateUser);
    this.userPasswords.set(candidateUser.email.toLowerCase(), hashPassword('candidate123'));

    const adminUser: User = {
      id: 'usr-admin-001',
      name: 'Dr. Sarah Vance',
      email: 'admin@intervai.com',
      role: 'admin',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      bio: 'Head of Talent Assessment & AI Systems Evaluation.',
      targetRole: 'Admin & Hiring Director',
      experienceLevel: 'lead',
      skills: ['Talent Analytics', 'Behavioral Assessment', 'System Architecture', 'Technical Hiring'],
      consentCamera: true,
      consentMicrophone: true,
      consentAiEvaluation: true,
      createdAt: '2026-01-01T08:00:00Z'
    };
    this.users.set(adminUser.id, adminUser);
    this.userPasswords.set(adminUser.email.toLowerCase(), hashPassword('admin123'));

    const demoCandidate2: User = {
      id: 'usr-cand-102',
      name: 'Liam Chen',
      email: 'liam.chen@tech.org',
      role: 'candidate',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'Frontend Specialist passionate about web performance and micro-frontends.',
      targetRole: 'Senior Frontend Developer',
      experienceLevel: 'mid',
      skills: ['React', 'Next.js', 'Tailwind CSS', 'Web Audio', 'Accessibility'],
      consentCamera: true,
      consentMicrophone: true,
      consentAiEvaluation: true,
      createdAt: '2026-02-01T12:00:00Z'
    };
    this.users.set(demoCandidate2.id, demoCandidate2);
    this.userPasswords.set(demoCandidate2.email.toLowerCase(), hashPassword('liam123'));

    // 2. Seed Interview Templates
    const templatesList: InterviewTemplate[] = [
      {
        id: 'tmpl-fs-sr',
        title: 'Senior Full-Stack Developer Assessment',
        jobRole: 'Full-Stack Developer',
        experienceLevel: 'senior',
        interviewType: 'technical',
        defaultDifficulty: 'adaptive',
        skills: ['React', 'Node.js', 'PostgreSQL', 'System Design', 'REST/GraphQL', 'Performance Optimization'],
        questionCount: 5,
        durationMinutes: 25,
        description: 'Evaluates architectural decision making, state management, database query optimization, and scalability.'
      },
      {
        id: 'tmpl-fe-mid',
        title: 'Modern Frontend Engineer Evaluation',
        jobRole: 'Frontend Developer',
        experienceLevel: 'mid',
        interviewType: 'technical',
        defaultDifficulty: 'medium',
        skills: ['TypeScript', 'React 19', 'Core Web Vitals', 'CSS Layouts', 'State Architecture'],
        questionCount: 5,
        durationMinutes: 20,
        description: 'Assesses component lifecycles, memory leak prevention, responsive UX design, and rendering performance.'
      },
      {
        id: 'tmpl-be-sr',
        title: 'Backend & Distributed Systems Interview',
        jobRole: 'Backend Developer',
        experienceLevel: 'senior',
        interviewType: 'technical',
        defaultDifficulty: 'hard',
        skills: ['Node.js/Go', 'PostgreSQL', 'Redis Caching', 'Microservices', 'Message Queues (Kafka/RabbitMQ)'],
        questionCount: 6,
        durationMinutes: 30,
        description: 'Deep dive into concurrency, high-throughput pipelines, database indexing, and resilience patterns.'
      },
      {
        id: 'tmpl-beh-lead',
        title: 'Leadership & Situational Competency',
        jobRole: 'Engineering Lead / Manager',
        experienceLevel: 'lead',
        interviewType: 'behavioral',
        defaultDifficulty: 'hard',
        skills: ['Conflict Resolution', 'Technical Strategy', 'Cross-functional Collaboration', 'Mentorship', 'Crisis Management'],
        questionCount: 4,
        durationMinutes: 20,
        description: 'Evaluates STAR-method situational judgment, team mentoring, incident response, and stakeholder alignment.'
      },
      {
        id: 'tmpl-data-analyst',
        title: 'Data Analyst & Insights Specialist',
        jobRole: 'Data Analyst',
        experienceLevel: 'mid',
        interviewType: 'mixed',
        defaultDifficulty: 'medium',
        skills: ['SQL Window Functions', 'Python/Pandas', 'Business Intelligence', 'Data Modeling', 'Storytelling'],
        questionCount: 5,
        durationMinutes: 20,
        description: 'Tests analytical thinking, complex SQL queries, metric definition, and translating raw data into business impact.'
      },
      {
        id: 'tmpl-devops-cloud',
        title: 'Cloud & DevOps Engineer Assessment',
        jobRole: 'Cloud Engineer',
        experienceLevel: 'senior',
        interviewType: 'technical',
        defaultDifficulty: 'hard',
        skills: ['Kubernetes', 'Terraform (IaC)', 'CI/CD Pipelines', 'AWS/GCP Cloud Architecture', 'Zero-Trust Security'],
        questionCount: 5,
        durationMinutes: 25,
        description: 'Covers infrastructure as code, container orchestration, zero-downtime deployments, and cloud security.'
      }
    ];

    templatesList.forEach(t => this.templates.set(t.id, t));

    // 3. Seed Completed Interview with Rich Report for Candidate (Alex Rivera)
    const completedInterviewId = 'int-alex-completed-01';
    const sampleInterview: Interview = {
      id: completedInterviewId,
      candidateId: candidateUser.id,
      candidateName: candidateUser.name,
      jobRole: 'Full-Stack Developer',
      experienceLevel: 'senior',
      interviewType: 'technical',
      difficulty: 'adaptive',
      currentDifficulty: 'hard',
      skills: ['React', 'TypeScript', 'Node.js', 'System Design', 'PostgreSQL'],
      totalQuestions: 4,
      durationMinutes: 20,
      status: 'completed',
      startedAt: '2026-02-20T14:00:00Z',
      completedAt: '2026-02-20T14:18:30Z',
      createdAt: '2026-02-20T13:58:00Z'
    };
    this.interviews.set(completedInterviewId, sampleInterview);

    // Questions for completed interview
    const q1: Question = {
      id: 'q-alex-1',
      interviewId: completedInterviewId,
      orderIndex: 1,
      questionText: 'Can you explain how you would design an event-driven architecture for high-volume real-time notification delivery, and how you would prevent duplicate messages?',
      category: 'System Architecture',
      difficultyLevel: 'medium',
      expectedPoints: [
        'Use of message broker (Kafka/RabbitMQ/Redis Streams)',
        'Idempotency keys on consumer side',
        'Dead letter queues for failures',
        'Database deduplication tracking'
      ]
    };
    const q2: Question = {
      id: 'q-alex-2',
      interviewId: completedInterviewId,
      orderIndex: 2,
      questionText: 'When working with PostgreSQL under heavy write loads, what strategies do you employ to minimize table lock contention and optimize index performance?',
      category: 'Database Optimization',
      difficultyLevel: 'hard',
      expectedPoints: [
        'Partitioning tables by date/hash',
        'Using BRIN or Partial Indexes',
        'Optimizing fillfactor and autovacuum tuning',
        'Connection pooling with PgBouncer'
      ]
    };
    const q3: Question = {
      id: 'q-alex-3',
      interviewId: completedInterviewId,
      orderIndex: 3,
      questionText: 'In React 19 and modern frontend stacks, how do you handle asynchronous state synchronization without introducing race conditions or memory leaks?',
      category: 'Frontend Architecture',
      difficultyLevel: 'hard',
      expectedPoints: [
        'AbortController for cancelling stale fetch requests',
        'React Transitions / useTransition / useActionState',
        'Optimistic updates with rollback mechanisms',
        'Cleanup functions in effect lifecycles'
      ]
    };
    const q4: Question = {
      id: 'q-alex-4',
      interviewId: completedInterviewId,
      orderIndex: 4,
      questionText: 'Tell me about a time when an unpredicted production outage occurred under your watch. How did you diagnose the root cause, mitigate user impact, and prevent recurrence?',
      category: 'Situational & Problem Solving',
      difficultyLevel: 'hard',
      expectedPoints: [
        'Rapid triage and rollback/kill switch usage',
        'Log correlation and distributed tracing',
        'Post-mortem root cause analysis',
        'Automated regression tests and alerting rules'
      ]
    };
    this.questions.set(completedInterviewId, [q1, q2, q3, q4]);

    // Answers for completed interview
    const a1: Answer = {
      id: 'ans-alex-1',
      interviewId: completedInterviewId,
      questionId: q1.id,
      candidateId: candidateUser.id,
      transcript: 'To build a high-volume notification system, I would use an event stream like Apache Kafka or Redis Streams. On the producer side, every event generates a unique UUID idempotency key. The consumer worker checks Redis or a PostgreSQL table using that key before dispatching the push or email notification. If processed, it acknowledges immediately. For resilience, we route failed attempts to a Dead Letter Queue with exponential backoff.',
      audioDurationSeconds: 45,
      timeSpentSeconds: 95,
      inputMethod: 'voice',
      submittedAt: '2026-02-20T14:04:30Z'
    };
    const a2: Answer = {
      id: 'ans-alex-2',
      interviewId: completedInterviewId,
      questionId: q2.id,
      candidateId: candidateUser.id,
      transcript: 'For PostgreSQL write contention, first I isolate reads using read replicas via PgBouncer pooling. For write bottlenecks, table partitioning by time range reduces index size dramatically. I also replace broad B-Trees with partial indexes or BRIN indexes where data is sequential. Tuning autovacuum scale factors and increasing WAL buffer size prevents vacuum stalls during peak throughput.',
      audioDurationSeconds: 42,
      timeSpentSeconds: 88,
      inputMethod: 'voice',
      submittedAt: '2026-02-20T14:09:15Z'
    };
    const a3: Answer = {
      id: 'ans-alex-3',
      interviewId: completedInterviewId,
      questionId: q3.id,
      candidateId: candidateUser.id,
      transcript: 'In modern React, race conditions often happen when fast user typing triggers overlapping network calls. I use AbortController signal bindings so whenever a new action initiates, prior in-flight requests are immediately cancelled. Furthermore, with React 19 actions and optimistic state, we commit tentative UI changes with clean rollback handlers upon network rejection.',
      audioDurationSeconds: 38,
      timeSpentSeconds: 80,
      inputMethod: 'voice',
      submittedAt: '2026-02-20T14:13:40Z'
    };
    const a4: Answer = {
      id: 'ans-alex-4',
      interviewId: completedInterviewId,
      questionId: q4.id,
      candidateId: candidateUser.id,
      transcript: 'During a Black Friday spike, a memory leak in an image processing worker caused container OOM crashes. My first priority was customer recovery: I triggered the feature flag to fallback to CDN pre-cached assets. Then using OpenTelemetry traces and heap snapshots, we located an unclosed stream in the worker. We patched the leak, deployed within 20 minutes, and later conducted a blameless post-mortem with automated memory limit alert thresholds.',
      audioDurationSeconds: 52,
      timeSpentSeconds: 110,
      inputMethod: 'voice',
      submittedAt: '2026-02-20T14:18:25Z'
    };
    this.answers.set(completedInterviewId, [a1, a2, a3, a4]);

    // Evaluations
    const ev1: Evaluation = {
      id: 'eval-alex-1',
      answerId: a1.id,
      questionId: q1.id,
      interviewId: completedInterviewId,
      technicalAccuracy: 92,
      relevance: 95,
      completeness: 90,
      communication: 94,
      reasoning: 90,
      overallScore: 92,
      strengths: [
        'Clear articulation of idempotency keys',
        'Appropriate choice of message brokers (Kafka/Redis)',
        'Mentioned Dead Letter Queue resilience'
      ],
      weaknesses: [
        'Could have briefly touched on schema evolution or protobuf serialization'
      ],
      feedback: 'Excellent breakdown of distributed event queuing and deduplication guarantees.',
      suggestedAnswer: 'A complete answer covers message brokering, unique idempotency keys with distributed lock/Redis checking, transactional outbox pattern for atomic database publishes, and dead-letter queues.'
    };
    const ev2: Evaluation = {
      id: 'eval-alex-2',
      answerId: a2.id,
      questionId: q2.id,
      interviewId: completedInterviewId,
      technicalAccuracy: 90,
      relevance: 92,
      completeness: 88,
      communication: 89,
      reasoning: 91,
      overallScore: 90,
      strengths: [
        'Specific mention of BRIN indexes and table partitioning',
        'Addressed connection pooling (PgBouncer) and autovacuum tuning'
      ],
      weaknesses: [
        'Could discuss unlogged tables for transient data or batch insert strategies'
      ],
      feedback: 'Very strong understanding of PostgreSQL storage internals and write-heavy mitigation.',
      suggestedAnswer: 'Highlight partitioning, partial/BRIN indexes, PgBouncer pooling, batch COPY commands, and tuning max_wal_size and autovacuum_vacuum_scale_factor.'
    };
    const ev3: Evaluation = {
      id: 'eval-alex-3',
      answerId: a3.id,
      questionId: q3.id,
      interviewId: completedInterviewId,
      technicalAccuracy: 88,
      relevance: 90,
      completeness: 86,
      communication: 92,
      reasoning: 88,
      overallScore: 89,
      strengths: [
        'Direct mention of AbortController integration',
        'Addressed optimistic updates and modern React 19 action patterns'
      ],
      weaknesses: [
        'Could expand on server-state management libraries like React Query caching'
      ],
      feedback: 'Solid, modern frontend understanding with clean explanations of asynchronous concurrency.',
      suggestedAnswer: 'Explain AbortController cancellation, state versioning/sequence IDs, React 19 optimistic updates, and avoiding setState on unmounted components.'
    };
    const ev4: Evaluation = {
      id: 'eval-alex-4',
      answerId: a4.id,
      questionId: q4.id,
      interviewId: completedInterviewId,
      technicalAccuracy: 94,
      relevance: 96,
      completeness: 92,
      communication: 95,
      reasoning: 94,
      overallScore: 94,
      strengths: [
        'Followed calm, structured triage: mitigation first, root cause second',
        'Used distributed tracing and heap snapshots effectively',
        'Instituted long-term prevention through blameless post-mortem and alert gates'
      ],
      weaknesses: [
        'Minor: could mention customer communication channels during the outage'
      ],
      feedback: 'Exceptional real-world incident management response with high maturity.',
      suggestedAnswer: 'Demonstrate rapid mitigation (kill switches/rollbacks), systematic root cause analysis with telemetry, clear stakeholder communication, and durable blameless post-mortems with preventative tests.'
    };
    this.evaluations.set(completedInterviewId, [ev1, ev2, ev3, ev4]);

    // Visual Metrics
    const visualMetrics: VisualEngagementMetrics = {
      id: 'vm-alex-01',
      interviewId: completedInterviewId,
      sampleCount: 42,
      facePresenceRatio: 98.5,
      cameraAvailabilityRatio: 100.0,
      screenCenterOrientationRatio: 94.2,
      lookingAwayCount: 2,
      cameraStabilityScore: 96.0,
      lightingQualityScore: 92.0,
      overallEngagementScore: 95.0,
      note: 'Observed continuous screen focus, stable camera frame, and optimal lighting throughout.'
    };
    this.visualMetrics.set(completedInterviewId, visualMetrics);

    // Assessment Report
    const report: AssessmentReport = {
      id: 'rep-alex-01',
      interviewId: completedInterviewId,
      candidateId: candidateUser.id,
      overallScore: 91,
      technicalScore: 91,
      communicationScore: 93,
      reasoningScore: 91,
      relevanceScore: 93,
      completenessScore: 89,
      visualEngagementScore: 95,
      strengths: [
        'Deep architectural command of event-driven distributed systems and Kafka deduplication',
        'Strong database engineering foundations including PostgreSQL index tuning and partitioning',
        'Calm, structured situational problem solving during production incident simulations',
        'Articulate, concise voice communication with high clarity and professional demeanor'
      ],
      weaknesses: [
        'Can provide slightly deeper quantitative benchmarks when describing scalability limits',
        'Opportunity to expand on edge caching and protobuf contracts in microservices'
      ],
      recommendations: [
        'Ready for Senior / Staff Software Engineer roles',
        'Recommend pairing technical design with documented architecture diagrams in live team sessions',
        'Continue exploring cutting-edge asynchronous concurrency patterns in React 19'
      ],
      executiveSummary: 'Alex demonstrated outstanding technical depth, crisp architectural reasoning, and exceptional poise throughout this 4-question adaptive technical interview. Overall evaluation score is in the top 5th percentile for Senior Full-Stack candidates.',
      suggestedRoles: ['Senior Full-Stack Engineer', 'Lead Systems Architect', 'Backend Platform Lead'],
      createdAt: '2026-02-20T14:18:35Z'
    };
    this.reports.set(completedInterviewId, report);
  }

  // --------------------------------------------------------------------------
  // User Management
  // --------------------------------------------------------------------------
  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUserByEmail(email: string): User | undefined {
    const targetEmail = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase().trim() === targetEmail) {
        return user;
      }
    }
    return undefined;
  }

  public authenticate(email: string, password: string): User | null {
    const user = this.getUserByEmail(email);
    if (!user) return null;
    const stored = this.userPasswords.get(email.toLowerCase().trim());
    if (verifyPassword(stored, password)) {
      // Safe legacy migration
      const normalized = email.toLowerCase().trim();
      const isLegacy = stored && !stored.startsWith('scrypt$');
      if (isLegacy) {
        const hashed = hashPassword(password);
        this.userPasswords.set(normalized, hashed);
        safeMongoWrite('Password hash upgrade', () =>
          UserModel.updateOne({ _id: user.id }, { $set: { passwordHash: hashed } }).exec()
        );
      }
      return user;
    }
    return null;
  }

  public registerUser(params: {
    name: string;
    email: string;
    password: string;
    role?: 'candidate' | 'admin';
    targetRole?: string;
    experienceLevel?: any;
    skills?: string[];
  }): User {
    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newUser: User = {
      id,
      name: params.name,
      email: params.email.toLowerCase().trim(),
      role: params.role || 'candidate',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(params.name)}`,
      targetRole: params.targetRole || 'Software Engineer',
      experienceLevel: params.experienceLevel || 'mid',
      skills: params.skills || ['JavaScript', 'Problem Solving'],
      consentCamera: true,
      consentMicrophone: true,
      consentAiEvaluation: true,
      createdAt: new Date().toISOString()
    };
    this.users.set(id, newUser);
    const passwordHash = hashPassword(params.password);
    this.userPasswords.set(newUser.email, passwordHash);

    // Asynchronously upsert to MongoDB
    safeMongoWrite('User registration save', () =>
      UserModel.findOneAndUpdate(
        { _id: id },
        { _id: id, id, ...newUser, passwordHash },
        { upsert: true, new: true }
      ).exec()
    );

    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.users.set(id, updated);

    // Asynchronously update in MongoDB
    safeMongoWrite('User update', () =>
      UserModel.updateOne({ _id: id }, { $set: updates }).exec()
    );

    return updated;
  }

  public getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  // --------------------------------------------------------------------------
  // Interview Management
  // --------------------------------------------------------------------------
  public createInterview(interview: Interview): Interview {
    this.interviews.set(interview.id, interview);
    this.questions.set(interview.id, []);
    this.answers.set(interview.id, []);
    this.evaluations.set(interview.id, []);

    // Asynchronously insert to MongoDB
    safeMongoWrite('Create interview', () =>
      InterviewModel.findOneAndUpdate(
        { _id: interview.id },
        { _id: interview.id, ...interview },
        { upsert: true, new: true }
      ).exec()
    );

    return interview;
  }

  public getInterview(id: string): Interview | undefined {
    const interview = this.interviews.get(id);
    if (!interview) return undefined;
    const questions = this.questions.get(id) || [];
    const answers = this.answers.get(id) || [];
    const evaluations = this.evaluations.get(id) || [];
    const visualMetrics = this.visualMetrics.get(id);
    const report = this.reports.get(id);

    return {
      ...interview,
      questions,
      answers,
      evaluations,
      visualMetrics,
      report
    };
  }

  public updateInterview(id: string, updates: Partial<Interview>): Interview | undefined {
    const existing = this.interviews.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.interviews.set(id, updated);

    // Asynchronously update MongoDB
    safeMongoWrite('Update interview', () =>
      InterviewModel.updateOne({ _id: id }, { $set: updates }).exec()
    );

    return updated;
  }

  public getCandidateInterviews(candidateId: string): Interview[] {
    const results: Interview[] = [];
    for (const intv of this.interviews.values()) {
      if (intv.candidateId === candidateId) {
        const full = this.getInterview(intv.id);
        if (full) results.push(full);
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllInterviews(): Interview[] {
    const list: Interview[] = [];
    for (const intv of this.interviews.values()) {
      const full = this.getInterview(intv.id);
      if (full) list.push(full);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --------------------------------------------------------------------------
  // Questions
  // --------------------------------------------------------------------------
  public addQuestion(question: Question): Question {
    const list = this.questions.get(question.interviewId) || [];
    list.push(question);
    this.questions.set(question.interviewId, list);

    // Asynchronously save to MongoDB
    safeMongoWrite('Add question', () =>
      QuestionModel.findOneAndUpdate(
        { _id: question.id },
        { _id: question.id, ...question },
        { upsert: true, new: true }
      ).exec()
    );

    return question;
  }

  public getQuestionsByInterview(interviewId: string): Question[] {
    return this.questions.get(interviewId) || [];
  }

  // --------------------------------------------------------------------------
  // Answers
  // --------------------------------------------------------------------------
  public addAnswer(answer: Answer): Answer {
    const list = this.answers.get(answer.interviewId) || [];
    list.push(answer);
    this.answers.set(answer.interviewId, list);

    // Asynchronously save to MongoDB
    safeMongoWrite('Add answer', () =>
      AnswerModel.findOneAndUpdate(
        { _id: answer.id },
        { _id: answer.id, ...answer },
        { upsert: true, new: true }
      ).exec()
    );

    return answer;
  }

  public getAnswersByInterview(interviewId: string): Answer[] {
    return this.answers.get(interviewId) || [];
  }

  // --------------------------------------------------------------------------
  // Evaluations
  // --------------------------------------------------------------------------
  public addEvaluation(evaluation: Evaluation): Evaluation {
    const list = this.evaluations.get(evaluation.interviewId) || [];
    list.push(evaluation);
    this.evaluations.set(evaluation.interviewId, list);

    // Asynchronously save to MongoDB
    safeMongoWrite('Add evaluation', () =>
      EvaluationModel.findOneAndUpdate(
        { _id: evaluation.id },
        { _id: evaluation.id, ...evaluation },
        { upsert: true, new: true }
      ).exec()
    );

    return evaluation;
  }

  public getEvaluationsByInterview(interviewId: string): Evaluation[] {
    return this.evaluations.get(interviewId) || [];
  }

  // --------------------------------------------------------------------------
  // Visual Metrics
  // --------------------------------------------------------------------------
  public saveVisualMetrics(metrics: VisualEngagementMetrics): VisualEngagementMetrics {
    this.visualMetrics.set(metrics.interviewId, metrics);

    // Asynchronously save to MongoDB
    safeMongoWrite('Save visual metrics', () =>
      VisualMetricsModel.findOneAndUpdate(
        { _id: metrics.id },
        { _id: metrics.id, ...metrics },
        { upsert: true, new: true }
      ).exec()
    );

    return metrics;
  }

  public getVisualMetrics(interviewId: string): VisualEngagementMetrics | undefined {
    return this.visualMetrics.get(interviewId);
  }

  // --------------------------------------------------------------------------
  // Integrity Events
  // --------------------------------------------------------------------------
  public recordIntegrityEvent(event: IntegrityEvent): IntegrityEvent {
    const list = this.integrityEvents.get(event.interviewId) || [];
    list.push(event);
    this.integrityEvents.set(event.interviewId, list);

    // Asynchronously save to MongoDB
    safeMongoWrite('Record integrity event', () =>
      IntegrityEventModel.findOneAndUpdate(
        { _id: event.id },
        { _id: event.id, ...event },
        { upsert: true, new: true }
      ).exec()
    );

    return event;
  }

  public getIntegrityEvents(interviewId: string): IntegrityEvent[] {
    return this.integrityEvents.get(interviewId) || [];
  }

  public getAllIntegrityEvents(): IntegrityEvent[] {
    const all: IntegrityEvent[] = [];
    for (const list of this.integrityEvents.values()) {
      all.push(...list);
    }
    return all.sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  // --------------------------------------------------------------------------
  // Reports
  // --------------------------------------------------------------------------
  public saveAssessmentReport(report: AssessmentReport): AssessmentReport {
    this.reports.set(report.interviewId, report);

    // Asynchronously save to MongoDB
    safeMongoWrite('Save assessment report', () =>
      AssessmentReportModel.findOneAndUpdate(
        { _id: report.id },
        { _id: report.id, ...report },
        { upsert: true, new: true }
      ).exec()
    );

    return report;
  }

  public getAssessmentReport(interviewId: string): AssessmentReport | undefined {
    return this.reports.get(interviewId);
  }

  // --------------------------------------------------------------------------
  // Templates
  // --------------------------------------------------------------------------
  public getAllTemplates(): InterviewTemplate[] {
    return Array.from(this.templates.values());
  }

  public getTemplateById(id: string): InterviewTemplate | undefined {
    return this.templates.get(id);
  }

  public createTemplate(template: InterviewTemplate): InterviewTemplate {
    this.templates.set(template.id, template);

    // Asynchronously save to MongoDB
    safeMongoWrite('Create template', () =>
      TemplateModel.findOneAndUpdate(
        { _id: template.id },
        { _id: template.id, ...template },
        { upsert: true, new: true }
      ).exec()
    );

    return template;
  }

  public deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    safeMongoWrite('Delete template', () =>
      TemplateModel.deleteOne({ _id: id }).exec()
    );
    return deleted;
  }

  // --------------------------------------------------------------------------
  // Scoring Config
  // --------------------------------------------------------------------------
  public getScoringConfig(): ScoringConfig {
    return { ...this.scoringConfig };
  }

  public updateScoringConfig(config: Partial<ScoringConfig>): ScoringConfig {
    this.scoringConfig = { ...this.scoringConfig, ...config };

    // Asynchronously update MongoDB
    safeMongoWrite('Update scoring config', () =>
      ScoringConfigModel.findOneAndUpdate(
        { _id: 'default' },
        { _id: 'default', id: 'default', ...this.scoringConfig },
        { upsert: true, new: true }
      ).exec()
    );

    return this.scoringConfig;
  }

  // --------------------------------------------------------------------------
  // Admin Analytics Aggregation
  // --------------------------------------------------------------------------
  public getAdminAnalytics(): AdminAnalytics {
    const all = this.getAllInterviews();
    const completed = all.filter(i => i.status === 'completed');
    const candidates = Array.from(this.users.values()).filter(u => u.role === 'candidate');

    const totalScores = completed.map(c => c.report?.overallScore || 0);
    const avgScore = totalScores.length > 0
      ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length)
      : 0;

    // Average voice assessment duration (minutes) from real timestamps
    const avgDurationMinutes =
      completed.length > 0
        ? Math.round(
            (completed.reduce((acc, c) => {
              const start = new Date(c.createdAt).getTime();
              const end = new Date(c.completedAt || c.createdAt).getTime();
              return acc + (Number.isFinite(start) && Number.isFinite(end) ? (end - start) / 60000 : 0);
            }, 0) /
              completed.length) *
              10
          ) / 10
        : 0;

    // Role breakdown
    const roleMap: Record<string, { count: number; totalScore: number }> = {};
    completed.forEach(i => {
      if (!roleMap[i.jobRole]) roleMap[i.jobRole] = { count: 0, totalScore: 0 };
      roleMap[i.jobRole].count++;
      roleMap[i.jobRole].totalScore += (i.report?.overallScore || 0);
    });

    const roleDistribution = Object.entries(roleMap).map(([role, val]) => ({
      role,
      count: val.count,
      avgScore: Math.round(val.totalScore / (val.count || 1))
    }));

    // Difficulty breakdown
    const diffMap: Record<string, number> = { easy: 0, medium: 0, hard: 0, adaptive: 0 };
    all.forEach(i => {
      diffMap[i.difficulty] = (diffMap[i.difficulty] || 0) + 1;
    });
    const difficultyDistribution = Object.entries(diffMap).map(([difficulty, count]) => ({
      difficulty,
      count
    }));

    // Score ranges
    const scoreRanges = [
      { range: '90-100%', count: 0 },
      { range: '80-89%', count: 0 },
      { range: '70-79%', count: 0 },
      { range: '60-69%', count: 0 },
      { range: '<60%', count: 0 }
    ];

    completed.forEach(c => {
      const score = c.report?.overallScore || 0;
      if (score >= 90) scoreRanges[0].count++;
      else if (score >= 80) scoreRanges[1].count++;
      else if (score >= 70) scoreRanges[2].count++;
      else if (score >= 60) scoreRanges[3].count++;
      else scoreRanges[4].count++;
    });

    let totalIntegrityFlags = 0;
    for (const list of this.integrityEvents.values()) {
      totalIntegrityFlags += list.length;
    }

    return {
      totalInterviews: all.length,
      completedInterviews: completed.length,
      totalCandidates: candidates.length,
      averageScore: avgScore,
      averageDurationMinutes: avgDurationMinutes,
      roleDistribution,
      difficultyDistribution,
      scoreDistribution: scoreRanges,
      recentInterviews: all.slice(0, 10),
      integrityFlaggedCount: totalIntegrityFlags
    };
  }

  // --------------------------------------------------------------------------
  // Purge Candidate Data (GDPR / Privacy Compliance)
  // --------------------------------------------------------------------------
  public purgeCandidateData(candidateId: string): boolean {
    const candidateInterviews = this.getCandidateInterviews(candidateId);
    candidateInterviews.forEach(intv => {
      this.interviews.delete(intv.id);
      this.questions.delete(intv.id);
      this.answers.delete(intv.id);
      this.evaluations.delete(intv.id);
      this.visualMetrics.delete(intv.id);
      this.reports.delete(intv.id);
      this.integrityEvents.delete(intv.id);

      // Delete from MongoDB collections
      InterviewModel.deleteOne({ _id: intv.id }).catch(() => {});
      QuestionModel.deleteMany({ interviewId: intv.id }).catch(() => {});
      AnswerModel.deleteMany({ interviewId: intv.id }).catch(() => {});
      EvaluationModel.deleteMany({ interviewId: intv.id }).catch(() => {});
      VisualMetricsModel.deleteOne({ interviewId: intv.id }).catch(() => {});
      AssessmentReportModel.deleteOne({ interviewId: intv.id }).catch(() => {});
      IntegrityEventModel.deleteMany({ interviewId: intv.id }).catch(() => {});
    });

    return true;
  }
}

export const db = new Database();
export { getMongoStatus };
