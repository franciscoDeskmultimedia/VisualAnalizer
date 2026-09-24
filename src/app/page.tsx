'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Project, Run, Breakpoint, ProjectPage, User } from '@/types';
import { Navbar } from '@/components/Navbar';
import { ComparisonViewer } from '@/components/ComparisonViewer';
import { ComparisonGrid } from '@/components/ComparisonGrid';
import { ProjectSettingsModal } from '@/components/ProjectSettingsModal';
import { NewProjectModal } from '@/components/NewProjectModal';
import { RunHistoryDrawer } from '@/components/RunHistoryDrawer';
import { RunProgressModal } from '@/components/RunProgressModal';
import { AuthModal } from '@/components/AuthModal';
import { TeamShareModal } from '@/components/TeamShareModal';
import { DeleteProjectModal } from '@/components/DeleteProjectModal';
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
  History,
  Users,
  Trash2,
  Share2
} from 'lucide-react';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isShareTeamOpen, setIsShareTeamOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Toast & Promotion state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  // View state tab: Deep Comparison vs Overview Grid
  const [viewTab, setViewTab] = useState<'compare' | 'grid'>('compare');

  // Fetch current user
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  }, []);

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success && data.projects) {
        setProjects(data.projects);
        setActiveProject((prev) => {
          if (prev && data.projects.some((p: Project) => p.id === prev.id)) {
            return data.projects.find((p: Project) => p.id === prev.id) || null;
          }
          return data.projects[0] || null;
        });
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchProjects();
  }, [fetchCurrentUser, fetchProjects]);

  // Check URL for ?invite=token to join team
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');
    if (inviteToken) {
      // Remove query param from url
      window.history.replaceState({}, document.title, window.location.pathname);

      fetch('/api/projects/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteToken }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.project) {
            alert(`You have joined the project team for: ${data.project.name}!`);
            fetchProjects();
            setActiveProject(data.project);
          } else if (data.error && data.error.includes('sign in')) {
            setIsAuthOpen(true);
          }
        })
        .catch((err) => console.error('Error joining via invite token:', err));
    }
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
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      const pages = activeProject.pages;
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        setProgressStep(`Checking page ${i + 1} of ${pages.length}: ${page.name} (${page.path})...`);

        const res = await fetch(`/api/projects/${activeProject.id}/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId,
            pageIds: [page.id],
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed on page ${page.name}`);
        }
      }

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
    setIsPromoting(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/baseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.project) {
          setActiveProject(data.project);
        } else {
          setActiveProject((prev) => (prev ? { ...prev, baselineRunId: runId } : null));
        }

        if (data.run) {
          setActiveRun(data.run);
        } else {
          setActiveRun((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              isBaseline: true,
              passedChecks: prev.comparisons.length,
              changedChecks: 0,
              newChecks: 0,
              comparisons: prev.comparisons.map((c) => ({
                ...c,
                baselineImage: c.currentImage,
                diffImage: undefined,
                diffPercentage: 0,
                diffPixelCount: 0,
                status: 'identical',
              })),
            };
          });
        }

        setToastMessage('⭐ Run promoted to baseline! All subsequent visual checks will compare against this run.');
        setTimeout(() => setToastMessage(null), 4500);

        await fetchProjects();
        await fetchRuns(activeProject.id);
      } else {
        alert(data.error || 'Failed to promote run to baseline');
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error setting baseline:', error);
      alert(`Error setting baseline: ${error.message}`);
    } finally {
      setIsPromoting(false);
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

  // Handler: Delete Project permanently
  const handleConfirmDeleteProject = async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (data.success) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (activeProject?.id === projectId) {
        const remaining = projects.filter((p) => p.id !== projectId);
        setActiveProject(remaining[0] || null);
      }
    } else {
      alert(data.error || 'Failed to delete project');
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

  // Handler: Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUser(null);
    await fetchProjects();
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
        currentUser={currentUser}
        onSelectProject={(p) => setActiveProject(p)}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenShareTeam={() => setIsShareTeamOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onRequestDeleteProject={(p) => setProjectToDelete(p)}
        onRunCheck={handleRunCheck}
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
                Automated multi-device visual regression testing. Save projects, specify inner pages, test across Desktop, Tablet & Mobile, and collaborate with your team.
              </p>
            </div>
            <button
              onClick={() => setIsNewProjectOpen(true)}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all inline-flex items-center gap-2 cursor-pointer"
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

                  {/* Team Members Count Badge */}
                  {activeProject.members && activeProject.members.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsShareTeamOpen(true)}
                      className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 hover:border-indigo-600 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <Users className="w-3 h-3 text-indigo-400" />
                      <span>{activeProject.members.length} Team Members</span>
                    </button>
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
                {/* Share Team Quick Button */}
                <button
                  type="button"
                  onClick={() => setIsShareTeamOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-indigo-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Invite or manage team collaborators"
                >
                  <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Share Project</span>
                </button>

                {/* View switcher: Deep comparison vs Matrix grid */}
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setViewTab('compare')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                      viewTab === 'compare'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Deep Diff Viewer
                  </button>
                  <button
                    onClick={() => setViewTab('grid')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
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

                {/* Delete Project Quick Action */}
                <button
                  type="button"
                  onClick={() => setProjectToDelete(activeProject)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                  title="Delete this project"
                >
                  <Trash2 className="w-4 h-4" />
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Capture Initial Baseline Run</span>
            </button>
          </div>
        )}

        {/* If Active Run Exists */}
        {activeProject && activeRun && (
          <div className="space-y-4">
            {/* Active Run Status & Baseline Promotion Action Banner */}
            <div
              className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                isCurrentRunBaseline
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-gradient-to-r from-slate-900 via-indigo-950/30 to-amber-950/20 border-amber-500/30 shadow-xl shadow-amber-500/5'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm font-bold text-white">
                      Run #{runs.findIndex((r) => r.id === activeRun.id) !== -1 ? runs.length - runs.findIndex((r) => r.id === activeRun.id) : 1}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({new Date(activeRun.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })})
                    </span>

                    {isCurrentRunBaseline ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Star className="w-3.5 h-3.5 fill-amber-300" />
                        <span>Active Baseline Reference</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        <span>New Check Run</span>
                      </span>
                    )}

                    {/* Stats pills */}
                    <div className="flex items-center gap-1.5 text-xs flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        {activeRun.passedChecks} Matched
                      </span>
                      {activeRun.changedChecks > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                          {activeRun.changedChecks} Changed
                        </span>
                      )}
                      {activeRun.newChecks > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                          {activeRun.newChecks} New Captures
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">
                    {isCurrentRunBaseline
                      ? '⭐ This check run is the active baseline reference. All subsequent visual regression checks will be compared against these screenshots.'
                      : '💡 If these visual changes are expected and intended, promote this run to baseline so future checks compare against it.'}
                  </p>
                </div>

                {/* Right: Promote Action */}
                <div className="flex items-center gap-2">
                  {!isCurrentRunBaseline ? (
                    <button
                      type="button"
                      disabled={isPromoting}
                      onClick={() => handleSetAsBaseline(activeRun.id)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      title="Set all screenshots in this check run as the new baseline reference"
                    >
                      <Star className="w-4 h-4 fill-slate-950" />
                      <span>{isPromoting ? 'Promoting...' : 'Promote this Run to Baseline'}</span>
                    </button>
                  ) : (
                    <span className="text-xs text-amber-300/80 font-mono hidden sm:inline">
                      Source of truth
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Viewer / Grid */}
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
                isBaseline={isCurrentRunBaseline}
                onSetAsBaseline={handleSetAsBaseline}
                onSelectComparison={(pageId, breakpointId) => {
                  setViewTab('compare');
                }}
              />
            )}
          </div>
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
          onDelete={handleConfirmDeleteProject}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          fetchProjects();
        }}
      />

      {/* Team Share Modal */}
      {activeProject && (
        <TeamShareModal
          project={activeProject}
          currentUser={currentUser}
          isOpen={isShareTeamOpen}
          onClose={() => setIsShareTeamOpen(false)}
          onUpdateProject={(updated) => {
            setActiveProject(updated);
            fetchProjects();
          }}
        />
      )}

      {/* Delete Project Confirmation Modal */}
      <DeleteProjectModal
        project={projectToDelete}
        isOpen={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        onConfirmDelete={handleConfirmDeleteProject}
      />

      {/* Baseline Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 border border-amber-500/50 text-amber-200 shadow-2xl shadow-black text-xs font-semibold backdrop-blur-md">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400 animate-spin" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
