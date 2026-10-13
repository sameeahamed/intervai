/**
 * Authentication Modal (Login / Register / Quick Demo Credentials)
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useDialogA11y } from '../../utils/useDialogA11y.ts';
import {
  X,
  LogIn,
  UserPlus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  User,
  KeyRound,
  Mail,
  ArrowLeft,
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
  resetToken?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
  resetToken = null,
}) => {
  const { login, register, forgotPassword, resetPassword, quickDemoLogin } = useAuth();
  const [mode, setMode] = useState<AuthMode>(resetToken ? 'reset' : initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('Full-Stack Developer');
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const dialogRef = useDialogA11y(isOpen, onClose);

  if (!isOpen) return null;

  const resetLocalFeedback = () => {
    setError(null);
    setNotice(null);
    setDevResetToken(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      if (mode === 'register') {
        await register({
          name,
          email,
          password,
          role: 'candidate',
          targetRole,
          experienceLevel,
          skills: ['Problem Solving', 'System Design', 'Core Domain'],
        });
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      if (mode === 'forgot') {
        const res = await forgotPassword(email);
        setNotice(res.message);
        if (res.devResetToken) setDevResetToken(res.devResetToken);
        return;
      }

      if (mode === 'reset') {
        if (!resetToken) {
          setError('This reset link is missing its token. Please request a new password reset link.');
          return;
        }
        if (password !== confirmPassword) {
          setError('The two passwords do not match.');
          return;
        }
        const res = await resetPassword(resetToken, password);
        setNotice(res.message);
        setMode('login');
        return;
      }
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-[#e5e7eb]"
      onClick={onClose}
    >
      <div
        id="auth-modal-dialog"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121215] border border-[#27272a] rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-8 relative focus:outline-none"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#18181c] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto mb-3 shadow-md shadow-blue-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 id="auth-modal-title" className="text-xl font-bold text-white">
            {mode === 'login' && 'Welcome Back to IntervAI'}
            {mode === 'register' && 'Create Candidate Account'}
            {mode === 'forgot' && 'Reset Your Password'}
            {mode === 'reset' && 'Set a New Password'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === 'login' && 'Sign in to access your interview simulator and analytics'}
            {mode === 'register' && 'Join the AI-powered voice interview preparation platform'}
            {mode === 'forgot' && 'Enter your email and we will send a reset link if an account exists'}
            {mode === 'reset' && 'Choose a new password for your account'}
          </p>
        </div>

        {/* Tab switch (login / register only) */}
        {(mode === 'login' || mode === 'register') && (
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
        )}

        {(mode === 'forgot' || mode === 'reset') && (
          <button
            type="button"
            onClick={() => {
              resetLocalFeedback();
              setMode('login');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </button>
        )}

        {notice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{notice}</span>
            </div>
            {devResetToken && (
              <p className="break-all text-[10px] text-emerald-200/80 font-mono">
                Dev reset token: {devResetToken}
              </p>
            )}
          </div>
        )}

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

          {mode !== 'reset' && (
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
          )}

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-300">
                  {mode === 'reset' ? 'New Password' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      resetLocalFeedback();
                      setMode('forgot');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Forgot password?</span>
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={mode === 'reset' ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {mode === 'reset' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm bg-[#18181c] border border-[#27272a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[10px] text-zinc-500 mt-1">At least 8 characters.</p>
            </div>
          )}

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
            {mode === 'login' && <LogIn className="w-4 h-4" />}
            {mode === 'register' && <UserPlus className="w-4 h-4" />}
            {mode === 'forgot' && <Mail className="w-4 h-4" />}
            {mode === 'reset' && <KeyRound className="w-4 h-4" />}
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'register'
              ? 'Create Account'
              : mode === 'forgot'
              ? 'Send Reset Link'
              : 'Reset Password'}
          </button>
        </form>

        {/* 1-Click Presentation Demo Logins */}
        {(mode === 'login' || mode === 'register') && (
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
        )}
      </div>
    </div>
  );
};
