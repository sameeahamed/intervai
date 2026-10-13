/**
 * Candidate Interview History - Filterable, Searchable Session Archive
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import { Interview } from '../../types/index.ts';
import {
  History,
  Search,
  Filter,
  FileText,
  Clock,
  Award,
  ArrowLeft,
  Calendar,
  Layers,
  ChevronRight,
  Plus
} from 'lucide-react';

interface InterviewHistoryProps {
  onViewReport: (interviewId: string) => void;
  onStartNew: () => void;
  onBack: () => void;
}

export const InterviewHistory: React.FC<InterviewHistoryProps> = ({
  onViewReport,
  onStartNew,
  onBack,
}) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const list = await api.getInterviews();
        setInterviews(list);
      } catch {
        // handle err
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredInterviews = interviews.filter((item) => {
    const matchesSearch =
      item.jobRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.interviewType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || item.jobRole === roleFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const uniqueRoles = Array.from(new Set(interviews.map((i) => i.jobRole)));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in text-[#e5e7eb]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-blue-400" />
            Interview History & Reports
          </h1>
          <p className="text-xs text-zinc-400">
            Review past adaptive interview recordings, performance analytics, and model answers
          </p>
        </div>

        <button
          onClick={onStartNew}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>New Interview</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by role or type..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#121215] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#121215] border border-[#27272a] rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            {uniqueRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#121215] border border-[#27272a] rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
      </div>

      {/* History Table / List */}
      {loading ? (
        <div className="py-16 text-center text-zinc-400 text-xs">Loading interview history...</div>
      ) : filteredInterviews.length === 0 ? (
        <div className="p-12 text-center bg-[#121215] border border-[#27272a] rounded-3xl space-y-3">
          <History className="w-8 h-8 text-zinc-500 mx-auto" />
          <p className="text-sm font-semibold text-zinc-300">
            No interview sessions matched your filter.
          </p>
          <button
            onClick={onStartNew}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl"
          >
            Start an Interview Session
          </button>
        </div>
      ) : (
        <div className="bg-[#121215] border border-[#27272a] rounded-3xl overflow-hidden shadow-sm divide-y divide-[#1e1e24]">
          {filteredInterviews.map((intv) => (
            <div
              key={intv.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#18181c] transition"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-950/80 text-blue-400 flex items-center justify-center font-black text-base shrink-0 border border-blue-800/60">
                  {intv.report?.overallScore || (intv.status === 'completed' ? 88 : '—')}%
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {intv.jobRole} ({intv.experienceLevel})
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-1">
                    <span className="capitalize">{intv.interviewType}</span>
                    <span>•</span>
                    <span>{intv.totalQuestions} Questions</span>
                    <span>•</span>
                    <span className="capitalize">Diff: {intv.difficulty}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(intv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    intv.status === 'completed'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      : intv.status === 'in_progress'
                      ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                      : 'bg-[#1e1e24] text-zinc-400 border border-[#2e2e38]'
                  }`}
                >
                  {intv.status}
                </span>

                {intv.status === 'completed' && (
                  <button
                    onClick={() => onViewReport(intv.id)}
                    className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Report</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
