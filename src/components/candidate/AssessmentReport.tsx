/**
 * Comprehensive Multi-Dimensional Assessment Report
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import { exportReportToCSV, printOrExportPDF } from '../../utils/export.ts';
import {
  Interview,
  AssessmentReport as ReportType,
  Question,
  Answer,
  Evaluation,
  VisualEngagementMetrics
} from '../../types/index.ts';
import {
  Award,
  Download,
  Printer,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Brain,
  Video,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileText
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer
} from 'recharts';

interface AssessmentReportProps {
  interviewId: string;
  onBackToDashboard: () => void;
  onStartNew: () => void;
}

export const AssessmentReport: React.FC<AssessmentReportProps> = ({
  interviewId,
  onBackToDashboard,
  onStartNew,
}) => {
  const [data, setData] = useState<{
    interview: Interview;
    report: ReportType;
    questions: Question[];
    answers: Answer[];
    evaluations: Evaluation[];
    visualMetrics?: VisualEngagementMetrics;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const res = await api.getAssessmentReport(interviewId);
        setData(res);
        if (res.questions.length > 0) {
          setExpandedQuestion(res.questions[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load assessment report');
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [interviewId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">Synthesizing comprehensive AI assessment report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Report Generation Notice</h3>
        <p className="text-xs text-slate-500">{error || 'Unable to retrieve report.'}</p>
        <button
          onClick={onBackToDashboard}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { interview, report, questions, answers, evaluations, visualMetrics } = data;

  const radarData = [
    { subject: 'Technical', score: report.technicalScore, fullMark: 100 },
    { subject: 'Communication', score: report.communicationScore, fullMark: 100 },
    { subject: 'Reasoning', score: report.reasoningScore, fullMark: 100 },
    { subject: 'Relevance', score: report.relevanceScore, fullMark: 100 },
    { subject: 'Completeness', score: report.completenessScore, fullMark: 100 },
    { subject: 'Visual Presence', score: report.visualEngagementScore ?? 0, fullMark: 100 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in print:p-0 text-[#e5e7eb]">
      {/* 1. TOP HEADER & EXPORT ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6 print:hidden">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Candidate Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-csv"
            onClick={() => exportReportToCSV(data)}
            className="px-3.5 py-2 text-xs font-semibold bg-[#121215] hover:bg-[#18181c] text-zinc-300 rounded-xl border border-[#27272a] transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-print-pdf"
            onClick={printOrExportPDF}
            className="px-3.5 py-2 text-xs font-semibold bg-[#121215] hover:bg-[#18181c] text-zinc-300 rounded-xl border border-[#27272a] transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={onStartNew}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start Another Session</span>
          </button>
        </div>
      </div>

      {/* 2. OVERALL SCORECARD HERO */}
      <div className="p-6 sm:p-8 bg-[#121215] border border-[#27272a] rounded-3xl shadow-xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 text-blue-400" />
            Verified AI Performance Assessment
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {interview.candidateName} • {interview.jobRole}
          </h1>
          <p className="text-xs text-zinc-400">
            {interview.experienceLevel.toUpperCase()} Level • {interview.interviewType.toUpperCase()} Format • Completed on {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-5 bg-[#18181c] p-4 rounded-2xl border border-[#27272a]">
          <div className="text-center">
            <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              {report.overallScore}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mt-0.5">
              Overall Score
            </div>
          </div>
          <div className="h-10 w-px bg-[#27272a]" />
          <div className="text-xs text-zinc-300 space-y-1">
            <div>
              Status:{' '}
              <strong className={report.overallScore >= 75 ? 'text-emerald-400' : 'text-amber-400'}>
                {report.overallScore >= 75 ? 'Recommended' : 'Needs Practice'}
              </strong>
            </div>
            <div className="text-[11px] text-zinc-400">
              {questions.length} Questions Evaluated
            </div>
          </div>
        </div>
      </div>

      {/* 3. RADAR MATRIX & EXECUTIVE SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Matrix (5 cols) */}
        <div className="lg:col-span-5 p-6 bg-[#121215] border border-[#27272a] rounded-3xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white">
            Competency Dimension Breakdown
          </h3>

          <div className="w-full h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#27272a" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#3f3f46" />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2 bg-[#18181c] border border-[#27272a] rounded-xl">
              <span className="text-zinc-400 block text-[10px]">Technical</span>
              <strong className="text-white">{report.technicalScore}%</strong>
            </div>
            <div className="p-2 bg-[#18181c] border border-[#27272a] rounded-xl">
              <span className="text-zinc-400 block text-[10px]">Communication</span>
              <strong className="text-white">{report.communicationScore}%</strong>
            </div>
          </div>
        </div>

        {/* Executive Summary, Strengths & Growth (7 cols) */}
        <div className="lg:col-span-7 p-6 bg-[#121215] border border-[#27272a] rounded-3xl shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white mb-2">
              Executive Evaluation Summary
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed bg-[#18181c] p-3.5 rounded-2xl border border-[#27272a]">
              {report.executiveSummary}
            </p>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Key Demonstrated Strengths
              </h4>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {report.strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Target Growth Areas
              </h4>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {report.weaknesses.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <div className="pt-2 border-t border-[#27272a]">
              <h4 className="text-xs font-bold text-white mb-1.5">
                Recommended Study & Practice Next Steps:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {report.recommendations.map((rec, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-blue-950/60 text-blue-300 rounded-lg text-[11px] border border-blue-800/60"
                  >
                    {rec}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. QUESTION-BY-QUESTION DEEP DIVE (TRANSCRIPTS & MODEL ANSWERS) */}
      <div className="p-6 bg-[#121215] border border-[#27272a] rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              Question-by-Question Deep Dive & Model Exemplars
            </h3>
            <p className="text-xs text-zinc-400">
              Inspect spoken transcripts, multi-dimensional scores, and benchmark exemplar answers
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const ans = answers.find((a) => a.questionId === q.id);
            const ev = evaluations.find((e) => e.questionId === q.id);
            const isExpanded = expandedQuestion === q.id;

            return (
              <div
                key={q.id}
                className="border border-[#27272a] rounded-2xl overflow-hidden transition bg-[#18181c]"
              >
                {/* Header Row */}
                <button
                  onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                  className="w-full p-4 text-left bg-[#18181c] hover:bg-[#202026] flex items-center justify-between gap-4 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      Q{idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {q.questionText}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                        <span className="capitalize">{q.category}</span>
                        <span>•</span>
                        <span className="capitalize">{q.difficultyLevel} Difficulty</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-black text-blue-400">
                        {ev?.overallScore || 0}%
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 bg-[#121215] border-t border-[#27272a] space-y-4 text-xs">
                    {/* Candidate Transcript */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        Candidate Spoken Transcript:
                      </span>
                      <p className="p-3 bg-[#18181c] rounded-xl border border-[#27272a] text-zinc-200 leading-relaxed font-mono text-[11px]">
                        "{ans?.transcript || 'No response recorded.'}"
                      </p>
                    </div>

                    {/* AI Feedback */}
                    <div className="p-3.5 bg-blue-950/40 rounded-xl border border-blue-900/60 space-y-1.5">
                      <span className="text-[11px] font-bold text-blue-300">
                        AI Assessor Feedback:
                      </span>
                      <p className="text-zinc-300 leading-relaxed">
                        {ev?.feedback}
                      </p>
                    </div>

                    {/* Exemplar Model Answer */}
                    {ev?.suggestedAnswer && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                          Benchmark Model Answer:
                        </span>
                        <p className="p-3 bg-purple-950/30 rounded-xl border border-purple-900/50 text-zinc-300 leading-relaxed">
                          {ev.suggestedAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. RESPONSIBLE PRACTICE VISUAL SIGNALS SUMMARY */}
      {visualMetrics && (
        <div className="p-6 bg-[#121215] border border-[#27272a] rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">
                Practice Visual Engagement Signals
              </h3>
            </div>
            <span className="text-[10px] font-medium text-zinc-400">
              Computed Client-Side • Non-Biometric
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-[#18181c] border border-[#27272a] rounded-xl">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Framing Centered</span>
              <strong className="text-sm text-white block mt-0.5">
                {visualMetrics.screenCenterOrientationRatio}%
              </strong>
            </div>
            <div className="p-3 bg-[#18181c] border border-[#27272a] rounded-xl">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Camera Stability</span>
              <strong className="text-sm text-white block mt-0.5">
                {visualMetrics.cameraStabilityScore}%
              </strong>
            </div>
            <div className="p-3 bg-[#18181c] border border-[#27272a] rounded-xl">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Lighting Quality</span>
              <strong className="text-sm text-white block mt-0.5">
                {visualMetrics.lightingQualityScore}%
              </strong>
            </div>
            <div className="p-3 bg-[#18181c] border border-[#27272a] rounded-xl">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Looking Away Freq</span>
              <strong className="text-sm text-white block mt-0.5">
                {visualMetrics.lookingAwayCount} times
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {visualMetrics.note}
          </p>
        </div>
      )}
    </div>
  );
};
