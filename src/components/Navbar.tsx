'use client';

import React from 'react';
import { Project, Run } from '@/types';
import {
  Layers,
  Play,
  Settings,
  Plus,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  History,
  Sparkles,
  Download,
  Upload
} from 'lucide-react';

interface NavbarProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project) => void;
  onOpenNewProject: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onRunCheck: () => void;
  onExportConfig: () => void;
  onImportConfig: () => void;
  isChecking: boolean;
  latestRun: Run | null;
}

export function Navbar({
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProject,
  onOpenSettings,
  onOpenHistory,
  onRunCheck,
  onExportConfig,
  onImportConfig,
  isChecking,
  latestRun,
}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Project Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Layers className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                Visual<span className="text-indigo-400">Analizar</span>
              </span>
              <div className="text-[10px] font-medium text-slate-400 tracking-wider uppercase -mt-0.5">
                Visual Regression Engine
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Project Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 text-sm font-medium text-slate-200 transition-all cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="max-w-[140px] md:max-w-[200px] truncate">
                {activeProject ? activeProject.name : 'Select Project'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Your Projects ({projects.length})
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 my-1">
                  {projects.map((p) => {
                    const isSelected = activeProject?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectProject(p);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className="truncate">
                          <div className="truncate">{p.name}</div>
                          <div className="text-xs text-slate-500 truncate">{p.baseUrl}</div>
                        </div>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 ml-2" />}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-slate-800 pt-1.5 mt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenNewProject();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-indigo-400 hover:bg-indigo-950/40 hover:text-indigo-300 font-medium transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeProject && (
            <>
              {/* Target Base URL preview */}
              <a
                href={activeProject.baseUrl}
                target="_blank"
                rel="noreferrer"
                title={`Visit ${activeProject.baseUrl}`}
                className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 px-2.5 py-1.5 rounded-md hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
              >
                <span>{activeProject.baseUrl.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* History Button */}
              <button
                onClick={onOpenHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all"
                title="View Runs & Baselines History"
              >
                <History className="w-4 h-4 text-slate-400" />
                <span className="hidden md:inline">Runs</span>
              </button>

              {/* Settings & Breakpoints Button */}
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all"
                title="Configure Pages, Breakpoints & Settings"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Settings</span>
                <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
                  {activeProject.breakpoints.length} bp
                </span>
              </button>

              {/* Run Visual Check Action */}
              <button
                onClick={onRunCheck}
                disabled={isChecking}
                className="relative group flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                <Play className={`w-4 h-4 fill-white ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Running Checks...' : 'Run Visual Check'}</span>
              </button>
            </>
          )}

          {!activeProject && (
            <button
              onClick={onOpenNewProject}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
