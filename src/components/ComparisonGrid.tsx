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
  ArrowRight,
  Star,
  Box,
  Component,
} from 'lucide-react';

interface ComparisonGridProps {
  run: Run;
  pages: ProjectPage[];
  breakpoints: Breakpoint[];
  isBaseline: boolean;
  onSetAsBaseline: (runId: string) => Promise<void>;
  onSelectComparison: (pageId: string, breakpointId: string, comparisonId?: string) => void;
}

export function ComparisonGrid({
  run,
  pages,
  breakpoints,
  isBaseline,
  onSetAsBaseline,
  onSelectComparison,
}: ComparisonGridProps) {
  const [filter, setFilter] = useState<'all' | 'changed' | 'identical' | 'new'>('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'pages' | 'components'>('all');
  const [selectedBreakpointFilter, setSelectedBreakpointFilter] = useState<string>('all');
  const [isPromoting, setIsPromoting] = useState(false);

  const hasComponents = run.comparisons.some((c) => c.isComponent);
  const componentCount = run.comparisons.filter((c) => c.isComponent).length;
  const pageCount = run.comparisons.filter((c) => !c.isComponent).length;

  const handlePromote = async () => {
    setIsPromoting(true);
    try {
      await onSetAsBaseline(run.id);
    } finally {
      setIsPromoting(false);
    }
  };

  const filteredComparisons = run.comparisons.filter((c) => {
    if (scopeFilter === 'pages' && c.isComponent) return false;
    if (scopeFilter === 'components' && !c.isComponent) return false;
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
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Overview Matrix ({filteredComparisons.length} Viewports)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Compare every inner page across Desktop, Tablet, and Mobile.
            </p>
          </div>

          {/* Baseline Promotion Button */}
          {isBaseline ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>Active Baseline</span>
            </span>
          ) : (
            <button
              type="button"
              disabled={isPromoting}
              onClick={handlePromote}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 hover:border-amber-400 text-amber-200 hover:text-amber-100 font-semibold text-xs shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
              title="Set this check run as the new baseline for all future visual regression comparisons"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 animate-pulse text-amber-400" />
              <span>{isPromoting ? 'Setting as Baseline...' : 'Promote Run to Baseline'}</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope filter (All vs Pages vs Components) */}
          {hasComponents && (
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setScopeFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  scopeFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Checks ({run.comparisons.length})
              </button>
              <button
                onClick={() => setScopeFilter('pages')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  scopeFilter === 'pages'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pages ({pageCount})
              </button>
              <button
                onClick={() => setScopeFilter('components')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  scopeFilter === 'components'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-400 hover:text-purple-200'
                }`}
              >
                <Component className="w-3 h-3" />
                <span>Components ({componentCount})</span>
              </button>
            </div>
          )}

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

          const isIdentical = isBaseline || c.status === 'identical';
          const isChanged = !isBaseline && c.status === 'changed';
          const isNew = !isBaseline && c.status === 'new';
          const isComp = Boolean(c.isComponent);

          return (
            <div
              key={c.id}
              onClick={() => onSelectComparison(c.pageId, c.breakpointId, c.id)}
              className={`group cursor-pointer rounded-2xl bg-slate-900/60 border ${
                isComp
                  ? 'border-purple-500/30 hover:border-purple-400/80 hover:shadow-purple-500/10'
                  : 'border-slate-800/80 hover:border-indigo-500/50 hover:shadow-indigo-500/10'
              } hover:shadow-xl transition-all overflow-hidden flex flex-col`}
            >
              {/* Card Header */}
              <div className="p-3.5 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                      isComp
                        ? 'bg-purple-950/50 border-purple-800 text-purple-300'
                        : 'bg-slate-900 border-slate-800 text-indigo-400'
                    }`}
                  >
                    {isComp ? <Component className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs font-bold transition-colors truncate ${
                          isComp
                            ? 'text-purple-200 group-hover:text-purple-100'
                            : 'text-white group-hover:text-indigo-300'
                        }`}
                      >
                        {isComp ? c.componentName : c.pageName}
                      </span>
                      {isComp && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          :{c.componentState || 'default'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate max-w-[170px]">
                      {isComp ? `${c.pageName} · ` : ''}{c.pagePath} · {c.width}×{c.height}px
                    </div>
                  </div>
                </div>

                {/* Diff status badge */}
                <div className="shrink-0 ml-2">
                  {isBaseline ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>Baseline</span>
                    </span>
                  ) : isIdentical ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>0.00%</span>
                    </span>
                  ) : isChanged ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{c.diffPercentage}% Diff</span>
                    </span>
                  ) : isNew ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      <span>New Base</span>
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Card Image Thumbnail Preview */}
              <div
                className={`relative h-48 overflow-hidden flex items-center justify-center ${
                  isComp ? 'bg-slate-950 p-3' : 'bg-black'
                }`}
              >
                <img
                  src={isBaseline ? c.currentImage : (c.diffImage || c.currentImage)}
                  alt={isComp ? (c.componentName || 'Component') : c.pageName}
                  className={
                    isComp
                      ? 'max-h-full max-w-full object-contain drop-shadow-md rounded transition-transform group-hover:scale-105 duration-300'
                      : 'w-full object-cover object-top transition-transform duration-1000 ease-in-out group-hover:translate-y-[-25%]'
                  }
                />

                {/* Hover overlay hint */}
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-opacity flex items-center justify-center gap-2 text-xs font-semibold text-white ${
                    isComp ? 'bg-purple-950/70' : 'bg-indigo-950/60'
                  }`}
                >
                  <span>{isComp ? `Inspect Component (${c.componentState || 'default'})` : 'Inspect Full-Page Diff'}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isComp ? 'text-purple-400' : 'text-indigo-400'}`} />
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-3 bg-slate-950/60 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Icon className="w-3 h-3 text-slate-500" />
                  <span>{c.breakpointName}</span>
                </span>
                {isChanged ? (
                  <span className="text-rose-400 font-medium">
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
