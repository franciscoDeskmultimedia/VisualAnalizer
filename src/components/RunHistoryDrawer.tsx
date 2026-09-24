'use client';

import React from 'react';
import { Run } from '@/types';
import {
  X,
  History,
  Star,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  Clock
} from 'lucide-react';

interface RunHistoryDrawerProps {
  runs: Run[];
  activeRunId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectRun: (run: Run) => void;
  onSetAsBaseline: (runId: string) => Promise<void>;
}

export function RunHistoryDrawer({
  runs,
  activeRunId,
  isOpen,
  onClose,
  onSelectRun,
  onSetAsBaseline,
}: RunHistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-base font-bold text-white">Visual Runs History</h3>
                <p className="text-xs text-slate-400">
                  Select a past run to inspect diffs or promote to baseline.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List of Runs */}
          <div className="p-6 overflow-y-auto flex-1 space-y-3">
            {runs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs">No runs recorded yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Click &ldquo;Run Visual Check&rdquo; to start your first visual comparison.
                </p>
              </div>
            ) : (
              runs.map((run, idx) => {
                const isSelected = run.id === activeRunId;
                const formattedDate = new Date(run.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={run.id}
                    className={`rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'bg-indigo-950/20 border-indigo-500/50 shadow-lg shadow-indigo-950/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          Run #{runs.length - idx}
                        </span>
                        {run.isBaseline && (
                          <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5 fill-amber-300" />
                            Baseline
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Stats pills */}
                    <div className="flex items-center gap-2 my-2.5">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{run.passedChecks} Matched</span>
                      </div>

                      {run.changedChecks > 0 && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{run.changedChecks} Changed</span>
                        </div>
                      )}

                      {run.newChecks > 0 && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                          <Sparkles className="w-3 h-3" />
                          <span>{run.newChecks} New</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-3">
                      {!run.isBaseline ? (
                        <button
                          type="button"
                          onClick={() => onSetAsBaseline(run.id)}
                          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-amber-300 transition-colors"
                        >
                          <Star className="w-3 h-3" />
                          <span>Set as Baseline</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-amber-400 font-mono">Current Base</span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          onSelectRun(run);
                          onClose();
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <span>Inspect Diffs</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
