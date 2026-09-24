'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Run, ComparisonItem, Breakpoint, ProjectPage } from '@/types';
import {
  Columns,
  Split,
  Eye,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  ExternalLink,
  Star,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  ArrowUp,
  ArrowDown,
  Navigation
} from 'lucide-react';

interface ComparisonViewerProps {
  run: Run;
  pages: ProjectPage[];
  breakpoints: Breakpoint[];
  isBaseline: boolean;
  onSetAsBaseline: (runId: string) => Promise<void>;
}

type ViewMode = 'slider' | 'side-by-side' | 'diff' | 'onion-skin';

export function ComparisonViewer({
  run,
  pages,
  breakpoints,
  isBaseline,
  onSetAsBaseline,
}: ComparisonViewerProps) {
  // Navigation state
  const [selectedPageId, setSelectedPageId] = useState<string>(
    pages[0]?.id || run.comparisons[0]?.pageId || ''
  );
  const [selectedBreakpointId, setSelectedBreakpointId] = useState<string>(
    breakpoints[0]?.id || run.comparisons[0]?.breakpointId || ''
  );

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('slider');
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100%
  const [onionOpacity, setOnionOpacity] = useState<number>(50); // 0 to 100%
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isPromotingBaseline, setIsPromotingBaseline] = useState(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollStageRef = useRef<HTMLDivElement>(null);
  const leftSidePaneRef = useRef<HTMLDivElement>(null);
  const rightSidePaneRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef<boolean>(false);
  const isSyncingScroll = useRef<boolean>(false);

  // Ensure selection remains valid if pages or breakpoints change
  useEffect(() => {
    if (pages.length > 0 && !pages.some((p) => p.id === selectedPageId)) {
      setSelectedPageId(pages[0].id);
    }
    if (breakpoints.length > 0 && !breakpoints.some((b) => b.id === selectedBreakpointId)) {
      setSelectedBreakpointId(breakpoints[0].id);
    }
  }, [pages, breakpoints, selectedPageId, selectedBreakpointId]);

  // Find active comparison item
  const currentComparison = run.comparisons.find(
    (c) =>
      (c.pageId === selectedPageId || (!selectedPageId && c.pagePath === pages[0]?.path)) &&
      (c.breakpointId === selectedBreakpointId || (!selectedBreakpointId && c.width === breakpoints[0]?.width))
  ) || run.comparisons[0];

  // Dragging logic for the 2-Up split slider
  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingSlider.current = true;
    handleSliderMove(e.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSlider.current) return;
      handleSliderMove(e.clientX);
    };

    const handleMouseUp = () => {
      isDraggingSlider.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleSliderMove]);

  // Touch support for mobile / tablet drag
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  // Scroll tracking on main stage
  const handleScrollStage = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const maxScroll = target.scrollHeight - target.clientHeight;
    if (maxScroll > 0) {
      const progress = Math.round((target.scrollTop / maxScroll) * 100);
      setScrollProgress(progress);
    }
  };

  // Quick jump helper
  const scrollToPercent = (percent: number) => {
    if (!scrollStageRef.current) return;
    const maxScroll = scrollStageRef.current.scrollHeight - scrollStageRef.current.clientHeight;
    scrollStageRef.current.scrollTo({
      top: (maxScroll * percent) / 100,
      behavior: 'smooth',
    });
  };

  // Synchronized scroll handlers for side-by-side dual panes
  const handleSyncScroll = (source: 'left' | 'right') => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;

    const sourceEl = source === 'left' ? leftSidePaneRef.current : rightSidePaneRef.current;
    const targetEl = source === 'left' ? rightSidePaneRef.current : leftSidePaneRef.current;

    if (sourceEl && targetEl) {
      targetEl.scrollTop = sourceEl.scrollTop;
    }

    setTimeout(() => {
      isSyncingScroll.current = false;
    }, 50);
  };

  const handleDownloadDiff = () => {
    if (!currentComparison) return;
    const imageToDownload = currentComparison.diffImage || currentComparison.currentImage;
    if (!imageToDownload) return;

    const link = document.createElement('a');
    link.href = imageToDownload;
    link.download = `visual-diff-${currentComparison.pageName}-${currentComparison.breakpointName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePromoteBaseline = async () => {
    try {
      setIsPromotingBaseline(true);
      await onSetAsBaseline(run.id);
    } finally {
      setIsPromotingBaseline(false);
    }
  };

  if (!currentComparison) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-white">No visual check data available</h3>
        <p className="text-xs text-slate-400 mt-1">Run a visual check to capture screenshots and compare pages.</p>
      </div>
    );
  }

  // When this run is the active baseline, its baseline visual reference is its own screenshot (100% baseline reference)
  const baselineImageSrc = isBaseline
    ? currentComparison.currentImage
    : (currentComparison.baselineImage || currentComparison.currentImage);
  const hasBaseline = Boolean(baselineImageSrc);
  const isIdentical = isBaseline || currentComparison.status === 'identical';
  const isChanged = !isBaseline && currentComparison.status === 'changed';
  const isNew = !isBaseline && currentComparison.status === 'new';
  const diffPercentage = isBaseline ? 0 : currentComparison.diffPercentage;
  const diffPixelCount = isBaseline ? 0 : currentComparison.diffPixelCount;
  const diffImageSrc = isBaseline ? undefined : currentComparison.diffImage;

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border border-slate-800">
        {/* Left: Page Selector & Breakpoint Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Page Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
              Page:
            </span>
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-medium text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.path})
                </option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* Breakpoint Viewport Pills */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {breakpoints.map((bp) => {
              let Icon = Monitor;
              if (bp.icon === 'tablet' || (bp.width >= 600 && bp.width < 1024)) Icon = Tablet;
              if (bp.icon === 'smartphone' || bp.width < 600) Icon = Smartphone;

              const isSelected = selectedBreakpointId === bp.id;

              const item = run.comparisons.find(
                (c) => c.pageId === selectedPageId && c.breakpointId === bp.id
              );

              return (
                <button
                  key={bp.id}
                  onClick={() => setSelectedBreakpointId(bp.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{bp.name}</span>
                  <span className="text-[10px] opacity-70">({bp.width}px)</span>

                  {item && (
                    <span
                      className={`w-2 h-2 rounded-full ml-0.5 ${
                        item.status === 'identical'
                          ? 'bg-emerald-400'
                          : item.status === 'changed'
                          ? 'bg-rose-400 animate-pulse'
                          : 'bg-indigo-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: View Mode Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Modes */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('slider')}
              title="Split Screen Swipe Slider"
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-all ${
                viewMode === 'slider'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Slider</span>
            </button>

            <button
              onClick={() => setViewMode('side-by-side')}
              title="Side by Side Comparison"
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-all ${
                viewMode === 'side-by-side'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">2-Up</span>
            </button>

            <button
              onClick={() => setViewMode('diff')}
              title="Difference Heatmap"
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-all ${
                viewMode === 'diff'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Diff Map</span>
            </button>

            <button
              onClick={() => setViewMode('onion-skin')}
              title="Onion Skin Opacity Blend"
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-all ${
                viewMode === 'onion-skin'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Onion</span>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-900/90 rounded-xl border border-slate-800 px-1 py-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.2).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1.5">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2, Number((z + 0.2).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Download diff button */}
          <button
            onClick={handleDownloadDiff}
            title="Download PNG"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Promote to Baseline Button */}
          {isBaseline ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Active Baseline</span>
            </div>
          ) : (
            <button
              onClick={handlePromoteBaseline}
              disabled={isPromotingBaseline}
              title="Promote all screenshots in this check run as the new baseline reference"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-200 hover:text-amber-100 border border-amber-500/40 hover:border-amber-400 shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
              <span>{isPromotingBaseline ? 'Promoting...' : 'Promote Run to Baseline'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Difference Summary Indicator Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Badge */}
          {isBaseline ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>Active Baseline Reference (0.00% Diff · Golden Source of Truth)</span>
            </div>
          ) : isIdentical ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>100% Identical (0.00% Diff)</span>
            </div>
          ) : isChanged ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                <AlertTriangle className="w-4 h-4 animate-bounce" />
                <span>
                  Visual Diff Detected: {diffPercentage}% mismatch (
                  {diffPixelCount.toLocaleString()} pixels)
                </span>
              </div>

              <button
                type="button"
                onClick={handlePromoteBaseline}
                disabled={isPromotingBaseline}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-[11px] transition-colors cursor-pointer"
                title="If these changes are intended, promote this check run to baseline"
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>Accept Changes & Set Baseline</span>
              </button>
            </div>
          ) : isNew ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Initial Capture (No Prior Baseline to Compare)</span>
              </div>

              <button
                type="button"
                onClick={handlePromoteBaseline}
                disabled={isPromotingBaseline}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-[11px] transition-colors cursor-pointer"
                title="Set this initial capture as the project baseline"
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>Set as Baseline</span>
              </button>
            </div>
          ) : null}

          <div className="text-slate-400 hidden sm:flex items-center gap-2">
            <span>Viewport:</span>
            <span className="font-mono text-slate-300">
              {currentComparison.width}px · Full Scrollable Page
            </span>
          </div>
        </div>

        {/* Scroll Jump Pill & Live URL Link */}
        <div className="flex items-center gap-2">
          {/* Quick Scroll Position Jumps */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
            <button
              onClick={() => scrollToPercent(0)}
              className="px-2 py-0.5 hover:text-white text-slate-400 hover:bg-slate-800 rounded"
              title="Jump to Top"
            >
              Top
            </button>
            <button
              onClick={() => scrollToPercent(50)}
              className="px-2 py-0.5 hover:text-white text-slate-400 hover:bg-slate-800 rounded"
              title="Jump to Middle"
            >
              50%
            </button>
            <button
              onClick={() => scrollToPercent(100)}
              className="px-2 py-0.5 hover:text-white text-slate-400 hover:bg-slate-800 rounded"
              title="Jump to Bottom (Footer)"
            >
              Bottom
            </button>
          </div>

          <a
            href={currentComparison.fullUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <span className="font-mono text-[11px] truncate max-w-[180px]">
              {currentComparison.fullUrl}
            </span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Floating Slider Bar Controller (Allows scrolling and sliding simultaneously!) */}
      {viewMode === 'slider' && hasBaseline && (
        <div className="glass-panel p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold whitespace-nowrap">
            <span>◀ Baseline ({100 - Math.round(sliderPosition)}%)</span>
          </div>

          <div className="flex-1 flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 text-indigo-400 font-semibold whitespace-nowrap">
            <span>Current ({Math.round(sliderPosition)}%) ▶</span>
          </div>

          <div className="text-[11px] text-slate-500 font-mono hidden md:inline">
            Scroll page or drag divider
          </div>
        </div>
      )}

      {/* Onion skin slider bar if in onion skin mode */}
      {viewMode === 'onion-skin' && (
        <div className="glass-panel p-3 rounded-xl border border-slate-800 flex items-center gap-4">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Baseline (0%)</span>
          <input
            type="range"
            min="0"
            max="100"
            value={onionOpacity}
            onChange={(e) => setOnionOpacity(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <span className="text-xs text-indigo-400 font-mono font-semibold whitespace-nowrap">
            Current ({onionOpacity}%)
          </span>
        </div>
      )}

      {/* Main Visual Stage with Full Page Scroll */}
      <div
        ref={scrollStageRef}
        onScroll={handleScrollStage}
        className="relative rounded-2xl bg-slate-950 border border-slate-800/80 p-4 overflow-y-auto max-h-[82vh] flex justify-center items-start bg-grid-pattern shadow-inner"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div
          style={{
            width: `${Math.min(currentComparison.width * zoomLevel, 1400)}px`,
            maxWidth: '100%',
            transition: 'width 0.15s ease-out',
          }}
          className="relative"
        >
          {/* MODE 1: SPLIT SLIDER (2-UP SWIPE WITH FULL SCROLLING) */}
          {viewMode === 'slider' && (
            <div
              ref={containerRef}
              className="relative select-none rounded-xl border border-slate-700/80 shadow-2xl overflow-hidden block m-0 p-0"
              style={{ touchAction: 'pan-y' }}
            >
              {/* Floating Top Labels (absolute so they introduce zero layout shift/offset) */}
              <div className="absolute top-3 left-3 right-3 z-30 flex justify-between pointer-events-none">
                <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-md text-[11px] font-mono text-emerald-400 font-bold shadow-lg">
                  ◀ BASELINE {isBaseline ? '(GOLDEN REFERENCE)' : '(ORIGINAL)'}
                </div>
                {hasBaseline && (
                  <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-md text-[11px] font-mono text-indigo-400 font-bold shadow-lg">
                    {isBaseline ? 'CURRENT (MATCHES BASELINE) ▶' : 'CURRENT CHECK ▶'}
                  </div>
                )}
              </div>

              {/* Baseline Image (Full scrollable height - establishes container dimensions) */}
              <div className="w-full relative m-0 p-0 block leading-none">
                <img
                  src={baselineImageSrc}
                  alt="Baseline Reference"
                  className="w-full h-auto block pointer-events-none select-none"
                  style={{
                    display: 'block',
                    width: '100%',
                    height: 'auto',
                    margin: 0,
                    padding: 0,
                    verticalAlign: 'top',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                  }}
                />
              </div>

              {/* Current Image (Clipped on top according to slider position, exact 1:1 pixel match) */}
              {hasBaseline && (
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none m-0 p-0 leading-none"
                  style={{
                    clipPath: `inset(0 0 0 ${sliderPosition}%)`,
                  }}
                >
                  <img
                    src={currentComparison.currentImage}
                    alt="Current Run"
                    className="w-full h-auto block select-none pointer-events-none"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 'auto',
                      margin: 0,
                      padding: 0,
                      verticalAlign: 'top',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden',
                    }}
                  />
                </div>
              )}

              {/* Divider Line & Sticky Floating Handle */}
              {hasBaseline && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] pointer-events-none z-20"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div
                    onMouseDown={handleMouseDown}
                    onTouchMove={handleTouchMove}
                    className="sticky top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-2xl border-2 border-indigo-600 flex items-center justify-center text-indigo-700 pointer-events-auto cursor-ew-resize hover:scale-110 transition-transform active:scale-95"
                  >
                    <Split className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: SIDE BY SIDE (WITH SYNCHRONIZED SCROLLING PANES) */}
          {viewMode === 'side-by-side' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {/* Left Pane: Baseline */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow-xl flex flex-col">
                <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-emerald-400" />
                    <span>{isBaseline ? 'Baseline Reference (Golden)' : 'Baseline (Original)'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {isBaseline ? 'Active Baseline' : (hasBaseline ? 'Saved Reference' : 'None')}
                  </span>
                </div>
                <div
                  ref={leftSidePaneRef}
                  onScroll={() => handleSyncScroll('left')}
                  className="overflow-y-auto max-h-[70vh] rounded-lg bg-slate-950 border border-slate-800/80"
                >
                  <img
                    src={baselineImageSrc}
                    alt="Baseline"
                    className="w-full h-auto block"
                  />
                </div>
              </div>

              {/* Right Pane: Current */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 shadow-xl flex flex-col">
                <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold text-indigo-400">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isBaseline ? 'Current Image (Baseline)' : 'Current Check'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {isBaseline ? 'Matches Baseline' : 'Latest Run'}
                  </span>
                </div>
                <div
                  ref={rightSidePaneRef}
                  onScroll={() => handleSyncScroll('right')}
                  className="overflow-y-auto max-h-[70vh] rounded-lg bg-slate-950 border border-slate-800/80"
                >
                  <img
                    src={currentComparison.currentImage}
                    alt="Current"
                    className="w-full h-auto block"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: DIFF HEATMAP (FULL SCROLLABLE HEIGHT) */}
          {viewMode === 'diff' && (
            <div className="relative rounded-xl border border-rose-900/40 bg-slate-900/80 p-3 shadow-2xl block w-full">
              <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold">
                <div className="flex items-center gap-2 text-rose-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Pixel Difference Heatmap (Full Page)</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Red pixels = Detected visual changes
                </span>
              </div>

              <div className="relative overflow-hidden rounded-lg bg-black border border-slate-800 block">
                {diffImageSrc ? (
                  <img
                    src={diffImageSrc}
                    alt="Visual Diff Heatmap"
                    className="w-full h-auto block"
                  />
                ) : (
                  <div className="p-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-white">
                      {isBaseline
                        ? 'Golden Baseline Reference (0.00% Diff)'
                        : 'No visual difference detected.'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {isBaseline
                        ? 'All screenshots in this run are approved and established as the reference.'
                        : 'Current capture is pixel-identical to the baseline.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODE 4: ONION SKIN (FULL SCROLLABLE HEIGHT) */}
          {viewMode === 'onion-skin' && (
            <div className="relative select-none rounded-xl border border-slate-700/80 shadow-2xl block w-full">
              {/* Baseline bottom */}
              <img
                src={baselineImageSrc}
                alt="Baseline"
                className="w-full h-auto block"
              />
              {/* Current overlay */}
              {hasBaseline && (
                <div
                  className="absolute inset-0"
                  style={{ opacity: onionOpacity / 100 }}
                >
                  <img
                    src={currentComparison.currentImage}
                    alt="Current overlay"
                    className="w-full h-auto block"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
