'use client';

import React from 'react';
import { Project } from '@/types';
import { Layers, Loader2, Sparkles, Monitor, Tablet, Smartphone, ShieldCheck } from 'lucide-react';

interface RunProgressModalProps {
  isOpen: boolean;
  project: Project;
  progressStep: string;
}

export function RunProgressModal({ isOpen, project, progressStep }: RunProgressModalProps) {
  if (!isOpen) return null;

  const totalChecks = project.pages.length * project.breakpoints.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-center space-y-6">
        {/* Glowing Animation */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-slate-950 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Running Visual Checks
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Capturing responsive viewports and computing pixel differences against baseline.
          </p>
        </div>

        {/* Status ticker */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
            <span>Project: {project.name}</span>
            <span>{totalChecks} combinations</span>
          </div>
          <div className="text-xs font-mono text-indigo-300 flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 animate-pulse" />
            <span className="truncate">{progressStep || 'Initializing capture engine...'}</span>
          </div>
        </div>

        {/* Device viewports list being checked */}
        <div className="grid grid-cols-3 gap-2">
          {project.breakpoints.map((bp) => {
            let Icon = Monitor;
            if (bp.icon === 'tablet' || (bp.width >= 600 && bp.width < 1024)) Icon = Tablet;
            if (bp.icon === 'smartphone' || bp.width < 600) Icon = Smartphone;

            return (
              <div
                key={bp.id}
                className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-2 text-center"
              >
                <Icon className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                <div className="text-[10px] font-semibold text-slate-300 truncate">{bp.name}</div>
                <div className="text-[9px] font-mono text-slate-500">{bp.width}px</div>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Serverless Chromium & Pixelmatch Diff Engine Active</span>
        </div>
      </div>
    </div>
  );
}
