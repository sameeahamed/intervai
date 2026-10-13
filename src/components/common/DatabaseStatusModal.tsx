/**
 * MongoDB Atlas Database Status Modal
 * Displays real-time connection telemetry, cluster details, and collection statistics
 */

import React, { useState, useEffect } from 'react';
import { Database, Server, RefreshCw, CheckCircle2, AlertCircle, HardDrive, Layers, Activity, X } from 'lucide-react';
import { api } from '../../services/api.ts';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusData, setStatusData] = useState<{
    status: string;
    connected: boolean;
    cluster: string;
    database: string;
    uriMasked: string;
    pingMs: number | null;
    counts: Record<string, number>;
    lastConnected: string | null;
    error: string | null;
  } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getDatabaseStatus();
      setStatusData(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await api.syncDatabase();
      if (res.status) {
        setStatusData(res.status);
      }
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121216] border border-[#27272a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272a] bg-[#18181f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                MongoDB Atlas Database
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                  Active
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Production Cloud Persistence Layer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#27272a] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Connection Status Card */}
          <div className="p-4 rounded-xl bg-[#18181c] border border-[#27272a] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cluster Host</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {statusData?.cluster || 'not configured'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Database Name</span>
              <span className="text-xs font-mono text-zinc-200">
                {statusData?.database || 'intervai'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Connection URI</span>
              <span className="text-[11px] font-mono text-zinc-400 bg-[#0f0f12] px-2 py-1 rounded border border-[#222228] truncate max-w-[260px]">
                {statusData?.uriMasked || 'not configured - set MONGODB_URI'}
              </span>
            </div>

            {statusData?.pingMs !== null && statusData?.pingMs !== undefined && (
              <div className="flex items-center justify-between pt-1 border-t border-[#27272a]/60">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  Cluster Ping Latency
                </span>
                <span className="text-xs font-semibold text-blue-400">
                  {statusData.pingMs} ms
                </span>
              </div>
            )}
          </div>

          {/* Collections Grid */}
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              Synced Collections & Records
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#27272a] text-center">
                <div className="text-lg font-extrabold text-white">
                  {statusData?.counts?.users ?? '—'}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">Users</div>
              </div>
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#27272a] text-center">
                <div className="text-lg font-extrabold text-white">
                  {statusData?.counts?.interviews ?? '—'}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">Interviews</div>
              </div>
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#27272a] text-center">
                <div className="text-lg font-extrabold text-white">
                  {statusData?.counts?.questions ?? '—'}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">Questions</div>
              </div>
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#27272a] text-center">
                <div className="text-lg font-extrabold text-white">
                  {statusData?.counts?.answers ?? '—'}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">Answers</div>
              </div>
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#27272a] text-center">
                <div className="text-lg font-extrabold text-white">
                  {statusData?.counts?.evaluations ?? '—'}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">Evaluations</div>
              </div>
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#27272a] text-center">
                <div className="text-lg font-extrabold text-white">
                  {statusData?.counts?.reports ?? '—'}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">Reports</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#18181f] border-t border-[#27272a]">
          <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
            Auto-synced on all mutations
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={syncing || loading}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Atlas'}
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-[#27272a] hover:bg-[#323238] rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
