/**
 * Footer Component for IntervAI Platform
 */

import React from 'react';
import { Sparkles, Shield, Cpu, Github, ExternalLink } from 'lucide-react';

export const Footer: React.FC<{ onOpenPrivacy: () => void }> = ({ onOpenPrivacy }) => {
  return (
    <footer className="w-full bg-[#0a0a0b] border-t border-[#27272a] text-zinc-400 py-10 mt-auto print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Project Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-white">
                Interv<span className="text-blue-400">AI</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed max-w-sm text-zinc-400">
              Enterprise-grade AI Voice Interview Assessment Platform. Developed as a production-ready Final-Year Capstone Project demonstrating real-time voice synthesis, adaptive evaluation, and responsible engagement telemetry.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Gemini GenAI & Voice Engine Online
              </span>
            </div>
          </div>

          {/* Core Modules */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 mb-3">
              Platform Features
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>Real-Time Voice STT/TTS</li>
              <li>Adaptive Difficulty Engine</li>
              <li>Multi-Dimensional AI Scoring</li>
              <li>Client-Side Frame Sampling</li>
              <li>Comprehensive Analytics & Reports</li>
            </ul>
          </div>

          {/* Responsible AI & Compliance */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 mb-3">
              Ethics & Privacy
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <button
                  onClick={onOpenPrivacy}
                  className="hover:text-blue-400 transition text-left flex items-center gap-1"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Privacy & Ethics Policy
                </button>
              </li>
              <li>Zero Facial Recognition</li>
              <li>No Psychological Profiling</li>
              <li>1-Click GDPR Data Erasure</li>
              <li>Local Edge Video Processing</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[#1e1e24] flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-3">
          <p>© 2026 IntervAI Assessment Systems. Academic Capstone & SaaS Demonstration.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-zinc-400">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              TypeScript • React 19 • Express • PostgreSQL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
