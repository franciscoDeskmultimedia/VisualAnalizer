'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Project, Run, Breakpoint, ProjectPage } from '@/types';
import { Navbar } from '@/components/Navbar';
import { ComparisonViewer } from '@/components/ComparisonViewer';
import { ComparisonGrid } from '@/components/ComparisonGrid';
import { ProjectSettingsModal } from '@/components/ProjectSettingsModal';
import { NewProjectModal } from '@/components/NewProjectModal';
import { RunHistoryDrawer } from '@/components/RunHistoryDrawer';
import { RunProgressModal } from '@/components/RunProgressModal';
import {
  Layers,
  Play,
  Monitor,
  Tablet,
  Smartphone,
  Star,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
  Sliders,
  History
} from 'lucide-react';

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [activeRun, setActiveRun] = useState<Run | null>(null);

  // Loading & Progress state
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [progressStep, setProgressStep] = useState('');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // View state tab: Deep Comparison vs Overview Grid
  const [viewTab, setViewTab] = useState<'compare' | 'grid'>('compare');

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success && data.projects) {
        setProjects(data.projects);
        if (!activeProject && data.projects.length > 0) {
          setActiveProject(data.projects[0]);
        }
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch runs for the active project
  const fetchRuns = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/runs`);
      const data = await res.json();
      if (data.success && data.runs) {
        setRuns(data.runs);
        if (data.runs.length > 0) {
          setActiveRun(data.runs[0]);
        } else {
          setActiveRun(null);
        }
      }
    } catch (err) {
      console.error('Error fetching runs:', err);
    }
  }, []);

  useEffect(() => {
    if (activeProject) {
      fetchRuns(activeProject.id);
    }
  }, [activeProject, fetchRuns]);

  // Handler: Run Visual Check
  const handleRunCheck = async () => {
    if (!activeProject || isChecking) return;
    setIsChecking(true);
    setProgressStep(`Preparing test for ${activeProject.name}...`);

    try {
      setProgressStep(`Capturing responsive viewports on ${activeProject.baseUrl}...`);
      const res = await fetch(`/api/projects/${activeProject.id}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete visual check');
      }

      // Refresh runs and active run
      await fetchRuns(activeProject.id);
      await fetchProjects();
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Visual check failed: ${error.message}`);
    } finally {
      setIsChecking(false);
      setProgressStep('');
    }
  };

  // Handler: Set as baseline
  const handleSetAsBaseline = async (runId: string) => {
    if (!activeProject) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/baseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh project and runs
        await fetchProjects();
        await fetchRuns(activeProject.id);
      }
    } catch (err) {
      console.error('Error setting baseline:', err);
    }
  };

  // Handler: Save Project Settings
  const handleSaveProject = async (updated: Project) => {
    const res = await fetch(`/api/projects/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    if (data.success) {
      setActiveProject(data.project);
      await fetchProjects();
    } else {
      throw new Error(data.error || 'Failed to update project');
    }
  };

  // Handler: Delete Project
  const handleDeleteProject = async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      setActiveProject(null);
      await fetchProjects();
    }
  };

  // Handler: Create Project
  const handleCreateProject = async (projectData: Partial<Project>) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    });
    const data = await res.json();
    if (data.success) {
      setProjects((prev) => [...prev, data.project]);
      setActiveProject(data.project);
    } else {
      throw new Error(data.error || 'Failed to create project');
    }
  };

  // Export / Import Config
  const handleExportConfig = () => {
    if (!activeProject) return;
    const blob = new Blob([JSON.stringify(activeProject, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (!target.files?.[0]) return;
      const file = target.files[0];
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        if (parsed.name && parsed.baseUrl) {
          await handleCreateProject(parsed);
        }
      } catch (err) {
        alert('Invalid JSON file configuration');
      }
    };
    input.click();
  };

  const isCurrentRunBaseline = Boolean(
    activeRun && activeProject && activeProject.baselineRunId === activeRun.id
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 bg-grid-pattern">
      {/* Top Navbar */}
      <Navbar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => setActiveProject(p)}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onRunCheck={handleRunCheck}
        onExportConfig={handleExportConfig}
        onImportConfig={handleImportConfig}
        isChecking={isChecking}
        latestRun={activeRun}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* If no project is selected */}
        {!activeProject && !isLoading && (
          <div className="glass-panel rounded-3xl p-12 text-center max-w-xl mx-auto my-12 space-y-6 border border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mx-auto text-indigo-400">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Welcome to VisualAnalizar</h2>
              <p className="text-xs text-slate-400 mt-2">
                Automated multi-device visual regression testing. Save projects, specify inner pages, test across Desktop, Tablet & Mobile, and detect visual changes against your base reference.
              </p>
            </div>
            <button
              onClick={() => setIsNewProjectOpen(true)}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Project</span>
            </button>
          </div>
        )}

        {/* Active Project Dashboard Header */}
        {activeProject && (
          <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Info */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    {activeProject.name}
                  </h1>
                  <a
                    href={activeProject.baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-mono text-indigo-400 hover:text-indigo-300 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800"
                  >
                    <span>{activeProject.baseUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {/* Baseline Badge */}
                  {activeProject.baselineRunId ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-amber-300" />
                      <span>Baseline Active</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">
                      <span>No Baseline Set</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-white">{activeProject.pages.length}</span> inner pages
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-white">{activeProject.breakpoints.length}</span> responsive viewports
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-white">{runs.length}</span> recorded runs
                  </span>
                </div>
              </div>

              {/* Right Stats & Trigger */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* View switcher: Deep comparison vs Matrix grid */}
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setViewTab('compare')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      viewTab === 'compare'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Deep Diff Viewer
                  </button>
                  <button
                    onClick={() => setViewTab('grid')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      viewTab === 'grid'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Overview Grid
                  </button>
                </div>

                <button
                  onClick={handleRunCheck}
                  disabled={isChecking}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Checking...' : 'Check All'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* If project has NO runs yet */}
        {activeProject && runs.length === 0 && !isChecking && (
          <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
              <Play className="w-6 h-6 fill-indigo-400 ml-1" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Visual Checks Run Yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Click &ldquo;Run Visual Check&rdquo; below to capture baseline screenshots for all {activeProject.pages.length} inner pages across Desktop, Tablet, and Mobile viewports.
              </p>
            </div>
            <button
              onClick={handleRunCheck}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Capture Initial Baseline Run</span>
            </button>
          </div>
        )}

        {/* If Active Run Exists */}
        {activeProject && activeRun && (
          <>
            {viewTab === 'compare' ? (
              <ComparisonViewer
                run={activeRun}
                pages={activeProject.pages}
                breakpoints={activeProject.breakpoints}
                isBaseline={isCurrentRunBaseline}
                onSetAsBaseline={handleSetAsBaseline}
              />
            ) : (
              <ComparisonGrid
                run={activeRun}
                pages={activeProject.pages}
                breakpoints={activeProject.breakpoints}
                onSelectComparison={(pageId, breakpointId) => {
                  setViewTab('compare');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">VisualAnalizar</span>
            <span>• Automated Multi-Breakpoint Visual Regression Testing</span>
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            Serverless Puppeteer & Pixelmatch Engine • Vercel Ready
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      {activeProject && (
        <ProjectSettingsModal
          project={activeProject}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
        />
      )}

      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreate={handleCreateProject}
      />

      <RunHistoryDrawer
        runs={runs}
        activeRunId={activeRun?.id || null}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectRun={(run) => setActiveRun(run)}
        onSetAsBaseline={handleSetAsBaseline}
      />

      {activeProject && (
        <RunProgressModal
          isOpen={isChecking}
          project={activeProject}
          progressStep={progressStep}
        />
      )}
    </div>
  );
}
