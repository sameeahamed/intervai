/**
 * AI Voice Interviewer Interactive Avatar Component
 * Features Bold Real-World Interviewer Persona with Natural Vocal Modulation
 */

import React from 'react';
import { VoiceState } from '../../types/index.ts';
import { Bot, Mic, Sparkles, Volume2, Loader2, VolumeX, UserCheck, ShieldCheck, User } from 'lucide-react';
import { AudioWaveform } from './AudioWaveform.tsx';
import { VoicePersona, VOICE_PERSONAS } from '../../services/voice.ts';

interface VoiceAvatarProps {
  voiceState: VoiceState;
  persona?: VoicePersona;
  onPersonaChange?: (persona: VoicePersona) => void;
  isMuted?: boolean;
  frequencyData?: Uint8Array | null;
  onRepeatQuestion?: () => void;
  onToggleMute?: () => void;
  volume?: number;
  onVolumeChange?: (vol: number) => void;
}

export const VoiceAvatar: React.FC<VoiceAvatarProps> = ({
  voiceState,
  persona = 'bold_executive',
  onPersonaChange,
  isMuted = false,
  frequencyData,
  onRepeatQuestion,
  onToggleMute,
  volume = 1,
  onVolumeChange,
}) => {
  const currentPersona = VOICE_PERSONAS[persona] || VOICE_PERSONAS.bold_executive;

  const getStateBadge = () => {
    switch (voiceState) {
      case 'ai_speaking':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-950/90 text-blue-300 border border-blue-600/70 shadow-sm animate-pulse">
            <Volume2 className="w-3.5 h-3.5 animate-bounce text-blue-400" />
            Speaking Naturally...
          </span>
        );
      case 'listening':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600/70 shadow-sm animate-pulse">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            Listening to Candidate...
          </span>
        );
      case 'processing':
      case 'evaluating':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-950/90 text-purple-300 border border-purple-600/70 shadow-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            Analyzing Response...
          </span>
        );
      case 'next_question':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/90 text-amber-300 border border-amber-600/70 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Preparing Next Question...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#18181c] text-zinc-300 border border-[#27272a]">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            Interviewer Active
          </span>
        );
    }
  };

  return (
    <div
      id="voice-interviewer-card"
      className="relative flex flex-col items-center justify-between p-6 bg-[#121215] border border-[#27272a] rounded-3xl shadow-xl text-[#e5e7eb] overflow-hidden min-h-[340px]"
    >
      {/* Background Ambient Glow */}
      <div
        className={`absolute -top-20 -left-20 w-52 h-52 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700 ${
          voiceState === 'ai_speaking'
            ? 'bg-blue-600 scale-150 opacity-40'
            : voiceState === 'listening'
            ? 'bg-emerald-600 scale-150 opacity-40'
            : voiceState === 'evaluating'
            ? 'bg-purple-600 scale-150 opacity-40'
            : 'bg-zinc-700'
        }`}
      />

      {/* Top Header & Status */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Realistic Voice Studio
          </span>
        </div>
        <div>{getStateBadge()}</div>
      </div>

      {/* Center Avatar Orb & Animated Rings */}
      <div className="relative my-4 flex items-center justify-center">
        {/* Outer Ring 1 */}
        <div
          className={`absolute w-40 h-40 rounded-full border border-blue-500/30 transition-transform duration-700 ${
            voiceState === 'ai_speaking'
              ? 'scale-125 border-blue-400/60 animate-ping'
              : voiceState === 'listening'
              ? 'scale-110 border-emerald-400/40 animate-pulse'
              : 'scale-90 opacity-20'
          }`}
        />

        {/* Outer Ring 2 */}
        <div
          className={`absolute w-32 h-32 rounded-full border border-indigo-400/30 transition-all duration-500 ${
            voiceState === 'ai_speaking'
              ? 'scale-115 border-blue-300/60'
              : voiceState === 'evaluating'
              ? 'border-purple-400/60 animate-spin'
              : 'scale-95 opacity-30'
          }`}
        />

        {/* Core Glowing Avatar Disc */}
        <div
          className={`relative w-22 h-22 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 p-1 ${
            voiceState === 'ai_speaking'
              ? 'bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 ring-4 ring-blue-400/60 shadow-blue-500/50'
              : voiceState === 'listening'
              ? 'bg-gradient-to-tr from-emerald-700 via-teal-600 to-green-500 ring-4 ring-emerald-400/60 shadow-emerald-500/50'
              : voiceState === 'evaluating'
              ? 'bg-gradient-to-tr from-purple-700 via-violet-600 to-fuchsia-500 ring-4 ring-purple-400/60 shadow-purple-500/50'
              : 'bg-gradient-to-tr from-[#1f1f23] to-[#27272a] ring-2 ring-[#3f3f46]'
          }`}
        >
          <Bot className="w-9 h-9 text-white drop-shadow-md" />
          <span className="text-[10px] font-bold text-blue-100 tracking-tighter uppercase mt-0.5">
            {persona === 'bold_executive' ? 'Executive' : persona === 'tech_lead' ? 'Tech Lead' : 'Director'}
          </span>
        </div>
      </div>

      {/* Audio Waveform */}
      <div className="w-full max-w-xs z-10">
        <AudioWaveform voiceState={voiceState} frequencyData={frequencyData} />
      </div>

      {/* Persona Selector Tabs */}
      {onPersonaChange && (
        <div className="w-full flex items-center justify-center gap-1.5 py-2 z-10">
          <span className="text-[11px] font-semibold text-zinc-400 mr-1">Voice Profile:</span>
          {(Object.keys(VOICE_PERSONAS) as VoicePersona[]).map((pKey) => {
            const isSelected = persona === pKey;
            return (
              <button
                key={pKey}
                id={`btn-persona-${pKey}`}
                onClick={() => onPersonaChange(pKey)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                    : 'bg-[#18181c] text-zinc-400 hover:text-zinc-200 hover:bg-[#222228] border border-[#27272a]'
                }`}
              >
                {pKey === 'bold_executive' ? 'Marcus (Bold Male)' : pKey === 'tech_lead' ? 'Alex (Tech Lead)' : 'Sarah (Director)'}
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Controls & Persona Info */}
      <div className="w-full flex items-center justify-between pt-3 border-t border-[#27272a] z-10">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            {currentPersona.name}
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 font-semibold border border-blue-800/50">
              Bold Voice
            </span>
          </h4>
          <p className="text-xs text-zinc-400">{currentPersona.title}</p>
        </div>

        <div className="flex items-center gap-2">
          {onRepeatQuestion && (
            <button
              id="btn-repeat-question"
              onClick={onRepeatQuestion}
              disabled={voiceState === 'ai_speaking' || voiceState === 'evaluating'}
              className="px-2.5 py-1.5 text-xs font-semibold bg-[#18181c] hover:bg-[#222228] text-zinc-200 rounded-lg border border-[#27272a] transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Repeat realistic question with AI voice"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Repeat
            </button>
          )}

          {onToggleMute && (
            <button
              id="btn-toggle-tts-mute"
              onClick={onToggleMute}
              className={`p-1.5 rounded-lg border transition ${
                isMuted
                  ? 'bg-red-950/60 text-red-300 border-red-800 hover:bg-red-900/80'
                  : 'bg-[#18181c] text-zinc-200 border-[#27272a] hover:bg-[#222228]'
              }`}
              title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          {onVolumeChange && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-blue-500"
              title="AI Voice Volume"
            />
          )}
        </div>
      </div>
    </div>
  );
};
