/**
 * Frontend API Client with Authorization and Error Handling
 */

import {
  User,
  Interview,
  Question,
  Answer,
  Evaluation,
  AssessmentReport,
  VisualEngagementMetrics,
  InterviewTemplate,
  ScoringConfig,
  AdminAnalytics,
  IntegrityEvent
} from '../types/index.ts';

const TOKEN_KEY = 'intervai_auth_token';

class ApiService {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'An error occurred during API request.');
    }

    return data as T;
  }

  // Auth Endpoints
  async register(params: {
    name: string;
    email: string;
    password: string;
    role?: 'candidate' | 'admin';
    targetRole?: string;
    experienceLevel?: string;
    skills?: string[];
  }): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    this.setToken(res.token);
    return res;
  }

  async login(params: { email: string; password: string }): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    this.setToken(res.token);
    return res;
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  async updateProfile(updates: Partial<User>): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async purgeUserData(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/user/data', {
      method: 'DELETE',
    });
  }

  // Interview Endpoints
  async getInterviews(): Promise<Interview[]> {
    return this.request<Interview[]>('/api/interviews');
  }

  async createInterview(params: Partial<Interview>): Promise<Interview> {
    return this.request<Interview>('/api/interviews', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getInterview(id: string): Promise<Interview> {
    return this.request<Interview>(`/api/interviews/${id}`);
  }

  async startInterview(id: string): Promise<Interview> {
    return this.request<Interview>(`/api/interviews/${id}/start`, {
      method: 'POST',
    });
  }

  async getNextQuestion(interviewId: string): Promise<Question> {
    return this.request<Question>(`/api/interviews/${interviewId}/questions/next`, {
      method: 'POST',
    });
  }

  async submitAnswer(
    interviewId: string,
    payload: {
      questionId: string;
      transcript: string;
      audioDurationSeconds: number;
      timeSpentSeconds: number;
      inputMethod: 'voice' | 'text_fallback';
    }
  ): Promise<{ answer: Answer; evaluation: Evaluation; remainingQuestions: number }> {
    return this.request<{ answer: Answer; evaluation: Evaluation; remainingQuestions: number }>(
      `/api/interviews/${interviewId}/answers`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async saveVisualMetrics(
    interviewId: string,
    metrics: Partial<VisualEngagementMetrics>
  ): Promise<{ status: string; metrics: VisualEngagementMetrics }> {
    return this.request<{ status: string; metrics: VisualEngagementMetrics }>(
      `/api/interviews/${interviewId}/visual-metrics`,
      {
        method: 'POST',
        body: JSON.stringify(metrics),
      }
    );
  }

  async recordIntegrityEvent(
    interviewId: string,
    event: { eventType: string; details?: string }
  ): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/api/interviews/${interviewId}/integrity-event`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async finishInterview(interviewId: string): Promise<{ interview: Interview; report: AssessmentReport }> {
    return this.request<{ interview: Interview; report: AssessmentReport }>(
      `/api/interviews/${interviewId}/finish`,
      {
        method: 'POST',
      }
    );
  }

  async getAssessmentReport(interviewId: string): Promise<{
    interview: Interview;
    report: AssessmentReport;
    questions: Question[];
    answers: Answer[];
    evaluations: Evaluation[];
    visualMetrics?: VisualEngagementMetrics;
  }> {
    return this.request<{
      interview: Interview;
      report: AssessmentReport;
      questions: Question[];
      answers: Answer[];
      evaluations: Evaluation[];
      visualMetrics?: VisualEngagementMetrics;
    }>(`/api/interviews/${interviewId}/report`);
  }

  async abandonInterview(interviewId: string): Promise<Interview> {
    return this.request<Interview>(`/api/interviews/${interviewId}/abandon`, {
      method: 'POST',
    });
  }

  // Templates
  async getTemplates(): Promise<InterviewTemplate[]> {
    return this.request<InterviewTemplate[]>('/api/templates');
  }

  async createTemplate(template: Partial<InterviewTemplate>): Promise<InterviewTemplate> {
    return this.request<InterviewTemplate>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async deleteTemplate(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // Scoring Configuration
  async getScoringConfig(): Promise<ScoringConfig> {
    return this.request<ScoringConfig>('/api/config/scoring');
  }

  async updateScoringConfig(config: Partial<ScoringConfig>): Promise<ScoringConfig> {
    return this.request<ScoringConfig>('/api/config/scoring', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // Analytics
  async getCandidateAnalytics(): Promise<{
    totalInterviews: number;
    completedCount: number;
    averageOverallScore: number;
    practiceMinutes: number;
    scoreHistory: any[];
    radarSkills: any[];
    recentCompleted: Interview[];
  }> {
    return this.request('/api/analytics/candidate');
  }

  async getAdminAnalytics(): Promise<AdminAnalytics & { users: User[]; interviewsByRole?: Record<string, number> }> {
    return this.request<AdminAnalytics & { users: User[]; interviewsByRole?: Record<string, number> }>('/api/admin/overview');
  }

  async getIntegrityEvents(): Promise<{ events: IntegrityEvent[] }> {
    return this.request<{ events: IntegrityEvent[] }>('/api/admin/integrity-events');
  }

  // TTS Proxy
  async generateTTS(text: string, voiceName: string = 'Kore'): Promise<{
    provider: string;
    audioBase64?: string;
    text?: string;
  }> {
    return this.request('/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text, voiceName }),
    });
  }

  // Database Management & Health
  async getDatabaseStatus(): Promise<{
    status: string;
    connected: boolean;
    cluster: string;
    database: string;
    uriMasked: string;
    pingMs: number | null;
    counts: Record<string, number>;
    lastConnected: string | null;
    error: string | null;
  }> {
    return this.request('/api/database/status');
  }

  async syncDatabase(): Promise<{ success: boolean; message: string; status: any }> {
    return this.request('/api/database/sync', {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
