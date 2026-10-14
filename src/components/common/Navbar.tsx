/**
 * Navigation Header for IntervAI Platform
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import {
  Sparkles,
  LayoutDashboard,
  Mic,
  History,
  ShieldAlert,
  UserCheck,
  LogOut,
  LogIn,
  Sliders,
  ShieldCheck,
  Database,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenPrivacyModal: () => void;
  onOpenAuthModal: () => void;
  onOpenDatabaseModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenPrivacyModal,
  onOpenAuthModal,
  onOpenDatabaseModal,
}) => {
  const { user, isAuthenticated, isAdmin, logout, quickDemoLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresAuth: true },
    { id: 'setup', label: 'Start Interview', icon: Mic, requiresAuth: true },
    { id: 'history', label: 'History & Reports', icon: History, requiresAuth: true },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Portal', icon: Sliders, requiresAuth: true }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0a0b]/90 backdrop-blur-md border-b border-[#27272a] text-[#e5e7eb] transition-colors print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'landing')}
            className="flex items-center gap-2.5 focus:outline-none group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-white tracking-tight">
                  Interv<span className="text-blue-400">AI</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-950/80 text-blue-300 rounded-md border border-blue-800/80">
                  Voice AI
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 hidden sm:block">
                Adaptive Voice Interview Platform
              </p>
            </div>
          </button>

          {/* Desktop Nav Links */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-link-${item.id}`}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition ${
                      active
                        ? 'bg-blue-950/70 text-blue-400 font-semibold border border-blue-800/60'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* Quick 1-Click Presentation Demo Logins (explicit demo action - not automatic) */}
          <div className="hidden lg:flex items-center bg-[#18181c] p-1 rounded-xl border border-[#27272a]">
            <button
              onClick={() => {
                quickDemoLogin('candidate');
                onNavigate('dashboard');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                isAuthenticated && !isAdmin
                  ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="Demo Login - switch to Candidate view (candidate@intervai.com)"
            >
              Demo Candidate
            </button>
            <button
              onClick={() => {
                quickDemoLogin('admin');
                onNavigate('admin');
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                isAuthenticated && isAdmin
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="Demo Login - switch to Admin Dashboard (admin@intervai.com)"
            >
              Demo Admin
            </button>
          </div>

          {/* MongoDB Atlas Status Chip */}
          {onOpenDatabaseModal && (
            <button
              id="btn-nav-mongodb"
              onClick={onOpenDatabaseModal}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 transition"
              title="MongoDB Atlas Connected (Cluster0) - Click to view status"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">MongoDB Atlas</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          )}

          {/* Theme Toggle */}
          <button
            id="btn-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-2 text-zinc-400 hover:text-zinc-100 rounded-xl hover:bg-[#18181c] transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Privacy Modal Button */}
          <button
            id="btn-nav-privacy"
            onClick={onOpenPrivacyModal}
            className="p-2 text-zinc-400 hover:text-zinc-100 rounded-xl hover:bg-[#18181c] border border-transparent hover:border-[#27272a] transition"
            title="Privacy & AI Ethics Transparency"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>

          {/* User Profile / Auth Actions */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <button
                id="btn-user-profile"
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2 p-1.5 pl-2 pr-3 bg-[#18181c] hover:bg-[#202026] rounded-xl transition border border-[#27272a]"
              >
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                  alt={user.name}
                  className="w-7 h-7 rounded-full bg-zinc-800 object-cover"
                />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-zinc-100 truncate max-w-[110px]">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 capitalize">
                    {user.role}
                  </div>
                </div>
              </button>

              <button
                id="btn-logout"
                onClick={() => {
                  logout();
                  onNavigate('landing');
                }}
                className="p-2 text-zinc-400 hover:text-red-400 rounded-xl hover:bg-red-950/40 border border-transparent hover:border-red-900/40 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-900/20 transition flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            </div>
          )}

          {/* Mobile menu hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-300 rounded-xl hover:bg-[#18181c] transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#27272a] bg-[#0a0a0b] px-4 pt-2 pb-4 space-y-1 shadow-2xl">
          {isAuthenticated && (
            <>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition ${
                      active
                        ? 'bg-blue-950/70 text-blue-400 font-semibold border border-blue-800/60'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#18181c]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}

              <div className="pt-2 border-t border-[#27272a] flex items-center justify-around">
                <button
                  onClick={() => {
                    quickDemoLogin('candidate');
                    setMobileMenuOpen(false);
                    onNavigate('dashboard');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#18181c] rounded-lg text-blue-400 border border-[#27272a]"
                >
                  Demo Candidate
                </button>
                <button
                  onClick={() => {
                    quickDemoLogin('admin');
                    setMobileMenuOpen(false);
                    onNavigate('admin');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#18181c] rounded-lg text-purple-400 border border-[#27272a]"
                >
                  Demo Admin
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};
