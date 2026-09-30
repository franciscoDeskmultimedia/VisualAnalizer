'use client';

import React from 'react';
import {
  AlertTriangle,
  Cloud,
  Database,
  RefreshCw,
  Sparkles,
  X,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';

interface StorageLimitModalProps {
  isOpen: boolean;
  projectName: string;
  onClose: () => void;
  onConnectStorage: () => void;
  onConfirmReplaceRun: () => void;
}

export function StorageLimitModal({
  isOpen,
  projectName,
  onClose,
  onConnectStorage,
  onConfirmReplaceRun,
}: StorageLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Session Limit Reached
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                2-Run Temporary Storage Limit
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-2 space-y-4 relative z-10 text-xs text-slate-300">
          <p className="leading-relaxed">
            Project <span className="font-semibold text-white font-mono">&ldquo;{projectName}&rdquo;</span> is currently operating in <strong className="text-amber-300">Ephemeral Session Mode</strong> without cloud storage configured.
          </p>

          {/* Mode Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Ephemeral (Current) */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <Database className="w-4 h-4 text-slate-400" />
                <span>Temporary Mode</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li className="flex items-start gap-1.5 text-amber-300/90">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Max 2 runs:</strong> 1 Baseline + 1 Current Check</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-slate-500">•</span>
                  <span>Data stored temporarily in database</span>
                </li>
                <li className="flex items-start gap-1.5 text-rose-300/90">
                  <span className="text-rose-400 font-bold">•</span>
                  <span><strong>Data lost</strong> when session ends / sign out</span>
                </li>
              </ul>
            </div>

            {/* Cloud Storage (Unlocked) */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 space-y-2.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-indigo-300 font-semibold text-[11px] uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-indigo-400" />
                  <span>Cloud Storage Mode</span>
                </div>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-500/30 font-bold">
                  PRO
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-start gap-1.5 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Unlimited runs</strong> & full history timeline</span>
                </li>
                <li className="flex items-start gap-1.5 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span><strong>Persistent:</strong> Data never deleted on logout</span>
                </li>
                <li className="flex items-start gap-1.5 text-indigo-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span>AWS S3, Cloudflare R2, or Supabase</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              To run another check now, you can <strong>replace your previous test run</strong> or <strong>connect your cloud storage</strong> to keep both and unlock unlimited runs.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 mt-2 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors order-3 sm:order-1"
          >
            Cancel
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            {/* Secondary: Replace previous run */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onConfirmReplaceRun();
              }}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Discards previous comparison run and runs a fresh check against baseline"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Replace Previous Run</span>
            </button>

            {/* Primary: Connect cloud storage */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onConnectStorage();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Cloud className="w-4 h-4" />
              <span>Connect Cloud Storage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
