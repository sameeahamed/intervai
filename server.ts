/**
 * IntervAI - Full-Stack Express Server with Vite Middleware
 * Handles Auth, AI Orchestration, Adaptive Interview Session Lifecycle, Reports, and Analytics
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, getMongoStatus } from './server/db.ts';
import { connectMongoDB } from './server/mongodb.ts';
import {
  generateNextAdaptiveQuestion,
  evaluateCandidateAnswer,
  generateFinalAssessmentReport,
  generateSpeechAudio
} from './server/ai.ts';
import { Interview, Question, Answer, VisualEngagementMetrics, IntegrityEvent, User } from './src/types/index.ts';
import { createAuthToken, isAuthSecretEphemeral, verifyAuthToken } from './server/auth.ts';

// Helper for lightweight JWT-like token extraction
interface AuthenticatedRequest extends Request {
  user?: any;
}

function parseAuthToken(req: Request): any | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  const user = db.getUserById(payload.userId);
  if (!user) return null;
  return user;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = parseAuthToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in to proceed.' });
  }
  req.user = user;
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = parseAuthToken(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
  }
  req.user = user;
  next();
}

// ---------------------------------------------------------------------------
// Lightweight in-memory rate limiting (per-process, best-effort).
// Documented limits:
//   - Login:            10 attempts / 15 min per (client IP + email)
//   - Forgot password:   5 requests / 60 min per client IP
//   - Reset password:   10 attempts / 60 min per client IP
// Counters live only for the life of the process; a restart clears them.
// ---------------------------------------------------------------------------
const LOGIN_RATE_LIMIT = { max: 10, windowMs: 15 * 60 * 1000 };
const FORGOT_RATE_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };
const RESET_RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = typeof raw === 'string' ? raw.split(',')[0].trim() : '';
  return first || req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (bucket.count >= max) return true;
  bucket.count += 1;
  return false;
}

const activePrefetches = new Set<string>();

// Untrusted free-text (resume / job description) normalization: trim, cap length,
// and return undefined when empty so callers can omit the field entirely.
const MAX_UNTRUSTED_TEXT_CHARS = 20000;
function cleanUntrustedText(value: unknown, max: number = MAX_UNTRUSTED_TEXT_CHARS): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) return undefined;
  return normalized.length > max ? normalized.slice(0, max) : normalized;
}

function getCandidateResumeForInterview(interview: Interview): string | undefined {
  return db.getUserById(interview.candidateId)?.resumeText;
}

// Top-level (template) questions only; adaptive follow-ups carry a parentQuestionId
// and must never advance the interview's numbered progression.
function getTopLevelQuestions(interviewId: string): Question[] {
  return db
    .getQuestionsByInterview(interviewId)
    .filter(q => !q.parentQuestionId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

function getAnsweredTopLevelCount(interviewId: string): number {
  const topLevelIds = new Set(getTopLevelQuestions(interviewId).map(q => q.id));
  const answers = db.getAnswersByInterview(interviewId);
  const answeredIds = new Set(answers.filter(a => topLevelIds.has(a.questionId)).map(a => a.questionId));
  return answeredIds.size;
}

// Server-enforced follow-up nesting depth: 0 for a base question, 1 for a
// first-level probe, 2 for a probe-of-a-probe. The server never exceeds 2.
function getQuestionDepth(interviewId: string, questionId: string): number {
  const questions = db.getQuestionsByInterview(interviewId);
  const byId = new Map(questions.map(q => [q.id, q]));
  const seen = new Set<string>();
  let current = byId.get(questionId);
  let depth = 0;
  while (current && current.parentQuestionId && !seen.has(current.id)) {
    seen.add(current.id);
    depth += 1;
    current = byId.get(current.parentQuestionId);
  }
  return depth;
}

async function prefetchNextQuestion(interviewId: string) {
  if (activePrefetches.has(interviewId)) return;

  const interview = db.getInterview(interviewId);
  if (!interview) return;

  const topLevel = getTopLevelQuestions(interview.id);
  const answeredTopLevel = getAnsweredTopLevelCount(interview.id);

  // If there is already an unanswered top-level question prepared or max reached, stop
  if (topLevel.length > answeredTopLevel || topLevel.length >= interview.totalQuestions) {
    return;
  }

  const nextOrderIndex = topLevel.length + 1;
  activePrefetches.add(interviewId);

  try {
    const questionData = await generateNextAdaptiveQuestion({
      interview,
      previousQuestions: db.getQuestionsByInterview(interview.id),
      previousAnswers: db.getAnswersByInterview(interview.id),
      previousEvaluations: db.getEvaluationsByInterview(interview.id),
      orderIndex: nextOrderIndex,
      candidateResume: getCandidateResumeForInterview(interview),
    });

    if (getTopLevelQuestions(interview.id).length < nextOrderIndex) {
      const newQuestion: Question = {
        id: `q-${interview.id}-${nextOrderIndex}-${Math.random().toString(36).substring(2, 5)}`,
        interviewId: interview.id,
        orderIndex: nextOrderIndex,
        questionText: questionData.questionText,
        spokenLeadIn: questionData.spokenLeadIn,
        spokenDialogue: questionData.spokenDialogue,
        category: questionData.category,
        difficultyLevel: questionData.difficultyLevel,
        expectedPoints: questionData.expectedPoints,
        hints: questionData.hints,
        createdAt: new Date().toISOString(),
      };
      db.addQuestion(newQuestion);
    }
  } catch (err: any) {
    console.warn(`[Prefetch Notice] Background prefetch for ${interviewId} (Q${nextOrderIndex}):`, err?.message || err);
  } finally {
    activePrefetches.delete(interviewId);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // ==========================================
  // 1. HEALTH & SYSTEM STATUS & MONGODB ATLAS
  // ==========================================
  app.get('/api/health', async (req, res) => {
    const mongo = await getMongoStatus();
    res.json({
      status: 'healthy',
      service: 'IntervAI Platform API',
      timestamp: new Date().toISOString(),
      aiReady: !!(process.env.GEMINI_API_KEY || process.env.AI_API_KEY),
      database: {
        type: 'MongoDB Atlas',
        cluster: mongo.cluster,
        dbName: mongo.database,
        status: mongo.status,
        connected: mongo.connected,
        pingMs: mongo.pingMs,
        collections: mongo.counts
      }
    });
  });

  app.get('/api/database/status', async (req, res) => {
    try {
      const status = await getMongoStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/database/sync', requireAdmin, async (req, res) => {
    try {
      await connectMongoDB();
      await db.syncFromMongoDB();
      const status = await getMongoStatus();
      res.json({ success: true, message: 'MongoDB Atlas synced successfully', status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 2. AUTHENTICATION ROUTES
  // ==========================================
  app.post('/api/auth/register', (req, res) => {
    try {
      const { name, email, password, role, targetRole, experienceLevel, skills } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      const existing = db.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      const user = db.registerUser({
        name,
        email,
        password,
        role: 'candidate',
        targetRole,
        experienceLevel,
        skills
      });

      const token = createAuthToken({ id: user.id, email: user.email, role: user.role });
      res.status(201).json({ user, token });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Failed to register account.' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const loginKey = `login:${clientIp(req)}:${String(email).toLowerCase().trim()}`;
      if (isRateLimited(loginKey, LOGIN_RATE_LIMIT.max, LOGIN_RATE_LIMIT.windowMs)) {
        return res.status(429).json({ error: 'Too many login attempts. Please wait a few minutes and try again.' });
      }

      const user = db.authenticate(email, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = createAuthToken({ id: user.id, email: user.email, role: user.role });
      res.json({ user, token });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login authentication failed.' });
    }
  });

  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    const user = parseAuthToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    res.json({ user });
  });

  // Only whitelisted, self-editable profile fields are accepted. Identity and
  // privilege fields (id, email, role, password) can never be modified here.
  const ALLOWED_PROFILE_FIELDS = [
    'name',
    'bio',
    'targetRole',
    'experienceLevel',
    'skills',
    'resumeText',
    'avatarUrl',
    'consentCamera',
    'consentMicrophone',
    'consentAiEvaluation'
  ] as const;

  app.put('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body || {};
      const updates: Record<string, any> = {};
      for (const field of ALLOWED_PROFILE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          updates[field] = body[field];
        }
      }

      if (typeof updates.name === 'string') {
        updates.name = updates.name.trim();
        if (!updates.name) delete updates.name;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'skills') && !Array.isArray(updates.skills)) {
        delete updates.skills;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid profile fields were provided.' });
      }

      const updated = db.updateUser(req.user.id, updates as Partial<User>);
      res.json({ user: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  });

  // Request a password reset. The public response is always identical so it can
  // never be used to determine whether an account exists. A reset link is only
  // surfaced in the response for local development (NODE_ENV !== 'production')
  // where SMTP is not configured; production never returns the token.
  const GENERIC_FORGOT_MESSAGE =
    'If an account exists for that email, a password reset link has been sent.';

  app.post('/api/auth/forgot-password', (req, res) => {
    try {
      if (isRateLimited(`forgot:${clientIp(req)}`, FORGOT_RATE_LIMIT.max, FORGOT_RATE_LIMIT.windowMs)) {
        return res.status(429).json({ error: 'Too many password reset requests. Please try again later.' });
      }

      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
      }

      const result = db.createPasswordResetToken(email);

      // Dev convenience only: surface the token when not in production.
      if (result && process.env.NODE_ENV !== 'production') {
        return res.json({
          message: GENERIC_FORGOT_MESSAGE,
          devResetToken: result.token,
          devResetExpiresAt: new Date(result.expiresAt).toISOString()
        });
      }

      res.json({ message: GENERIC_FORGOT_MESSAGE });
    } catch (err: any) {
      // Never leak account existence on error either.
      res.json({ message: GENERIC_FORGOT_MESSAGE });
    }
  });

  // Redeem a single-use reset token and set a new password.
  app.post('/api/auth/reset-password', (req, res) => {
    try {
      if (isRateLimited(`reset:${clientIp(req)}`, RESET_RATE_LIMIT.max, RESET_RATE_LIMIT.windowMs)) {
        return res.status(429).json({ error: 'Too many password reset attempts. Please try again later.' });
      }

      const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (!token || !password) {
        return res.status(400).json({ error: 'A reset token and a new password are required.' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      const consumed = db.consumePasswordResetToken(token);
      if (!consumed.ok) {
        return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
      }

      db.updatePassword(consumed.userId, password);
      res.json({ message: 'Your password has been reset. You can now sign in with your new password.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to reset password.' });
    }
  });

  // Privacy: Purge user data
  app.delete('/api/user/data', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      db.purgeCandidateData(req.user.id);
      res.json({ message: 'All candidate interview data successfully purged according to privacy policy.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to purge data.' });
    }
  });

  // ==========================================
  // 3. INTERVIEW SESSION LIFECYCLE ROUTES
  // ==========================================

  // List interviews
  app.get('/api/interviews', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      if (req.user.role === 'admin') {
        const all = db.getAllInterviews();
        return res.json(all);
      }
      const candidateList = db.getCandidateInterviews(req.user.id);
      res.json(candidateList);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch interviews.' });
    }
  });

  // Create new interview session
  app.post('/api/interviews', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const {
        jobRole,
        experienceLevel,
        interviewType,
        difficulty,
        skills,
        totalQuestions,
        durationMinutes,
        jobDescription,
        isPractice
      } = req.body;

      if (!jobRole || !experienceLevel) {
        return res.status(400).json({ error: 'Job role and experience level are required.' });
      }

      const interviewId = `int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const cleanJobDescription = cleanUntrustedText(jobDescription);
      const newInterview: Interview = {
        id: interviewId,
        candidateId: req.user.id,
        candidateName: req.user.name,
        jobRole,
        experienceLevel: experienceLevel || 'mid',
        interviewType: interviewType || 'technical',
        difficulty: difficulty || 'adaptive',
        currentDifficulty: difficulty === 'adaptive' ? 'medium' : difficulty,
        skills: Array.isArray(skills) && skills.length > 0 ? skills : ['Core Concepts', 'Problem Solving'],
        totalQuestions: Number(totalQuestions) || 5,
        durationMinutes: Number(durationMinutes) || 20,
        status: 'setup',
        createdAt: new Date().toISOString(),
        // Ungraded practice / warm-up sessions: stored explicitly, never scored.
        ...(isPractice === true ? { isPractice: true } : {}),
        ...(cleanJobDescription ? { jobDescription: cleanJobDescription } : {}),
      };

      const created = db.createInterview(newInterview);
      // Immediately pre-generate Question 1 so the candidate has 0ms wait upon entering the room
      prefetchNextQuestion(created.id);
      res.status(201).json(created);
    } catch (err: any) {
      console.error('Create interview error:', err);
      res.status(500).json({ error: 'Failed to configure interview.' });
    }
  });

  // Get interview by ID (with ownership check)
  app.get('/api/interviews/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const interview = db.getInterview(req.params.id);
      if (!interview) {
        return res.status(404).json({ error: 'Interview session not found.' });
      }

      // Authorization guard: Candidate can only access their own, Admin can access all
      if (req.user.role !== 'admin' && interview.candidateId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied to this interview session.' });
      }

      res.json(interview);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve interview.' });
    }
  });

  // Start interview session
  app.post('/api/interviews/:id/start', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const interview = db.getInterview(req.params.id);
      if (!interview) return res.status(404).json({ error: 'Interview not found.' });
      if (req.user.role !== 'admin' && interview.candidateId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      const updated = db.updateInterview(req.params.id, {
        status: 'in_progress',
        startedAt: new Date().toISOString()
      });

      // Warm up / prefetch Question 1 immediately
      prefetchNextQuestion(req.params.id);

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to start interview.' });
    }
  });

  // Get or generate next adaptive question (Instant with background prefetch)
  app.post('/api/interviews/:id/questions/next', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const interview = db.getInterview(req.params.id);
      if (!interview) return res.status(404).json({ error: 'Interview not found.' });
      if (req.user.role !== 'admin' && interview.candidateId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      // Only top-level (template) questions advance the numbered progression.
      // Adaptive follow-up probes are presented in-context and never returned here.
      const topLevel = getTopLevelQuestions(interview.id);
      const answers = db.getAnswersByInterview(interview.id);
      const answeredIds = new Set(answers.map(a => a.questionId));
      const unansweredTopLevel = topLevel.filter(q => !answeredIds.has(q.id));

      // Check if a top-level question is already generated but unanswered -> return instantly (0ms)
      if (unansweredTopLevel.length > 0) {
        // Background prefetch the subsequent question if needed
        prefetchNextQuestion(interview.id);
        return res.json(unansweredTopLevel[0]);
      }

      // Check if reached max questions
      if (topLevel.length >= interview.totalQuestions) {
        return res.status(400).json({
          error: 'All questions for this interview have already been answered.',
          isComplete: true
        });
      }

      const nextOrderIndex = topLevel.length + 1;

      // Call AI with fast timeout fallback
      const questionData = await generateNextAdaptiveQuestion({
        interview,
        previousQuestions: db.getQuestionsByInterview(interview.id),
        previousAnswers: answers,
        previousEvaluations: db.getEvaluationsByInterview(interview.id),
        orderIndex: nextOrderIndex,
        candidateResume: getCandidateResumeForInterview(interview)
      });

      const newQuestion: Question = {
        id: `q-${interview.id}-${nextOrderIndex}-${Math.random().toString(36).substring(2, 5)}`,
        interviewId: interview.id,
        orderIndex: nextOrderIndex,
        questionText: questionData.questionText,
        spokenLeadIn: questionData.spokenLeadIn,
        spokenDialogue: questionData.spokenDialogue,
        category: questionData.category,
        difficultyLevel: questionData.difficultyLevel,
        expectedPoints: questionData.expectedPoints,
        hints: questionData.hints,
        createdAt: new Date().toISOString()
      };

      const saved = db.addQuestion(newQuestion);
      
      // Asynchronously prefetch the NEXT question in background
      prefetchNextQuestion(interview.id);

      res.json(saved);
    } catch (err: any) {
      console.error('Next question generation error:', err);
      res.status(500).json({ error: 'Failed to generate next interview question.' });
    }
  });

  // Submit Answer & Trigger AI Evaluation
  app.post('/api/interviews/:id/answers', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { questionId, transcript, audioDurationSeconds, timeSpentSeconds, inputMethod } = req.body;
      const interview = db.getInterview(req.params.id);
      if (!interview) return res.status(404).json({ error: 'Interview not found.' });
      if (req.user.role !== 'admin' && interview.candidateId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      if (!questionId || !transcript) {
        return res.status(400).json({ error: 'Question ID and answer transcript are required.' });
      }

      const questions = db.getQuestionsByInterview(interview.id);
      const targetQuestion = questions.find(q => q.id === questionId);
      if (!targetQuestion) {
        return res.status(404).json({ error: 'Question not found for this interview.' });
      }

      const isPractice = !!interview.isPractice;

      // Duplicate handling: graded sessions are immutable (block re-submission);
      // practice sessions may re-record, so the prior answer is replaced.
      const existingAnswers = db.getAnswersByInterview(interview.id);
      const duplicate = existingAnswers.find(a => a.questionId === questionId);
      if (duplicate) {
        if (!isPractice) {
          return res.status(400).json({ error: 'This question has already been submitted.' });
        }
        db.removeAnswer(interview.id, questionId);
      }

      // 1. Record Answer
      const answerId = `ans-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const newAnswer: Answer = {
        id: answerId,
        interviewId: interview.id,
        questionId,
        candidateId: req.user.id,
        transcript: transcript.trim(),
        audioDurationSeconds: Number(audioDurationSeconds) || 0,
        timeSpentSeconds: Number(timeSpentSeconds) || 0,
        inputMethod: inputMethod || 'voice',
        submittedAt: new Date().toISOString()
      };
      db.addAnswer(newAnswer);

      // Trigger background prefetch for the NEXT top-level question right away
      prefetchNextQuestion(interview.id);

      const remainingQuestions = Math.max(0, interview.totalQuestions - getAnsweredTopLevelCount(interview.id));

      // 2. Practice (ungraded) sessions: no official evaluation, no follow-up probes.
      if (isPractice) {
        return res.status(201).json({
          answer: newAnswer,
          evaluation: null,
          followUp: null,
          remainingQuestions,
          isPractice: true
        });
      }

      // 3. Graded: perform AI Evaluation
      const evalData = await evaluateCandidateAnswer({
        interview,
        question: targetQuestion,
        answerTranscript: transcript.trim()
      });

      const evaluationId = `eval-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const newEvaluation = {
        id: evaluationId,
        answerId,
        questionId,
        interviewId: interview.id,
        ...evalData,
        createdAt: new Date().toISOString()
      };
      db.addEvaluation(newEvaluation);

      // 4. Adaptive follow-up probe (graded only). Eligibility and depth are
      // enforced server-side: depth < 2, no existing child, substantive answer,
      // and an answer that leaves room to probe (score <= 88).
      let followUp: Question | null = null;
      try {
        const depth = getQuestionDepth(interview.id, targetQuestion.id);
        const alreadyHasChild = db
          .getQuestionsByInterview(interview.id)
          .some(q => q.parentQuestionId === targetQuestion.id);
        const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
        const eligibleForFollowUp =
          depth < 2 && !alreadyHasChild && wordCount >= 20 && newEvaluation.overallScore <= 88;

        if (eligibleForFollowUp) {
          const followUpData = await generateNextAdaptiveQuestion({
            interview,
            previousQuestions: db.getQuestionsByInterview(interview.id),
            previousAnswers: [...existingAnswers, newAnswer],
            previousEvaluations: db.getEvaluationsByInterview(interview.id),
            orderIndex: targetQuestion.orderIndex,
            candidateResume: getCandidateResumeForInterview(interview),
            isFollowUp: true,
            parentQuestionText: targetQuestion.questionText,
          });

          // Re-check after the async call so concurrent/duplicate requests cannot
          // generate more than one child per parent.
          const childExistsNow = db
            .getQuestionsByInterview(interview.id)
            .some(q => q.parentQuestionId === targetQuestion.id);
          if (!childExistsNow) {
            const followUpQuestion: Question = {
              id: `q-${interview.id}-fu-${targetQuestion.orderIndex}-${Math.random().toString(36).substring(2, 5)}`,
              interviewId: interview.id,
              orderIndex: targetQuestion.orderIndex,
              parentQuestionId: targetQuestion.id,
              questionText: followUpData.questionText,
              spokenLeadIn: followUpData.spokenLeadIn,
              spokenDialogue: followUpData.spokenDialogue,
              category: followUpData.category || 'Follow-up Probe',
              difficultyLevel: followUpData.difficultyLevel,
              expectedPoints: followUpData.expectedPoints,
              hints: followUpData.hints,
              createdAt: new Date().toISOString()
            };
            followUp = db.addQuestion(followUpQuestion);
          }
        }
      } catch (followUpErr: any) {
        // A follow-up is an enhancement, never a requirement: on any error we
        // simply continue without one rather than fabricating a probe.
        console.warn('Follow-up generation notice:', followUpErr?.message || followUpErr);
        followUp = null;
      }

      // Return answer, evaluation, and any generated follow-up probe
      res.status(201).json({
        answer: newAnswer,
        evaluation: newEvaluation,
        followUp,
        remainingQuestions
      });
    } catch (err: any) {
      console.error('Answer submission error:', err);
      res.status(500).json({ error: 'Failed to process answer evaluation.' });
    }
  });

  // Save Visual Engagement Metrics
  app.post('/api/interviews/:id/visual-metrics', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const interview = db.getInterview(req.params.id);
      if (!interview) return res.status(404).json({ error: 'Interview not found.' });

      if (req.user.role !== 'admin' && interview.candidateId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied to this interview session.' });
      }

      const metrics: VisualEngagementMetrics = {
        id: `vm-${Date.now()}`,
        interviewId: interview.id,
        sampleCount: Number(req.body.sampleCount) || 10,
        facePresenceRatio: Number(req.body.facePresenceRatio) || 95.0,
        cameraAvailabilityRatio: Number(req.body.cameraAvailabilityRatio) || 100.0,
        screenCenterOrientationRatio: Number(req.body.screenCenterOrientationRatio) || 90.0,
        lookingAwayCount: Number(req.body.lookingAwayCount) || 0,
        cameraStabilityScore: Number(req.body.cameraStabilityScore) || 90.0,
        lightingQualityScore: Number(req.body.lightingQualityScore) || 90.0,
        overallEngagementScore: Number(req.body.overallEngagementScore) || 92.0,
        note: req.body.note || 'Visual engagement metrics recorded responsibly without facial recognition.'
      };

      db.saveVisualMetrics(metrics);
      res.json({ status: 'saved', metrics });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save visual engagement metrics.' });
    }
  });

  // Record Neutral Integrity Event
  app.post('/api/interviews/:id/integrity-event', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const interview = db.getInterview(req.params.id);
      if (!interview) return res.status(404).json({ error: 'Interview not found.' });

      if (req.user.role !== 'admin' && interview.candidateId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied to this interview session.' });
      }

      const event: IntegrityEvent = {
        id: `integ-${Date.now()}`,
        interviewId: req.params.id,
        eventType: req.body.eventType,
        details: req.body.details,
        createdAt: new Date().toISOString()
      };
      db.recordIntegrityEvent(event);
      res.json({ status: 'recorded' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to record integrity event.' });
    }
  });

  // Complete Interview & Generate Final Assessment Report
  app.post('/api/interviews/:id/finish', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const interview = db.getInterview(req.params.id);
      if (!interview) return res.status(404).json({ error: 'Interview not found.' });
      if (req.user.role !== 'admin' && interview.candidateId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      // Practice sessions never produce an official assessment report.
      if (interview.isPractice) {
        const completedPractice = db.updateInterview(interview.id, {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
        return res.json({
          interview: completedPractice,
          report: null,
          isPractice: true
        });
      }

      const questions = db.getQuestionsByInterview(interview.id);
      const answers = db.getAnswersByInterview(interview.id);
      const evaluations = db.getEvaluationsByInterview(interview.id);
      const visualMetrics = db.getVisualMetrics(interview.id);

      // Generate final AI synthesis report
      const reportData = await generateFinalAssessmentReport({
        interview,
        questions,
        answers,
        evaluations,
        visualMetrics
      });

      const reportId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const finalReport = {
        id: reportId,
        interviewId: interview.id,
        candidateId: interview.candidateId,
        ...reportData,
        createdAt: new Date().toISOString()
      };

      db.saveAssessmentReport(finalReport);

      // Update interview status to completed
      const completedInterview = db.updateInterview(interview.id, {
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      res.json({
        interview: completedInterview,
        report: finalReport
      });
    } catch (err: any) {
      console.error('Interview finalization error:', err);
      res.status(500).json({ error: 'Failed to generate assessment report.' });
    }
  });

  // Get Assessment Report
  app.get('/api/interviews/:id/report', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const interview = db.getInterview(req.params.id);
      if (!interview) return res.status(404).json({ error: 'Interview not found.' });
      if (req.user.role !== 'admin' && interview.candidateId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      const report = db.getAssessmentReport(interview.id);
      const isPractice = !!interview.isPractice;
      if (!report && !isPractice) {
        return res.status(404).json({ error: 'Report not yet generated for this interview.' });
      }

      res.json({
        interview,
        report: report || null,
        questions: db.getQuestionsByInterview(interview.id),
        answers: db.getAnswersByInterview(interview.id),
        evaluations: db.getEvaluationsByInterview(interview.id),
        visualMetrics: db.getVisualMetrics(interview.id),
        integrityEvents: db.getIntegrityEvents(interview.id),
        isPractice
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve assessment report.' });
    }
  });

  // Abandon Interview
  app.post('/api/interviews/:id/abandon', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const interview = db.getInterview(req.params.id);
      if (!interview) return res.status(404).json({ error: 'Interview not found.' });
      if (req.user.role !== 'admin' && interview.candidateId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      const updated = db.updateInterview(interview.id, {
        status: 'abandoned',
        completedAt: new Date().toISOString()
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to abandon interview.' });
    }
  });

  // ==========================================
  // 4. TEXT TO SPEECH (VOICE PROXIES)
  // ==========================================
  app.post('/api/tts', requireAuth, async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text prompt is required.' });
      }

      const base64Audio = await generateSpeechAudio(text, voiceName || 'Kore');
      if (base64Audio) {
        return res.json({
          provider: 'gemini-tts',
          mimeType: 'audio/pcm;rate=24000',
          audioBase64: base64Audio
        });
      }

      // Fallback response for browser Web Speech Synthesis
      res.json({
        provider: 'browser-speech-synthesis',
        text
      });
    } catch (err: any) {
      console.error('TTS endpoint error:', err);
      res.json({ provider: 'browser-speech-synthesis', text: req.body?.text || '' });
    }
  });

  // ==========================================
  // 5. TEMPLATES & SCORING CONFIG
  // ==========================================
  app.get('/api/templates', (req, res) => {
    try {
      const list = db.getAllTemplates();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch templates.' });
    }
  });

  app.post('/api/templates', requireAdmin, (req, res) => {
    try {
      const template = req.body;
      template.id = `tmpl-${Date.now()}`;
      const created = db.createTemplate(template);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create template.' });
    }
  });

  app.delete('/api/templates/:id', requireAdmin, (req, res) => {
    try {
      db.deleteTemplate(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete template.' });
    }
  });

  app.get('/api/config/scoring', (req, res) => {
    res.json(db.getScoringConfig());
  });

  app.put('/api/config/scoring', requireAdmin, (req, res) => {
    try {
      const updated = db.updateScoringConfig(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update scoring configuration.' });
    }
  });

  // ==========================================
  // 6. ANALYTICS & ADMIN PORTAL
  // ==========================================
  app.get('/api/admin/overview', requireAdmin, (req, res) => {
    try {
      const analytics = db.getAdminAnalytics();
      const users = db.getAllUsers();
      res.json({
        ...analytics,
        users
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load admin analytics.' });
    }
  });

  app.get('/api/admin/integrity-events', requireAdmin, (req, res) => {
    try {
      res.json({ events: db.getAllIntegrityEvents() });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load integrity audit logs.' });
    }
  });

  // Admin drill-down: a single candidate plus their full interview records.
  app.get('/api/admin/candidates/:id', requireAdmin, (req, res) => {
    try {
      const candidate = db.getUserById(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found.' });
      }
      const interviews = db.getCandidateInterviews(candidate.id);
      res.json({ candidate, interviews });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load candidate drill-down.' });
    }
  });

  // Admin drill-down: a single interview with its full transcript/evaluation data
  // and its own integrity audit events.
  app.get('/api/admin/interviews/:id', requireAdmin, (req, res) => {
    try {
      const interview = db.getInterview(req.params.id);
      if (!interview) {
        return res.status(404).json({ error: 'Interview not found.' });
      }
      res.json({
        interview,
        integrityEvents: db.getIntegrityEvents(interview.id)
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load interview drill-down.' });
    }
  });

  app.get('/api/analytics/candidate', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      // Practice / warm-up sessions are ungraded and excluded from all candidate
      // analytics (scores, completed counts, radar dimensions, and practice time).
      const interviews = db.getCandidateInterviews(req.user.id).filter(i => !i.isPractice);
      const completed = interviews.filter(i => i.status === 'completed' && i.report);

      const scoreHistory = completed.map(i => ({
        id: i.id,
        date: new Date(i.completedAt || i.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        role: i.jobRole,
        overallScore: i.report?.overallScore || 0,
        technicalScore: i.report?.technicalScore || 0,
        communicationScore: i.report?.communicationScore || 0,
        reasoningScore: i.report?.reasoningScore || 0,
        relevanceScore: i.report?.relevanceScore || 0,
        completenessScore: i.report?.completenessScore || 0,
        visualScore: i.report?.visualEngagementScore || 0
      }));

      // Calculate aggregated radar skills from real report scores (0 when none)
      const count = completed.length || 1;
      const radarSkills = [
        { subject: 'Technical Accuracy', score: completed.length ? Math.round(completed.reduce((a, c) => a + (c.report?.technicalScore || 0), 0) / count) : 0, fullMark: 100 },
        { subject: 'Communication', score: completed.length ? Math.round(completed.reduce((a, c) => a + (c.report?.communicationScore || 0), 0) / count) : 0, fullMark: 100 },
        { subject: 'Reasoning & Logic', score: completed.length ? Math.round(completed.reduce((a, c) => a + (c.report?.reasoningScore || 0), 0) / count) : 0, fullMark: 100 },
        { subject: 'Relevance', score: completed.length ? Math.round(completed.reduce((a, c) => a + (c.report?.relevanceScore || 0), 0) / count) : 0, fullMark: 100 },
        { subject: 'Completeness', score: completed.length ? Math.round(completed.reduce((a, c) => a + (c.report?.completenessScore || 0), 0) / count) : 0, fullMark: 100 },
        { subject: 'Visual Presence', score: completed.length ? Math.round(completed.reduce((a, c) => a + (c.report?.visualEngagementScore || 0), 0) / count) : 0, fullMark: 100 }
      ];

      // Real spoken practice time: total audio duration across the candidate's answers
      const practiceSeconds = interviews.reduce(
        (acc, i) => acc + db.getAnswersByInterview(i.id).reduce((a, b) => a + (b.audioDurationSeconds || 0), 0),
        0
      );

      res.json({
        totalInterviews: interviews.length,
        completedCount: completed.length,
        averageOverallScore: completed.length ? Math.round(completed.reduce((a, c) => a + (c.report?.overallScore || 0), 0) / count) : 0,
        practiceMinutes: Math.round(practiceSeconds / 60),
        scoreHistory,
        radarSkills,
        recentCompleted: completed.slice(0, 5)
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch candidate analytics.' });
    }
  });

  // ==========================================
  // 7. VITE MIDDLEWARE / SPA SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IntervAI Server is active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
