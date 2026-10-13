/**
 * Admin Portal & Management Dashboard
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.ts';
import {
  AdminAnalytics,
  User,
  InterviewTemplate,
  ScoringConfig,
  IntegrityEvent
} from '../../types/index.ts';
import {
  Sliders,
  Users,
  BarChart3,
  Award,
  Clock,
  Layers,
  Settings,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  Search,
  FileText,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const AdminDashboard: React.FC<{ onViewCandidateReport?: (id: string) => void }> = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'candidates' | 'templates' | 'scoring' | 'audit'>('analytics');
  const [analytics, setAnalytics] = useState<(AdminAnalytics & { users: User[] }) | null>(null);
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig | null>(null);
  const [auditEvents, setAuditEvents] = useState<IntegrityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Template creation form state
  const [newTemplateRole, setNewTemplateRole] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateExp, setNewTemplateExp] = useState<'entry' | 'mid' | 'senior' | 'lead'>('mid');
  const [newTemplateSkills, setNewTemplateSkills] = useState('React, Node.js, SQL');
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);

  // Scoring weights state
  const [techWeight, setTechWeight] = useState(30);
  const [commWeight, setCommWeight] = useState(25);
  const [reasonWeight, setReasonWeight] = useState(20);
  const [relevWeight, setRelevWeight] = useState(15);
  const [compWeight, setCompWeight] = useState(10);
  const [scoringSuccess, setScoringSuccess] = useState<string | null>(null);

  // Search candidate
  const [candidateSearch, setCandidateSearch] = useState('');

  useEffect(() => {
    async function loadAdminData() {
      try {
        setLoading(true);
        const [admData, tmplData, scoreData, auditData] = await Promise.all([
          api.getAdminAnalytics(),
          api.getTemplates(),
          api.getScoringConfig(),
          api.getIntegrityEvents(),
        ]);
        setAnalytics(admData);
        setTemplates(tmplData);
        setScoringConfig(scoreData);
        setAuditEvents(auditData.events || []);

        if (scoreData) {
          setTechWeight(scoreData.weightTechnical || 30);
          setCommWeight(scoreData.weightCommunication || 25);
          setReasonWeight(scoreData.weightReasoning || 20);
          setRelevWeight(scoreData.weightRelevance || 15);
          setCompWeight(scoreData.weightCompleteness || 10);
        }
      } catch (err) {
        console.warn('Admin load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateRole.trim()) return;

    try {
      const skillsArray = newTemplateSkills.split(',').map((s) => s.trim()).filter(Boolean);
      const created = await api.createTemplate({
        title: `${newTemplateRole} Template`,
        jobRole: newTemplateRole,
        experienceLevel: newTemplateExp,
        interviewType: 'technical',
        defaultDifficulty: 'adaptive',
        skills: skillsArray,
        description: newTemplateDesc || 'Default automated interview rubric template',
        questionCount: 5,
        durationMinutes: 20,
      });

      setTemplates([...templates, created]);
      setNewTemplateRole('');
      setNewTemplateDesc('');
      setTemplateSuccess('Interview template created successfully!');
      setTimeout(() => setTemplateSuccess(null), 3000);
    } catch {
      // handle
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.deleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
    } catch {}
  };

  const handleSaveScoringWeights = async () => {
    try {
      const updated = await api.updateScoringConfig({
        weightTechnical: techWeight,
        weightCommunication: commWeight,
        weightReasoning: reasonWeight,
        weightRelevance: relevWeight,
        weightCompleteness: compWeight,
      });
      setScoringConfig(updated);
      setScoringSuccess('Scoring configuration updated successfully!');
      setTimeout(() => setScoringSuccess(null), 3000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-zinc-400">Loading Enterprise Admin Portal...</p>
        </div>
      </div>
    );
  }

  const roleDistributionData = (analytics?.roleDistribution || []).map((r: any) => ({
    name: r.role,
    count: r.count,
  }));

  const completionRate =
    analytics?.totalInterviews && analytics.totalInterviews > 0
      ? Math.round(((analytics.completedInterviews || 0) / analytics.totalInterviews) * 100)
      : null;

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

  const filteredUsers = (analytics?.users || []).filter(
    (u) =>
      u.name.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      (u.targetRole || '').toLowerCase().includes(candidateSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-[#e5e7eb]">
      {/* 1. ADMIN HEADER & TABS */}
      <div className="border-b border-[#27272a] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 text-xs font-semibold mb-2">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            Platform Control Plane
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Admin & Recruiter Portal
          </h1>
          <p className="text-xs text-zinc-400">
            Monitor candidate performance benchmarks, interview templates, scoring models, and audit logs
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap bg-[#121215] border border-[#27272a] p-1 rounded-2xl">
          {[
            { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
            { id: 'candidates', label: 'Candidates', icon: Users },
            { id: 'templates', label: 'Job Templates', icon: Layers },
            { id: 'scoring', label: 'Scoring Weights', icon: Settings },
            { id: 'audit', label: 'Audit Log', icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                  active
                    ? 'bg-[#202026] text-white border border-[#3f3f46] shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TAB 1: ANALYTICS & OVERVIEW */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Total Candidates
              </span>
              <div className="text-3xl font-black text-white">
                {analytics?.totalCandidates ?? 0}
              </div>
              <p className="text-[11px] text-zinc-500">Registered platform users</p>
            </div>

            <div className="p-5 bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Total Interviews
              </span>
              <div className="text-3xl font-black text-white">
                {analytics?.totalInterviews ?? 0}
              </div>
              <p className={`text-[11px] font-medium ${completionRate === null ? 'text-zinc-500' : 'text-emerald-400'}`}>
                {completionRate === null ? 'No interviews yet' : `${completionRate}% Completion Rate`}
              </p>
            </div>

            <div className="p-5 bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Average Overall Score
              </span>
              <div className="text-3xl font-black text-white">
                {analytics?.averageScore ?? 0}%
              </div>
              <p className="text-[11px] text-zinc-500">Across all job roles</p>
            </div>

            <div className="p-5 bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Average Duration
              </span>
              <div className="text-3xl font-black text-white">
                {analytics?.averageDurationMinutes ?? 0} <span className="text-base font-normal text-zinc-400">mins</span>
              </div>
              <p className="text-[11px] text-zinc-500">Voice assessment interaction</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution Bar Chart */}
            <div className="p-6 bg-[#121215] border border-[#27272a] rounded-3xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white">
                Score Range Distribution
              </h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.scoreDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="range" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121215',
                        borderColor: '#27272a',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Interviews by Job Role Pie Chart */}
            <div className="p-6 bg-[#121215] border border-[#27272a] rounded-3xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white">
                Interviews Conducted by Job Role
              </h3>
              <div className="w-full h-64 flex items-center justify-center">
                {roleDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleDistributionData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {roleDistributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#121215',
                          borderColor: '#27272a',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm font-medium text-zinc-400">
                    No completed interviews by job role yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: CANDIDATE MANAGEMENT */}
      {activeTab === 'candidates' && (
        <div className="bg-[#121215] border border-[#27272a] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Registered Candidates ({filteredUsers.length})
              </h3>
              <p className="text-xs text-zinc-400">
                Inspect candidate performance benchmarks and target competencies
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                placeholder="Search candidate name or email..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#27272a] text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">Candidate</th>
                  <th className="py-3 px-3">Target Role</th>
                  <th className="py-3 px-3">Experience</th>
                  <th className="py-3 px-3">Role Type</th>
                  <th className="py-3 px-3">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e24]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#18181c] transition">
                    <td className="py-3 px-3 flex items-center gap-2.5">
                      <img
                        src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                        alt={u.name}
                        className="w-7 h-7 rounded-full bg-[#27272a]"
                      />
                      <div>
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-[10px] text-zinc-400">{u.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-300 font-medium">
                      {u.targetRole || 'Full-Stack Developer'}
                    </td>
                    <td className="py-3 px-3 uppercase text-zinc-400">{u.experienceLevel || 'mid'}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                            : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-zinc-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB 3: INTERVIEW TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Template Form (5 cols) */}
          <div className="lg:col-span-5 bg-[#121215] border border-[#27272a] rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              Create Interview Template
            </h3>

            {templateSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{templateSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateTemplate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Job Role Title
                </label>
                <input
                  type="text"
                  required
                  value={newTemplateRole}
                  onChange={(e) => setNewTemplateRole(e.target.value)}
                  placeholder="e.g. Senior Machine Learning Engineer"
                  className="w-full px-3 py-2 text-xs bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Target Experience
                </label>
                <select
                  value={newTemplateExp}
                  onChange={(e) => setNewTemplateExp(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-[#18181c] border border-[#27272a] rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="lead">Lead / Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Required Competencies (Comma-separated)
                </label>
                <input
                  type="text"
                  value={newTemplateSkills}
                  onChange={(e) => setNewTemplateSkills(e.target.value)}
                  placeholder="PyTorch, Transformers, LLMs, Optimization"
                  className="w-full px-3 py-2 text-xs bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Description / Rubric Directive
                </label>
                <textarea
                  rows={2}
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  placeholder="Specific assessment focus areas..."
                  className="w-full px-3 py-2 text-xs bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Template</span>
              </button>
            </form>
          </div>

          {/* Templates List (7 cols) */}
          <div className="lg:col-span-7 bg-[#121215] border border-[#27272a] rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white">
              Active Assessment Templates ({templates.length})
            </h3>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-4 bg-[#18181c] border border-[#27272a] rounded-2xl flex items-start justify-between gap-4"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {tmpl.jobRole} ({tmpl.experienceLevel})
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{tmpl.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                       {((tmpl as any).skills ?? (tmpl as any).defaultSkills ?? []).map((s: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-[#222228] border border-[#33333d] text-zinc-300 text-[10px] rounded-md font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-[#222228] transition"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 4: SCORING WEIGHTS CONFIG */}
      {activeTab === 'scoring' && (
        <div className="bg-[#121215] border border-[#27272a] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-white">
              Multi-Dimensional Scoring Model Calibration
            </h3>
            <p className="text-xs text-zinc-400">
              Customize the weight percentages used by the AI engine when computing overall candidate scores
            </p>
          </div>

          {scoringSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{scoringSuccess}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-300">
                <span>Technical Accuracy</span>
                <span className="text-blue-400">{techWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={techWeight}
                onChange={(e) => setTechWeight(parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-300">
                <span>Communication Clarity</span>
                <span className="text-blue-400">{commWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={commWeight}
                onChange={(e) => setCommWeight(parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-300">
                <span>Reasoning & Problem Solving</span>
                <span className="text-blue-400">{reasonWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={reasonWeight}
                onChange={(e) => setReasonWeight(parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-300">
                <span>Relevance & Directness</span>
                <span className="text-blue-400">{relevWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={relevWeight}
                onChange={(e) => setRelevWeight(parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-300">
                <span>Completeness & Depth</span>
                <span className="text-blue-400">{compWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                value={compWeight}
                onChange={(e) => setCompWeight(parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#27272a] flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Total Combined: {techWeight + commWeight + reasonWeight + relevWeight + compWeight}%
            </span>
            <button
              onClick={handleSaveScoringWeights}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Weights Configuration</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-[#121215] border border-[#27272a] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">
                Platform Security & AI Integrity Audit Logs
              </h3>
              <p className="text-xs text-zinc-400">
                Integrity events (tab switches, camera/mic disconnects) recorded during candidate sessions
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
              {auditEvents.length} Integrity Event{auditEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          {auditEvents.length === 0 ? (
            <div className="p-8 text-center bg-[#18181c] rounded-xl border border-dashed border-[#27272a]">
              <p className="text-sm font-medium text-zinc-300">
                No integrity events recorded yet.
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Integrity events appear here as candidates complete interview sessions.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 font-mono text-xs text-zinc-300">
              {auditEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 bg-[#18181c] rounded-xl border border-[#27272a] flex items-start gap-3"
                >
                  <span className="text-blue-400 font-bold">
                    {new Date(ev.createdAt).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] bg-[#222228] border border-[#33333d] rounded font-semibold text-zinc-200 uppercase">
                    {ev.eventType}
                  </span>
                  <span className="text-zinc-300 flex-1">{ev.details || ev.eventType}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
