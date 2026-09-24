'use client';

import React, { useState } from 'react';
import { Project, ProjectMember, User } from '@/types';
import {
  X,
  Users,
  UserPlus,
  Mail,
  Shield,
  Copy,
  Check,
  Trash2,
  Share2,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface TeamShareModalProps {
  project: Project;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updated: Project) => void;
}

export function TeamShareModal({
  project,
  currentUser,
  isOpen,
  onClose,
  onUpdateProject,
}: TeamShareModalProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?invite=${project.inviteToken || ''}`
    : '';

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add team member');
      }

      onUpdateProject(data.project);
      setInviteEmail('');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from this project?`)) return;

    try {
      const res = await fetch(`/api/projects/${project.id}/members?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove member');
      }

      onUpdateProject(data.project);
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message);
    }
  };

  const members = project.members || [];
  const isOwner = currentUser && project.ownerId === currentUser.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Team Collaboration & Sharing</span>
              </h2>
              <p className="text-xs text-slate-400">
                Share <span className="text-slate-200 font-semibold">{project.name}</span> with team members to run visual checks together.
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

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Shareable Link Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>One-Click Team Invite Link</span>
              </span>
              <span className="text-[11px] text-indigo-400 font-mono">Instant Access</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Anyone with this secret link can join this project and review visual differences.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-all whitespace-nowrap"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Add Team Member by Email Form */}
          <form onSubmit={handleAddMember} className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Invite by Email</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="editor">Editor (Can run checks)</option>
                <option value="viewer">Viewer (Read-only)</option>
              </select>

              <button
                type="submit"
                disabled={isSubmitting || !inviteEmail.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-all whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Adding...' : 'Invite'}</span>
              </button>
            </div>
          </form>

          {/* Team Members List */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Project Members ({members.length + (project.ownerEmail ? 1 : 0)})</span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {/* Owner Item */}
              {project.ownerEmail && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                      {project.ownerEmail.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span>{project.ownerEmail}</span>
                        {currentUser?.email === project.ownerEmail && (
                          <span className="text-[10px] text-slate-400">(You)</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Project Creator</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Owner
                  </span>
                </div>
              )}

              {/* Members */}
              {members.map((member) => (
                <div
                  key={member.userId || member.email}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700">
                      {member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span>{member.name || member.email}</span>
                        {currentUser?.email === member.email && (
                          <span className="text-[10px] text-slate-400">(You)</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{member.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        member.role === 'editor'
                          ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {member.role}
                    </span>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.email)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
