'use client';

import React, { useState } from 'react';
import { Project, DEFAULT_BREAKPOINTS, DEFAULT_PROJECT_SETTINGS } from '@/types';
import { Plus, X, Globe, Layers, Monitor, Sparkles } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (projectData: Partial<Project>) => Promise<void>;
}

export function NewProjectModal({ isOpen, onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [pagesInput, setPagesInput] = useState('/, /pricing, /about');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim()) {
      setError('Project name and Base URL are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Parse comma-separated pages
      const rawPaths = pagesInput
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const parsedPages = rawPaths.map((p, index) => {
        let cleanPath = p;
        if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;
        const namePart = cleanPath === '/' ? 'Home' : cleanPath.replace(/^\//, '').replace(/[-_]/g, ' ');
        const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        return {
          id: `page_${Date.now()}_${index}`,
          name: capitalized,
          path: cleanPath,
        };
      });

      await onCreate({
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        pages: parsedPages.length > 0 ? parsedPages : [{ id: `p_${Date.now()}`, name: 'Home', path: '/' }],
        breakpoints: DEFAULT_BREAKPOINTS,
        settings: DEFAULT_PROJECT_SETTINGS,
      });

      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplySample = (sampleName: string, sampleUrl: string, samplePages: string) => {
    setName(sampleName);
    setBaseUrl(sampleUrl);
    setPagesInput(samplePages);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create New Project</h2>
              <p className="text-xs text-slate-400">
                Setup target website domain, inner pages, and default breakpoints.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Demo Templates */}
        <div className="px-6 pt-4 pb-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Fill Demo Examples
          </span>
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleApplySample('Acme Web App', 'https://example.com', '/, /contact')}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              example.com (Simple)
            </button>
            <button
              type="button"
              onClick={() => handleApplySample('Tailwind CSS Docs', 'https://tailwindcss.com', '/, /docs')}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              tailwindcss.com
            </button>
            <button
              type="button"
              onClick={() => handleApplySample('Next.js Portal', 'https://nextjs.org', '/, /docs, /showcase')}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              nextjs.org
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Production"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Base URL (Target Domain)</span>
            </label>
            <input
              type="text"
              required
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Inner Pages to Check (Comma-separated)</span>
            </label>
            <input
              type="text"
              value={pagesInput}
              onChange={(e) => setPagesInput(e.target.value)}
              placeholder="/, /pricing, /about, /contact"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Example: <code className="text-slate-400">/, /pricing, /about</code>. You can customize them anytime later in settings.
            </p>
          </div>

          {/* Breakpoints Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-400" />
              <span>Default Breakpoints included:</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Desktop (1440px)</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Tablet (768px)</span>
              <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Mobile (375px)</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Project...' : 'Create & Save Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
