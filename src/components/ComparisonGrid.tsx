'use client';

import React, { useState } from 'react';
import { Run, ComparisonItem, Breakpoint, ProjectPage } from '@/types';
import {
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ComparisonGridProps {
  run: Run;
  pages: ProjectPage[];
  breakpoints: Breakpoint[];
  onSelectComparison: (pageId: string, breakpointId: string) => void;
}

export function ComparisonGrid({
  run,
  pages,
  breakpoints,
  onSelectComparison,
}: ComparisonGridProps) {
  const [filter, setFilter] = useState<'all' | 'changed' | 'identical' | 'new'>('all');
  const [selectedBreakpointFilter, setSelectedBreakpointFilter] = useState<string>('all');

  const filteredComparisons = run.comparisons.filter((c) => {
    if (filter === 'changed' && c.status !== 'changed') return false;
    if (filter === 'identical' && c.status !== 'identical') return false;
    if (filter === 'new' && c.status !== 'new') return false;
    if (selectedBreakpointFilter !== 'all' && c.breakpointId !== selectedBreakpointFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Overview Matrix ({filteredComparisons.length} Viewports)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Compare every inner page across Desktop, Tablet, and Mobile.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({run.comparisons.length})
            </button>
            <button
              onClick={() => setFilter('changed')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                filter === 'changed'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <span>Changed</span>
              {run.changedChecks > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {run.changedChecks}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('identical')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filter === 'identical'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Matched ({run.passedChecks})
            </button>
          </div>

          {/* Breakpoint Filter */}
          <select
            value={selectedBreakpointFilter}
            onChange={(e) => setSelectedBreakpointFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Breakpoints</option>
            {breakpoints.map((bp) => (
              <option key={bp.id} value={bp.id}>
                {bp.name} ({bp.width}px)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredComparisons.map((c) => {
          let Icon = Monitor;
          if (c.breakpointId === 'tablet' || (c.width >= 600 && c.width < 1024)) Icon = Tablet;
          if (c.breakpointId === 'mobile' || c.width < 600) Icon = Smartphone;

          const isIdentical = c.status === 'identical';
          const isChanged = c.status === 'changed';
          const isNew = c.status === 'new';

          return (
            <div
              key={c.id}
              onClick={() => onSelectComparison(c.pageId, c.breakpointId)}
              className="group cursor-pointer rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="p-3.5 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {c.pageName}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">
                      {c.pagePath} · {c.width}×{c.height}px
                    </div>
                  </div>
                </div>

                {/* Diff status badge */}
                <div>
                  {isIdentical && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>0.00%</span>
                    </span>
                  )}
                  {isChanged && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{c.diffPercentage}% Diff</span>
                    </span>
                  )}
                  {isNew && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      <span>New Base</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Card Image Thumbnail Preview with scroll preview on hover */}
              <div className="relative bg-black h-48 overflow-hidden flex items-center justify-center">
                <img
                  src={c.diffImage || c.currentImage}
                  alt={c.pageName}
                  className="w-full object-cover object-top transition-transform duration-1000 ease-in-out group-hover:translate-y-[-25%]"
                />

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-opacity flex items-center justify-center gap-2 text-xs font-semibold text-white">
                  <span>Inspect Full-Page Diff</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-3 bg-slate-950/60 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{c.breakpointName}</span>
                {isChanged ? (
                  <span className="text-rose-400">
                    {c.diffPixelCount.toLocaleString()} px changed
                  </span>
                ) : (
                  <span className="text-emerald-400">Match confirmed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
