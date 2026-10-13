/**
 * Authentication Modal (Login / Register / Quick Demo Credentials)
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { X, LogIn, UserPlus, Sparkles, AlertCircle, CheckCircle2, ShieldCheck, User } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const { login, register, quickDemoLogin } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('Full-Stack Developer');
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          name,
          email,
          password,
          role: 'candidate',
          targetRole,
          experienceLevel,
          skills: ['Problem Solving', 'System Design', 'Core Domain'],
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: 'candidate' | 'admin') => {
    setLoading(true);
    try {
      await quickDemoLogin(role);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-[#e5e7eb]">
      <div
        id="auth-modal-dialog"
        className="bg-[#121215] border border-[#27272a] rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-8 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#18181c] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto mb-3 shadow-md shadow-blue-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">
            {mode === 'login' ? 'Welcome Back to IntervAI' : 'Create Candidate Account'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === 'login'
              ? 'Sign in to access your interview simulator and analytics'
              : 'Join the AI-powered voice interview preparation platform'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#18181c] border border-[#27272a] p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'login'
                ? 'bg-[#202026] text-white border border-[#3f3f46] shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'register'
                ? 'bg-[#202026] text-white border border-[#3f3f46] shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full px-3.5 py-2 text-sm bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@intervai.com"
              className="w-full px-3.5 py-2 text-sm bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 text-sm bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Target Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-[#18181c] border border-[#27272a] rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Full-Stack Developer">Full-Stack Developer</option>
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="Data Analyst">Data Analyst</option>
                  <option value="Cloud Engineer">Cloud Engineer</option>
                  <option value="UI/UX Designer">UI/UX Designer</option>
                  <option value="Cybersecurity Analyst">Cybersecurity Analyst</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-[#18181c] border border-[#27272a] rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="lead">Engineering Lead</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* 1-Click Presentation Demo Logins */}
        <div className="mt-6 pt-4 border-t border-[#27272a]">
          <p className="text-[11px] font-semibold text-center text-zinc-400 mb-2.5">
            ⚡ Quick 1-Click Presentation Demo Logins:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('candidate')}
              disabled={loading}
              className="px-3 py-2 text-xs font-semibold bg-blue-950/60 text-blue-300 rounded-xl border border-blue-800/60 hover:bg-blue-900/60 transition flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              Demo Candidate
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              disabled={loading}
              className="px-3 py-2 text-xs font-semibold bg-purple-950/60 text-purple-300 rounded-xl border border-purple-800/60 hover:bg-purple-900/60 transition flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Demo Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
