/**
 * Candidate Profile Settings & GDPR Data Management
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { useDialogA11y } from '../../utils/useDialogA11y.ts';
import {
  User,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  Lock,
  Sparkles
} from 'lucide-react';

export const CandidateProfile: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Full-Stack Developer');
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel || 'mid');
  const [skills, setSkills] = useState<string[]>(user?.skills || ['React', 'Node.js', 'PostgreSQL']);
  const [resumeText, setResumeText] = useState<string>(user?.resumeText || '');
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);

  const purgeDialogRef = useDialogA11y(showPurgeModal, () => setShowPurgeModal(false));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      await updateUser({
        name,
        targetRole,
        experienceLevel,
        skills,
        resumeText: resumeText.trim(),
      });
      setSuccessMsg('Profile preferences updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch {
      // err
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeData = async () => {
    setPurgeLoading(true);
    try {
      await api.purgeUserData();
      setShowPurgeModal(false);
      logout();
      window.location.reload();
    } catch {
      setPurgeLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-[#27272a] pb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </button>
        <h1 className="text-2xl font-black text-white">
          Candidate Profile & Privacy Controls
        </h1>
        <p className="text-xs text-zinc-400">
          Manage your career targets, target skill competencies, and data sovereignty
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="bg-[#121215] border border-[#27272a] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#18181c] border border-[#27272a] rounded-xl text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2.5 text-sm bg-[#18181c] border border-[#27272a] rounded-xl text-zinc-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
              Target Job Role
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#18181c] border border-[#27272a] rounded-xl text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
              Experience Level
            </label>
            <select
              value={experienceLevel}
               onChange={(e) => setExperienceLevel(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#18181c] border border-[#27272a] rounded-xl text-white"
            >
              <option value="entry">Entry Level (0-2 yrs)</option>
              <option value="mid">Mid Level (2-5 yrs)</option>
              <option value="senior">Senior (5-8 yrs)</option>
              <option value="lead">Staff / Lead (8+ yrs)</option>
            </select>
          </div>
        </div>

        {/* Skills Tag Management */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
            Default Profile Skills
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#18181c] text-zinc-200 text-xs font-medium rounded-full"
              >
                {s}
                <button
                  type="button"
                  onClick={() => setSkills(skills.filter((sk) => sk !== s))}
                  className="hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add skill tag..."
              className="flex-1 px-3.5 py-2 text-xs bg-[#18181c] border border-[#27272a] rounded-xl text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (newSkill.trim() && !skills.includes(newSkill.trim())) {
                  setSkills([...skills, newSkill.trim()]);
                  setNewSkill('');
                }
              }}
              className="px-4 py-2 bg-[#202026] text-zinc-200 text-xs font-semibold rounded-xl border border-[#3f3f46] hover:bg-[#27272a] transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Resume / Experience Text (Optional) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
            Resume / Experience Summary (Optional)
          </label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={6}
            maxLength={8000}
            placeholder="Paste your resume or a summary of your experience. Used only to personalize your interview questions."
            className="w-full px-3.5 py-2.5 text-sm bg-[#18181c] border border-[#27272a] rounded-xl text-white resize-y"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-zinc-400">
              Stored with your profile. Do not include sensitive personal data you don't want sent to the AI provider.
            </p>
            <span className="text-[11px] text-zinc-500 shrink-0 ml-2">
              {resumeText.length}/8000
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>

      {/* GDPR Data Erasure Zone */}
      <div className="bg-red-950/20 border border-red-900/40 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950 text-red-400 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Data Privacy & Right to Erasure (GDPR)
            </h3>
            <p className="text-xs text-zinc-400">
              Permanently purge all your interview transcripts, evaluations, and recordings
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          In compliance with international data privacy laws, you can trigger an irreversible deletion of all interview attempts, audio logs, answers, and visual practice metrics associated with your account.
        </p>

        <button
          type="button"
          onClick={() => setShowPurgeModal(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" />
          <span>Purge All My Interview Records</span>
        </button>
      </div>

      {/* Purge Modal */}
      {showPurgeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setShowPurgeModal(false)}
        >
          <div
            ref={purgeDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="purge-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#121215] border border-[#27272a] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 focus:outline-none"
          >
            <h3 id="purge-modal-title" className="text-base font-bold text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Confirm Complete Data Purge
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure? This will delete all your interview history, evaluations, metrics, and reset your score progression. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-[#18181c] rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handlePurgeData}
                disabled={purgeLoading}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl"
              >
                {purgeLoading ? 'Purging...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
