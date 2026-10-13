/**
 * Privacy, Security, and Responsible AI Consent Modal
 */

import React from 'react';
import { ShieldCheck, Camera, Mic, Brain, Lock, Trash2, CheckCircle2, X } from 'lucide-react';

interface PrivacyConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const PrivacyConsentModal: React.FC<PrivacyConsentModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-[#e5e7eb]">
      <div
        id="privacy-consent-dialog"
        className="bg-[#121215] border border-[#27272a] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#18181c] transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/60 text-blue-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Privacy, Ethics & Data Transparency
            </h2>
            <p className="text-xs text-zinc-400">
              IntervAI Responsible AI & Candidate Data Protection Framework
            </p>
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-4 text-sm text-zinc-300">
          {/* Microphones */}
          <div className="p-3.5 bg-[#18181c] rounded-xl border border-[#27272a]">
            <div className="flex items-start gap-3">
              <Mic className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">
                  1. Real-Time Voice & Microphone Usage
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                  Your spoken voice is converted into text transcripts in real time for AI answer evaluation. You can always inspect and fine-tune your transcript before finalizing any response, or switch to Text Fallback mode if in a noisy environment.
                </p>
              </div>
            </div>
          </div>

          {/* Camera & Visual Signals */}
          <div className="p-3.5 bg-[#18181c] rounded-xl border border-[#27272a]">
            <div className="flex items-start gap-3">
              <Camera className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">
                  2. Camera Engagement & Ethical Constraints
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                  Camera video is processed <strong>locally inside your browser</strong> to evaluate basic practice presentation factors (lighting quality, camera stability, and center framing).
                </p>
                <div className="mt-2 p-2 bg-blue-950/40 rounded-lg text-[11px] text-blue-300 border border-blue-900/60">
                  <strong>Strict Ethical Guarantee:</strong> We DO NOT perform facial recognition, biometric identity scanning, or psychological profiling (e.g. honesty, mental health, or protected demographic characteristics).
                </div>
              </div>
            </div>
          </div>

          {/* AI Answer Evaluation */}
          <div className="p-3.5 bg-[#18181c] rounded-xl border border-[#27272a]">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">
                  3. Objective Multi-Dimensional AI Scoring
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                  Evaluations focus strictly on technical accuracy, relevance, reasoning structure, and completeness relative to industry job requirements. AI models generate model exemplar answers to help you improve.
                </p>
              </div>
            </div>
          </div>

          {/* Data Ownership & Purge */}
          <div className="p-3.5 bg-[#18181c] rounded-xl border border-[#27272a]">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-white">
                  4. Complete Data Ownership & Right to Erasure
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                  Your interview transcripts, scores, and reports remain confidential to your account. You can export your data anytime via CSV/PDF, or trigger an irreversible 1-click data purge in Profile Settings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#27272a]">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-[#18181c] rounded-xl transition"
          >
            Close
          </button>
          {onAccept && (
            <button
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="w-full sm:w-auto px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              I Understand & Consent
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
