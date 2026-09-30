'use client';

import React, { useState } from 'react';
import { Project, Breakpoint, ProjectPage, ProjectSettings, PageComponent, ComponentState, DEFAULT_BREAKPOINTS } from '@/types';
import { ElementPickerModal } from './ElementPickerModal';
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
  AlertCircle,
  HardDrive,
  Cloud,
  Database,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Crosshair,
  ChevronDown,
  ChevronUp
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
  const [activeTab, setActiveTab] = useState<'general' | 'pages' | 'breakpoints' | 'settings' | 'storage'>('pages');

  // Local form state
  const [name, setName] = useState(project.name);
  const [baseUrl, setBaseUrl] = useState(project.baseUrl);
  const [pages, setPages] = useState<ProjectPage[]>(project.pages || []);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>(project.breakpoints || []);
  const [settings, setSettings] = useState<ProjectSettings>(project.settings);

  // Component-based testing states
  const [expandedPageId, setExpandedPageId] = useState<string | null>(null);
  const [pickerPage, setPickerPage] = useState<{ id: string; name: string; path: string; fullUrl: string } | null>(null);
  const [manualCompPageId, setManualCompPageId] = useState<string | null>(null);
  const [manualCompName, setManualCompName] = useState('');
  const [manualCompSelector, setManualCompSelector] = useState('');
  const [manualCompStates, setManualCompStates] = useState<ComponentState[]>(['default', 'hover']);

  // Storage testing state
  const [isTestingS3, setIsTestingS3] = useState(false);
  const [s3TestStatus, setS3TestStatus] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);

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

  // Handlers for Page Components
  const handleAddComponentToPage = (pageId: string, comp: PageComponent) => {
    setPages(
      pages.map((p) => {
        if (p.id !== pageId) return p;
        const currentComponents = p.components || [];
        return {
          ...p,
          components: [...currentComponents, comp],
        };
      })
    );
  };

  const handleRemoveComponentFromPage = (pageId: string, componentId: string) => {
    setPages(
      pages.map((p) => {
        if (p.id !== pageId) return p;
        return {
          ...p,
          components: (p.components || []).filter((c) => c.id !== componentId),
        };
      })
    );
  };

  const handleAddManualComponent = (pageId: string) => {
    if (!manualCompName.trim() || !manualCompSelector.trim()) return;

    const newComp: PageComponent = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: manualCompName.trim(),
      selector: manualCompSelector.trim(),
      states: manualCompStates,
    };

    handleAddComponentToPage(pageId, newComp);
    setManualCompName('');
    setManualCompSelector('');
    setManualCompStates(['default', 'hover']);
    setManualCompPageId(null);
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

  const handleTestS3 = async () => {
    if (!settings.s3Config?.bucket || !settings.s3Config?.accessKeyId || !settings.s3Config?.secretAccessKey) {
      setS3TestStatus({
        success: false,
        error: 'Please enter a Bucket Name, Access Key ID, and Secret Access Key before testing.',
      });
      return;
    }

    setIsTestingS3(true);
    setS3TestStatus(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/storage/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Config: settings.s3Config }),
      });
      const data = await res.json();
      if (data.success) {
        setS3TestStatus({ success: true, message: data.message });
      } else {
        setS3TestStatus({ success: false, error: data.error || 'Connection failed.' });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setS3TestStatus({ success: false, error: error.message || 'Network request failed.' });
    } finally {
      setIsTestingS3(false);
    }
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
          <button
            onClick={() => setActiveTab('storage')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'storage'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Storage & Retention</span>
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
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {pages.map((p, idx) => {
                  const fullUrl = `${baseUrl}${p.path.startsWith('/') ? p.path : `/${p.path}`}`;
                  const isExpanded = expandedPageId === p.id;
                  const components = p.components || [];

                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border transition-all ${
                        isExpanded
                          ? 'bg-slate-950 border-indigo-500/50 shadow-lg shadow-indigo-950/20'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Page Header Row */}
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center text-[10px] font-mono font-bold text-slate-400 border border-slate-800">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">{p.name}</span>
                              <button
                                type="button"
                                onClick={() => setExpandedPageId(isExpanded ? null : p.id)}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 ${
                                  components.length > 0
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                <Crosshair className="w-3 h-3 text-indigo-400" />
                                <span>{components.length} {components.length === 1 ? 'component' : 'components'}</span>
                              </button>
                            </div>
                            <div className="text-[11px] font-mono text-indigo-400 mt-0.5">{p.path}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Launch Visual Element Picker Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setPickerPage({
                                id: p.id,
                                name: p.name,
                                path: p.path,
                                fullUrl,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                            title="Open Visual Point & Click Element Inspector"
                          >
                            <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="hidden sm:inline">Pick Element</span>
                          </button>

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
                            type="button"
                            onClick={() => setExpandedPageId(isExpanded ? null : p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
                            title={isExpanded ? 'Collapse components' : 'Expand components'}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemovePage(p.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-colors"
                            title="Remove Page"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Components Tray */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-900/40 space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Target Components for {p.name}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setPickerPage({
                                    id: p.id,
                                    name: p.name,
                                    path: p.path,
                                    fullUrl,
                                  })
                                }
                                className="px-2 py-1 rounded-md text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition-colors shadow-sm shadow-indigo-600/30"
                              >
                                <Crosshair className="w-3 h-3" />
                                <span>🎯 Visual Picker</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setManualCompPageId(manualCompPageId === p.id ? null : p.id)}
                                className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Manual Selector</span>
                              </button>
                            </div>
                          </div>

                          {/* Manual Component Form */}
                          {manualCompPageId === p.id && (
                            <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2.5 animate-in fade-in duration-150">
                              <div className="text-[11px] font-semibold text-white">Add Component by CSS Selector</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Component Name (e.g. Header Nav)"
                                  value={manualCompName}
                                  onChange={(e) => setManualCompName(e.target.value)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                                />
                                <input
                                  type="text"
                                  placeholder="CSS Selector (e.g. header nav, #cta-button)"
                                  value={manualCompSelector}
                                  onChange={(e) => setManualCompSelector(e.target.value)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-medium mr-1">States:</span>
                                  {(['default', 'hover', 'active', 'focus'] as ComponentState[]).map((st) => {
                                    const isSel = manualCompStates.includes(st);
                                    return (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() => {
                                          if (st === 'default') return;
                                          if (isSel) setManualCompStates(manualCompStates.filter((s) => s !== st));
                                          else setManualCompStates([...manualCompStates, st]);
                                        }}
                                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                                          isSel
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                                        }`}
                                      >
                                        {st === 'default' ? 'Default' : `:${st}`}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setManualCompPageId(null)}
                                    className="px-2.5 py-1 text-slate-400 hover:text-white text-[11px]"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!manualCompName.trim() || !manualCompSelector.trim()}
                                    onClick={() => handleAddManualComponent(p.id)}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium rounded-lg disabled:opacity-50"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Components List */}
                          {components.length === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center">
                              <p className="text-xs text-slate-400">
                                No specific components configured for this page yet.
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Click <span className="text-indigo-400 font-semibold">Visual Picker</span> above to click and select components directly from your live website.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {components.map((c) => (
                                <div
                                  key={c.id}
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 text-xs"
                                >
                                  <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="p-1 rounded bg-indigo-500/10 text-indigo-400 flex-shrink-0">
                                      <Crosshair className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="truncate">
                                      <span className="font-semibold text-white mr-2">{c.name}</span>
                                      <span className="font-mono text-[11px] text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                        {c.selector}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    <div className="flex items-center gap-1">
                                      {c.states.map((st) => (
                                        <span
                                          key={st}
                                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                                            st === 'hover'
                                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                              : st === 'active'
                                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                              : st === 'focus'
                                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                                          }`}
                                        >
                                          {st === 'default' ? 'default' : `:${st}`}
                                        </span>
                                      ))}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveComponentFromPage(p.id, c.id)}
                                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                      title="Remove Component"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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

          {/* TAB 5: Storage & Retention */}
          {activeTab === 'storage' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Storage Destination Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Screenshot Storage Provider
                  </label>
                  <span className="text-[11px] text-slate-400">Where test screenshots and diffs are saved</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Option 1: Database (Default) */}
                  <div
                    onClick={() => setSettings({ ...settings, storageProvider: 'database' })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      (settings.storageProvider || 'database') === 'database'
                        ? 'bg-indigo-950/30 border-indigo-500/80 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">PostgreSQL Database</div>
                          <div className="text-[11px] text-indigo-300 font-medium">Built-in (Zero Setup)</div>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          (settings.storageProvider || 'database') === 'database'
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-slate-700'
                        }`}
                      >
                        {(settings.storageProvider || 'database') === 'database' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                      Screenshots are compressed via WebP and stored directly inside your PostgreSQL database. Best for rapid local dev or small teams.
                    </p>
                  </div>

                  {/* Option 2: Custom S3 / R2 (BYOS) */}
                  <div
                    onClick={() => setSettings({ ...settings, storageProvider: 's3' })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      settings.storageProvider === 's3'
                        ? 'bg-indigo-950/30 border-indigo-500/80 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Cloud className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">Custom Cloud Storage (BYOS)</div>
                          <div className="text-[11px] text-emerald-300 font-medium">S3 / Cloudflare R2 / MinIO</div>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          settings.storageProvider === 's3'
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-slate-700'
                        }`}
                      >
                        {settings.storageProvider === 's3' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                      Connect your own S3 bucket. Images are stored in your cloud with zero platform capacity limits. Postgres only stores small image URLs.
                    </p>
                  </div>
                </div>
              </div>

              {/* S3 Configuration Details (Shown only when S3 selected) */}
              {settings.storageProvider === 's3' && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>S3-Compatible Bucket Settings</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Works with AWS S3, Cloudflare R2, Supabase Storage, MinIO, Wasabi, or Backblaze B2.
                      </p>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1">Presets:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            s3Config: {
                              bucket: settings.s3Config?.bucket || '',
                              region: 'us-east-1',
                              accessKeyId: settings.s3Config?.accessKeyId || '',
                              secretAccessKey: settings.s3Config?.secretAccessKey || '',
                              endpoint: '',
                              publicUrlPrefix: settings.s3Config?.publicUrlPrefix || '',
                            },
                          })
                        }
                        className="px-2 py-1 rounded-md text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        AWS S3
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            s3Config: {
                              bucket: settings.s3Config?.bucket || '',
                              region: 'auto',
                              accessKeyId: settings.s3Config?.accessKeyId || '',
                              secretAccessKey: settings.s3Config?.secretAccessKey || '',
                              endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
                              publicUrlPrefix: 'https://pub-<id>.r2.dev',
                            },
                          })
                        }
                        className="px-2 py-1 rounded-md text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
                      >
                        Cloudflare R2
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            s3Config: {
                              bucket: settings.s3Config?.bucket || '',
                              region: 'us-east-1',
                              accessKeyId: settings.s3Config?.accessKeyId || '',
                              secretAccessKey: settings.s3Config?.secretAccessKey || '',
                              endpoint: 'https://<project-ref>.supabase.co/storage/v1/s3',
                              publicUrlPrefix: '',
                            },
                          })
                        }
                        className="px-2 py-1 rounded-md text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-300 transition-colors"
                      >
                        Supabase
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Bucket Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="my-regression-screenshots"
                        value={settings.s3Config?.bucket || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            s3Config: {
                              ...(settings.s3Config || { region: 'us-east-1', accessKeyId: '', secretAccessKey: '' }),
                              bucket: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Region <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="us-east-1 (or 'auto' for R2)"
                        value={settings.s3Config?.region || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            s3Config: {
                              ...(settings.s3Config || { bucket: '', accessKeyId: '', secretAccessKey: '' }),
                              region: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Custom Endpoint URL <span className="text-slate-500 font-normal">(Optional for AWS; Required for R2/MinIO/Supabase)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="https://<account-id>.r2.cloudflarestorage.com"
                        value={settings.s3Config?.endpoint || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            s3Config: {
                              ...(settings.s3Config || { bucket: '', region: 'us-east-1', accessKeyId: '', secretAccessKey: '' }),
                              endpoint: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Access Key ID <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        value={settings.s3Config?.accessKeyId || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            s3Config: {
                              ...(settings.s3Config || { bucket: '', region: 'us-east-1', secretAccessKey: '' }),
                              accessKeyId: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">
                          Secret Access Key <span className="text-rose-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                        >
                          {showSecretKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showSecretKey ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                      <input
                        type={showSecretKey ? 'text' : 'password'}
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                        value={settings.s3Config?.secretAccessKey || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            s3Config: {
                              ...(settings.s3Config || { bucket: '', region: 'us-east-1', accessKeyId: '' }),
                              secretAccessKey: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Public CDN / Domain Prefix <span className="text-slate-500 font-normal">(Optional, e.g. https://pub-xxxx.r2.dev or https://cdn.mysite.com)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="https://pub-your-id.r2.dev"
                        value={settings.s3Config?.publicUrlPrefix || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            s3Config: {
                              ...(settings.s3Config || { bucket: '', region: 'us-east-1', accessKeyId: '', secretAccessKey: '' }),
                              publicUrlPrefix: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Test Connection Button & Status */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleTestS3}
                      disabled={isTestingS3}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-2 transition-all disabled:opacity-50 border border-slate-700 self-start"
                    >
                      {isTestingS3 ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <HardDrive className="w-3.5 h-3.5 text-indigo-400" />}
                      <span>{isTestingS3 ? 'Testing Bucket Connection...' : 'Test Bucket Write Permission'}</span>
                    </button>

                    {s3TestStatus && (
                      <div
                        className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                          s3TestStatus.success
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {s3TestStatus.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                        <span className="truncate max-w-sm">{s3TestStatus.success ? s3TestStatus.message : s3TestStatus.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Automated Run Retention Policy */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Automated Run Retention Policy
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Frees disk space by automatically pruning older test runs while preserving the active baseline.
                    </div>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                    Keep last {settings.retentionRunsCount ?? 15} runs
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {[5, 10, 15, 25, 50].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setSettings({ ...settings, retentionRunsCount: count })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        (settings.retentionRunsCount ?? 15) === count
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {count} runs
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Compression & Format Settings */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Screenshot Compression & Format
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      WebP reduces disk usage by 75-85% compared to lossless PNG without affecting diff precision.
                    </div>
                  </div>
                  <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, imageFormat: 'webp' })}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        (settings.imageFormat || 'webp') === 'webp'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      WebP (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, imageFormat: 'png' })}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        settings.imageFormat === 'png'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Lossless PNG
                    </button>
                  </div>
                </div>

                {(settings.imageFormat || 'webp') === 'webp' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Compression Quality</span>
                      <span className="font-mono text-indigo-400 font-semibold">{settings.imageQuality ?? 80}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={settings.imageQuality ?? 80}
                      onChange={(e) => setSettings({ ...settings, imageQuality: Number(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>50% (Maximum Compression)</span>
                      <span>80% (Optimal Balance)</span>
                      <span>100% (Near Lossless)</span>
                    </div>
                  </div>
                )}
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

      {/* Interactive Visual Element Picker Modal */}
      {pickerPage && (
        <ElementPickerModal
          projectId={project.id}
          pageName={pickerPage.name}
          pagePath={pickerPage.path}
          fullUrl={pickerPage.fullUrl}
          isOpen={Boolean(pickerPage)}
          onClose={() => setPickerPage(null)}
          onSelectComponent={(newComp) => {
            handleAddComponentToPage(pickerPage.id, newComp);
            setPickerPage(null);
            setExpandedPageId(pickerPage.id);
          }}
        />
      )}
    </div>
  );
}
