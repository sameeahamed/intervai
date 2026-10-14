/**
 * Candidate Dashboard - Analytics, Score History, Skill Radar, and Launchpad
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Interview } from '../../types/index.ts';
import {
  Mic,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart2,
  FileText,
  AlertCircle
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

interface CandidateDashboardProps {
  onStartSetup: () => void;
  onViewReport: (interviewId: string) => void;
  onViewHistory: () => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  onStartSetup,
  onViewReport,
  onViewHistory,
}) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getCandidateAnalytics();
        setAnalytics(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">Loading your candidate dashboard...</p>
        </div>
      </div>
    );
  }

  const radarData = (analytics?.radarSkills || []).map((skill: any) => ({
    ...skill,
    shortSubject: ({
      'Technical Accuracy': 'Technical',
      'Reasoning & Logic': 'Reasoning',
      'Visual Presence': 'Presence',
    } as Record<string, string>)[skill.subject] || skill.subject,
  }));

  // The API returns most recent sessions first; the chart reads left-to-right chronologically.
  const scoreHistory = [...(analytics?.scoreHistory || [])].reverse();
  const recentCompleted: Interview[] = analytics?.recentCompleted || [];
  const completedCount = analytics?.completedCount ?? 0;

  const topCompetency = completedCount > 0 && radarData.length
    ? radarData.reduce((best: any, cur: any) => (cur.score > best.score ? cur : best))
    : null;

  const trendPts =
    scoreHistory.length >= 2
      ? (scoreHistory[scoreHistory.length - 1].overallScore ?? 0) - (scoreHistory[0].overallScore ?? 0)
      : null;

  return (
    <div className="candidate-dashboard max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-[#e5e7eb]">
      {/* 1. WELCOME BANNER & PRIMARY CTA */}
      <div className="dashboard-welcome relative p-6 sm:p-8 bg-gradient-to-r from-blue-950/80 via-indigo-950/60 to-[#121215] border border-blue-900/60 rounded-3xl text-white shadow-xl overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            AI Interview Coach Active
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Candidate'}!
          </h1>
          <p className="text-sm text-zinc-300">
            Targeting: <strong className="text-white">{user?.targetRole || 'Full-Stack Developer'}</strong> • Ready for your next adaptive AI voice simulation?
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            id="btn-dash-start-interview"
            onClick={() => onStartSetup()}
            className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 group"
          >
            <Mic className="w-4 h-4" />
            <span>Start a New Interview</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* 2. KPI SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Score</span>
            <div className="p-2 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {completedCount > 0 ? `${analytics?.averageOverallScore ?? 0}%` : '—'}
          </div>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            {completedCount > 0
              ? `Across ${completedCount} completed evaluation${completedCount > 1 ? 's' : ''}`
              : 'Complete an evaluation to build your score'}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Sessions</span>
            <div className="p-2 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {completedCount}
          </div>
          <p className="text-[11px] text-zinc-400">
            Full adaptive voice evaluations
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Practice Time</span>
            <div className="p-2 rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {analytics?.practiceMinutes ?? 0} <span className="text-base font-normal text-zinc-400">mins</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Active verbal articulation
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Competency</span>
            <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white truncate">
            {topCompetency ? topCompetency.subject : '—'}
          </div>
          <p className="text-[11px] text-zinc-400">
            {topCompetency ? `${topCompetency.score}/100` : 'Complete an evaluation to measure competencies'}
          </p>
        </div>
      </div>

      {/* 3. CHARTS GRID (SKILL RADAR & PROGRESS OVER TIME) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="dashboard-chart-card p-6 bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">
                Multi-Dimensional Skill Matrix
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Average scores from completed, scored interviews
              </p>
            </div>
            <span className="dashboard-chart-badge">
              {completedCount} {completedCount === 1 ? 'assessment' : 'assessments'}
            </span>
          </div>

          {completedCount > 0 ? (
            <>
              <div className="w-full h-56 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="var(--border-strong)" strokeDasharray="3 4" />
                    <PolarAngleAxis dataKey="shortSubject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tickCount={5} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                    <Tooltip
                      formatter={(value: number) => [`${value}/100`, 'Average score']}
                      contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '12px' }}
                    />
                    <Radar
                      name="Average score"
                      dataKey="score"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      fill="#6366f1"
                      fillOpacity={0.22}
                      dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="dashboard-dimension-grid">
                {radarData.map((skill: any) => (
                  <div className="dashboard-dimension" key={skill.subject}>
                    <div className="dashboard-dimension-label"><span>{skill.subject}</span><strong>{skill.score}</strong></div>
                    <div className="dashboard-dimension-track"><span style={{ width: `${Math.max(0, Math.min(100, skill.score))}%` }} /></div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="dashboard-chart-empty">
              <BarChart2 />
              <strong>Your skill profile will appear here</strong>
              <span>Complete a scored interview to see your actual results across all six dimensions.</span>
            </div>
          )}
        </div>

        {/* Progress Line Chart */}
        <div className="dashboard-chart-card p-6 bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">
                Performance Trajectory
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Overall and technical scores, in date order
              </p>
            </div>
            <span className="dashboard-chart-badge">
              {scoreHistory.length >= 2
                ? `${trendPts! >= 0 ? '+' : ''}${trendPts} pts`
                : scoreHistory.length === 1 ? 'Baseline' : 'No scores yet'}
            </span>
          </div>

          <div className="w-full h-64 flex items-center justify-center">
            {scoreHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreHistory} margin={{ top: 8, right: 10, left: -14, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.role ? `${label} · ${payload[0].payload.role}` : label}
                    formatter={(value: number, name: string) => [`${value}/100`, name]}
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      borderRadius: '12px',
                      color: 'var(--text)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: '10px', color: 'var(--text-2)' }} />
                  <Line
                    type="monotone"
                    dataKey="overallScore"
                    name="Overall score"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    dot={{ r: 4, fill: '#4f46e5', stroke: 'var(--surface)', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="technicalScore"
                    name="Technical"
                    stroke="#0f9f8f"
                    strokeWidth={2}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    dot={{ r: 3, fill: '#0f9f8f', stroke: 'var(--surface)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-chart-empty">
                <TrendingUp />
                <strong>Your score history starts with your first interview</strong>
                <span>Each completed assessment adds a dated score point here.</span>
              </div>
            )}
          </div>
          {scoreHistory.length === 1 && (
            <p className="dashboard-baseline-note">One assessment gives you a baseline. Complete another interview to see your progress over time.</p>
          )}
        </div>
      </div>

      {/* 4. RECENT INTERVIEWS & REPORT ACCESS */}
      <div className="p-6 bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              Recent Interview Assessments
            </h3>
            <p className="text-xs text-zinc-400">
              Access full question transcripts, model answers, and downloadable reports
            </p>
          </div>
          <button
            onClick={onViewHistory}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
          >
            View All History →
          </button>
        </div>

        {recentCompleted.length === 0 ? (
          <div className="p-8 text-center bg-[#18181c] rounded-xl border border-dashed border-[#27272a]">
            <p className="text-sm font-medium text-zinc-300">
              No completed interviews yet.
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Start your first adaptive voice assessment to generate your personalized performance scorecard.
            </p>
            <button
              onClick={() => onStartSetup()}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
            >
              Start First Interview
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#27272a]">
            {recentCompleted.map((intv) => (
              <div
                key={intv.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-950/80 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-800/60">
                    {intv.report?.overallScore ?? 0}%
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {intv.jobRole} ({intv.experienceLevel})
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {intv.interviewType.toUpperCase()} • {intv.totalQuestions} Questions • Difficulty: {intv.difficulty}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onViewReport(intv.id)}
                    className="px-3.5 py-2 text-xs font-semibold bg-blue-950/70 text-blue-300 hover:bg-blue-900/60 rounded-xl border border-blue-800/60 transition flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Assessment Report</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
