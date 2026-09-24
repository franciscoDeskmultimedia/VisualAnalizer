'use client';

import React, { useState } from 'react';
import { Project, Breakpoint, ProjectPage, ProjectSettings, DEFAULT_BREAKPOINTS } from '@/types';
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  Trash2,
  Save,
  Clock,
  Layers,
  Sliders,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

interface ProjectSettingsModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProject: Project) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}

export function ProjectSettingsModal({
  project,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: ProjectSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'pages' | 'breakpoints' | 'settings'>('pages');

  // Local form state
  const [name, setName] = useState(project.name);
  const [baseUrl, setBaseUrl] = useState(project.baseUrl);
  const [pages, setPages] = useState<ProjectPage[]>(project.pages || []);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>(project.breakpoints || []);
  const [settings, setSettings] = useState<ProjectSettings>(project.settings);

  // New page form state
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');

  // New breakpoint form state
  const [newBpName, setNewBpName] = useState('');
  const [newBpWidth, setNewBpWidth] = useState(1280);
  const [newBpHeight, setNewBpHeight] = useState(800);
  const [newBpIcon, setNewBpIcon] = useState<'desktop' | 'tablet' | 'smartphone'>('desktop');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset state when project changes
  React.useEffect(() => {
    setName(project.name);
    setBaseUrl(project.baseUrl);
    setPages(project.pages || []);
    setBreakpoints(project.breakpoints || []);
    setSettings(project.settings);
  }, [project]);

  if (!isOpen) return null;

  // Handlers for Pages
  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim() || !newPagePath.trim()) return;

    let cleanPath = newPagePath.trim();
    if (!cleanPath.startsWith('/')) {
      cleanPath = `/${cleanPath}`;
    }

    const newPage: ProjectPage = {
      id: `page_${Date.now()}`,
      name: newPageName.trim(),
      path: cleanPath,
    };

    setPages([...pages, newPage]);
    setNewPageName('');
    setNewPagePath('');
  };

  const handleRemovePage = (pageId: string) => {
    if (pages.length <= 1) {
      alert('You must have at least one page in the project.');
      return;
    }
    setPages(pages.filter((p) => p.id !== pageId));
  };

  // Handlers for Breakpoints
  const handleAddBreakpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBpName.trim() || newBpWidth <= 0 || newBpHeight <= 0) return;

    const newBp: Breakpoint = {
      id: `bp_${Date.now()}`,
      name: newBpName.trim(),
      width: Number(newBpWidth),
      height: Number(newBpHeight),
      icon: newBpIcon,
    };

    setBreakpoints([...breakpoints, newBp]);
    setNewBpName('');
  };

  const handleRemoveBreakpoint = (bpId: string) => {
    if (breakpoints.length <= 1) {
      alert('You must have at least one breakpoint configured.');
      return;
    }
    setBreakpoints(breakpoints.filter((b) => b.id !== bpId));
  };

  const handleApplyPreset = (name: string, width: number, height: number, icon: 'desktop' | 'tablet' | 'smartphone') => {
    const exists = breakpoints.some((b) => b.width === width && b.height === height);
    if (exists) return;
    const newBp: Breakpoint = {
      id: `bp_${Date.now()}_${width}`,
      name,
      width,
      height,
      icon,
    };
    setBreakpoints([...breakpoints, newBp]);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      let formattedUrl = baseUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }
      formattedUrl = formattedUrl.replace(/\/+$/, '');

      const updated: Project = {
        ...project,
        name: name.trim() || project.name,
        baseUrl: formattedUrl,
        pages,
        breakpoints,
        settings,
        updatedAt: new Date().toISOString(),
      };

      await onSave(updated);
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>Project Configuration & Breakpoints</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure inner routes, responsive viewport breakpoints, and diff tolerance.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
          <button
            onClick={() => setActiveTab('pages')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'pages'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Inner Pages ({pages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('breakpoints')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'breakpoints'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Breakpoints ({breakpoints.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'general'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Project Details</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Diff & Capture</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {saveError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* TAB 1: INNER PAGES */}
          {activeTab === 'pages' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Target Pages to Check</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  VisualAnalizar captures screenshots of each listed inner page at all configured breakpoints.
                </p>
              </div>

              {/* Add Page Form */}
              <form onSubmit={handleAddPage} className="flex gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <input
                  type="text"
                  placeholder="Page Label (e.g. Pricing)"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 text-xs text-slate-400">
                  <span className="font-mono text-slate-500">{baseUrl}</span>
                  <input
                    type="text"
                    placeholder="/pricing"
                    value={newPagePath}
                    onChange={(e) => setNewPagePath(e.target.value)}
                    className="flex-1 bg-transparent py-1.5 px-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newPageName.trim() || !newPagePath.trim()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Page</span>
                </button>
              </form>

              {/* List of Pages */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {pages.map((p, idx) => {
                  const fullUrl = `${baseUrl}${p.path.startsWith('/') ? p.path : `/${p.path}`}`;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center text-[10px] font-mono font-bold text-slate-400 border border-slate-800">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-white">{p.name}</div>
                          <div className="text-[11px] font-mono text-indigo-400">{p.path}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 text-xs transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleRemovePage(p.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-colors"
                          title="Remove Page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BREAKPOINTS */}
          {activeTab === 'breakpoints' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Device Viewport Breakpoints</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define Desktop, Tablet, and Mobile screen resolutions or add custom breakpoints.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Presets</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Desktop (1440p)', 1440, 900, 'desktop')}
                    className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    + Desktop 1440×900
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Full HD (1080p)', 1920, 1080, 'desktop')}
                    className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    + FHD 1920×1080
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('iPad Pro (1024)', 1024, 1366, 'tablet')}
                    className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    + iPad Pro 1024×1366
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('iPad / Tablet (768)', 768, 1024, 'tablet')}
                    className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    + Tablet 768×1024
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('iPhone 15 Pro (393)', 393, 852, 'smartphone')}
                    className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    + iPhone 15 Pro 393×852
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('Mobile (375)', 375, 812, 'smartphone')}
                    className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    + Mobile 375×812
                  </button>
                </div>
              </div>

              {/* Add Custom Breakpoint Form */}
              <form onSubmit={handleAddBreakpoint} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <input
                  type="text"
                  placeholder="Breakpoint Label"
                  value={newBpName}
                  onChange={(e) => setNewBpName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 text-xs text-slate-400">
                  <span className="text-[10px] text-slate-500 uppercase">W:</span>
                  <input
                    type="number"
                    value={newBpWidth}
                    onChange={(e) => setNewBpWidth(Number(e.target.value))}
                    className="w-full bg-transparent py-1.5 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">px</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 text-xs text-slate-400">
                  <span className="text-[10px] text-slate-500 uppercase">H:</span>
                  <input
                    type="number"
                    value={newBpHeight}
                    onChange={(e) => setNewBpHeight(Number(e.target.value))}
                    className="w-full bg-transparent py-1.5 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">px</span>
                </div>
                <button
                  type="submit"
                  disabled={!newBpName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Breakpoint</span>
                </button>
              </form>

              {/* Breakpoints List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {breakpoints.map((bp) => {
                  let IconComponent = Monitor;
                  if (bp.icon === 'tablet' || (bp.width >= 600 && bp.width < 1024)) {
                    IconComponent = Tablet;
                  } else if (bp.icon === 'smartphone' || bp.width < 600) {
                    IconComponent = Smartphone;
                  }

                  return (
                    <div
                      key={bp.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">{bp.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {bp.width} × {bp.height} px
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveBreakpoint(bp.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-colors"
                          title="Remove Breakpoint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Acme Corp Web"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Base URL
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                  placeholder="https://example.com"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  All inner pages will be resolved relative to this domain.
                </p>
              </div>

              <div className="pt-6 border-t border-slate-800/80">
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-rose-300">Danger Zone</h4>
                    <p className="text-[11px] text-rose-400/80">
                      Permanently delete this project and all recorded visual runs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete project "${project.name}"?`)) {
                        onDelete(project.id);
                        onClose();
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Capture & Diff Sensitivity</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fine-tune page render wait times and visual diff detection parameters.
                </p>
              </div>

              {/* Wait Time */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-200">Render Wait Time</label>
                  <span className="text-xs font-mono text-indigo-400 font-semibold">{settings.waitTimeMs} ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6000"
                  step="250"
                  value={settings.waitTimeMs}
                  onChange={(e) => setSettings({ ...settings, waitTimeMs: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Delay before taking screenshot to allow animations, fonts, and client-side hydration to settle.
                </p>
              </div>

              {/* Diff Sensitivity Threshold */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-200">Diff Matching Sensitivity (Threshold)</label>
                  <span className="text-xs font-mono text-indigo-400 font-semibold">{settings.diffThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.4"
                  step="0.01"
                  value={settings.diffThreshold}
                  onChange={(e) => setSettings({ ...settings, diffThreshold: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0.01 (Strict - Detects any subtle pixel variance)</span>
                  <span>0.4 (Tolerant - Ignores minor sub-pixel antialiasing)</span>
                </div>
              </div>

              {/* Full Page Capture */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-200">Full Height Page Capture</div>
                  <div className="text-[11px] text-slate-500">
                    Captures the full scrollable document height instead of just above the fold viewport.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.fullPage}
                    onChange={(e) => setSettings({ ...settings, fullPage: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
