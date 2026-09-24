'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Project, Run, User } from '@/types';
import {
  Layers,
  Play,
  Settings,
  Plus,
  ChevronDown,
  ExternalLink,
  History,
  Users,
  Trash2,
  LogIn,
  LogOut,
  User as UserIcon,
  Shield,
  Star
} from 'lucide-react';

interface NavbarProps {
  projects: Project[];
  activeProject: Project | null;
  currentUser: User | null;
  onSelectProject: (project: Project) => void;
  onOpenNewProject: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenShareTeam: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onRequestDeleteProject: (project: Project) => void;
  onRunCheck: () => void;
  isChecking: boolean;
  latestRun: Run | null;
}

export function Navbar({
  projects,
  activeProject,
  currentUser,
  onSelectProject,
  onOpenNewProject,
  onOpenSettings,
  onOpenHistory,
  onOpenShareTeam,
  onOpenAuth,
  onLogout,
  onRequestDeleteProject,
  onRunCheck,
  isChecking,
}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
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
              <span className="max-w-[130px] md:max-w-[190px] truncate">
                {activeProject ? activeProject.name : 'Select Project'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Projects ({projects.length})</span>
                  {currentUser && (
                    <span className="text-[10px] text-indigo-400 font-mono">Personal & Team</span>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 my-1">
                  {projects.map((p) => {
                    const isSelected = activeProject?.id === p.id;
                    const hasTeam = p.members && p.members.length > 0;

                    return (
                      <div
                        key={p.id}
                        className={`group w-full rounded-lg text-sm transition-all flex items-center justify-between p-1.5 ${
                          isSelected
                            ? 'bg-indigo-600/20 border border-indigo-500/30'
                            : 'hover:bg-slate-800/80'
                        }`}
                      >
                        <button
                          onClick={() => {
                            onSelectProject(p);
                            setDropdownOpen(false);
                          }}
                          className="flex-1 text-left px-2 py-1 truncate cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`truncate font-medium ${isSelected ? 'text-indigo-300 font-semibold' : 'text-slate-200'}`}>
                              {p.name}
                            </span>
                            {hasTeam && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-0.5">
                                <Users className="w-2.5 h-2.5" />
                                <span>{p.members?.length}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{p.baseUrl}</div>
                        </button>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 pr-1">
                          {/* Remove project button right from switcher */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownOpen(false);
                              onRequestDeleteProject(p);
                            }}
                            className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title={`Delete ${p.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
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

        {/* Right: Actions & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeProject && (
            <>
              {/* Share Team Collaboration Button */}
              <button
                onClick={onOpenShareTeam}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 rounded-lg transition-all"
                title="Share project with team members"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Share</span>
                {activeProject.members && activeProject.members.length > 0 && (
                  <span className="text-[10px] bg-indigo-600/40 text-indigo-300 px-1 rounded-full font-mono">
                    {activeProject.members.length}
                  </span>
                )}
              </button>

              {/* History Button */}
              <button
                onClick={onOpenHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all"
                title="View Runs & Baselines History"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden md:inline">Runs</span>
              </button>

              {/* Settings & Breakpoints Button */}
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all"
                title="Configure Pages, Breakpoints & Settings"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              {/* Run Visual Check Action */}
              <button
                onClick={onRunCheck}
                disabled={isChecking}
                className="relative group flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                <Play className={`w-3.5 h-3.5 fill-white ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Running...' : 'Run Visual Check'}</span>
              </button>
            </>
          )}

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* User Account / Profile */}
          {currentUser ? (
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-400 truncate font-mono">{currentUser.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 font-medium transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-indigo-300 hover:text-white transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
