'use client';

import React, { useState } from 'react';
import { Project } from '@/types';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (projectId: string) => Promise<void>;
}

export function DeleteProjectModal({
  project,
  isOpen,
  onClose,
  onConfirmDelete,
}: DeleteProjectModalProps) {
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !project) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(project.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setConfirmName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-rose-900/40 shadow-2xl p-6 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-white">Delete Project</h3>
          <p className="text-xs text-slate-400 mt-1">
            Are you sure you want to delete <span className="text-white font-semibold">{project.name}</span>?
          </p>
        </div>

        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>
            This action cannot be undone. All configured inner pages, responsive breakpoints, baseline captures, and historical runs will be permanently removed.
          </span>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Type <span className="text-white select-all">{project.name}</span> to confirm
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={project.name}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={confirmName.trim() !== project.name.trim() || isDeleting}
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Project Permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
