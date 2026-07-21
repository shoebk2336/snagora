'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { useAuthStore } from '@/store/authStore';
import { 
  Search, HardDrive, CheckCircle2, AlertCircle, 
  Clock, Plus, X, Edit, Trash2,
  Building as BuildingIcon
} from 'lucide-react';
import { logger } from '@/utils/logger';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Create Project Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Project state
  const [projectToEdit, setProjectToEdit] = useState<any | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editBuildingName, setEditBuildingName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Project state
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Live Query projects and issues from Dexie
  const projects = useLiveQuery(() => db.projects.toArray());
  const issues = useLiveQuery(() => db.issues.toArray());

  // Redirect if user not logged in (handled by layout, but safeguard here)
  if (!user) return null;

  // Global search filtering
  const filteredIssues = issues?.filter(issue => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    return (
      issue.title.toLowerCase().includes(query) ||
      issue.category.toLowerCase().includes(query) ||
      issue.priority.toLowerCase().includes(query) ||
      issue.description.toLowerCase().includes(query) ||
      issue.createdBy.toLowerCase().includes(query)
    );
  }) || [];

  // Totals calculations
  const pendingIssuesCount = issues?.filter(i => i.status === 'pending').length || 0;
  const completedIssuesCount = issues?.filter(i => i.status === 'completed').length || 0;

  // ---- Create Project (simple: name + building only) ----
  const resetForm = () => {
    setProjectName('');
    setBuildingName('');
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !buildingName.trim()) {
      alert('Project name and Building name are required.');
      return;
    }

    setCreating(true);
    try {
      const ts = Date.now();
      const projectId = `proj-${ts}`;
      const buildingId = `bld-${ts}`;

      // 1. Create Project
      await db.projects.add({
        id: projectId,
        name: projectName.trim(),
        buildingName: buildingName.trim(),
        pendingIssues: 0,
        completedIssues: 0,
        lastUpdated: ts,
        offlineStatus: 'offline',
        syncStatus: 'pending',
      });

      // 2. Create Building record
      await db.buildings.add({
        id: buildingId,
        projectId,
        name: buildingName.trim(),
      });

      resetForm();
      setShowCreateModal(false);
    } catch (err) {
      logger.error('Failed to create project:', err);
      alert('Failed to create project. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // ---- Save Project Edit ----
  const handleEditSave = async () => {
    if (!projectToEdit || !editProjectName.trim() || !editBuildingName.trim()) return;
    setSavingEdit(true);
    try {
      await db.transaction('rw', [db.projects, db.buildings], async () => {
        await db.projects.update(projectToEdit.id, {
          name: editProjectName.trim(),
          buildingName: editBuildingName.trim(),
          lastUpdated: Date.now()
        });
        
        // Update all buildings associated with this project
        const buildings = await db.buildings.where({ projectId: projectToEdit.id }).toArray();
        for (const bld of buildings) {
          await db.buildings.update(bld.id, {
            name: editBuildingName.trim()
          });
        }
      });
      setProjectToEdit(null);
    } catch (err) {
      logger.error('Failed to update project:', err);
      alert('Failed to save project updates.');
    } finally {
      setSavingEdit(false);
    }
  };

  // ---- Confirm Delete Project ----
  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    setDeleting(true);
    try {
      const pId = projectToDelete.id;
      
      await db.transaction('rw', [db.projects, db.buildings, db.wings, db.floors, db.rooms, db.issues, db.photos], async () => {
        // Find all rooms in this project
        const rooms = await db.rooms.where({ projectId: pId }).toArray();
        const roomIds = rooms.map(r => r.id);
        
        // Find all issues in these rooms
        const issues = await db.issues.where('roomId').anyOf(roomIds).toArray();
        const issueIds = issues.map(i => i.id);
        
        // Delete photos of those issues
        if (issueIds.length > 0) {
          await db.photos.where('issueId').anyOf(issueIds).delete();
        }
        
        // Delete issues
        if (roomIds.length > 0) {
          await db.issues.where('roomId').anyOf(roomIds).delete();
        }
        
        // Delete rooms
        await db.rooms.where({ projectId: pId }).delete();
        
        // Delete floors, wings, buildings
        const buildings = await db.buildings.where({ projectId: pId }).toArray();
        const bldIds = buildings.map(b => b.id);
        
        if (bldIds.length > 0) {
          const wings = await db.wings.where('buildingId').anyOf(bldIds).toArray();
          const wingIds = wings.map(w => w.id);
          
          if (wingIds.length > 0) {
            await db.floors.where('wingId').anyOf(wingIds).delete();
            await db.wings.where('buildingId').anyOf(bldIds).delete();
          }
        }
        
        await db.buildings.where({ projectId: pId }).delete();
        await db.projects.delete(pId);
      });
      
      setProjectToDelete(null);
    } catch (err) {
      logger.error('Failed to delete project:', err);
      alert('Failed to delete project.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-background h-full w-full overflow-hidden relative min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-6 pb-4 min-h-0">
        
        {/* User greeting header card */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-gradient-from via-gradient-via to-gradient-to text-white shadow-md border border-accent/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 block">Active Inspector</span>
              <span className="text-base font-bold flex items-center gap-1">
                {user.name} 
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold">
                  {user.role}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative rounded-2xl shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issue, category, or technician..."
            className="block w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface pl-10 pr-4 py-3 text-sm text-foreground placeholder-slate-400 focus:border-accent focus:outline-none transition-all"
          />
        </div>

        {/* Real-time search results display */}
        {searchQuery && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Search Results ({filteredIssues.length})
            </h3>
            {filteredIssues.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No matching issues found.</p>
            ) : (
              <div className="space-y-2">
                {filteredIssues.map(issue => (
                  <Link
                    key={issue.id}
                    href={`/room?roomId=${issue.roomId}&projectId=${issue.projectId}`}
                    className="block p-3 rounded-2xl border border-border bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-accent">{issue.category}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                        issue.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                        issue.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                        issue.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {issue.priority}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold mt-1 text-foreground">{issue.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{issue.description}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Pending</span>
              <span className="text-lg font-black text-foreground">{pendingIssuesCount}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-surface flex items-center justify-center text-accent">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Resolved</span>
              <span className="text-lg font-black text-foreground">{completedIssuesCount}</span>
            </div>
          </div>
        </div>

        {/* Projects list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Projects ({projects?.length || 0})
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent">
              <HardDrive className="h-3 w-3" /> Offline storage active
            </span>
          </div>

          {/* Create New Project Button */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-3xl border-2 border-dashed border-accent/30 bg-accent-surface/50 hover:bg-accent-surface text-accent font-bold text-xs transition-all ripple"
          >
            <div className="w-8 h-8 rounded-full bg-accent-surface flex items-center justify-center">
              <Plus className="h-4 w-4" />
            </div>
            Create New Project
          </button>

          <div className="space-y-3">
            {projects?.map((project) => {
              const projIssues = issues?.filter(i => i.projectId === project.id) || [];
              const pending = projIssues.filter(i => i.status === 'pending').length;
              const completed = projIssues.filter(i => i.status === 'completed').length;

              return (
                <div
                  key={project.id}
                  className="group relative rounded-3xl border border-border bg-surface p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-foreground group-hover:text-accent">
                        {project.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Building: {project.buildingName}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-accent-surface px-1.5 py-0.5 text-[8px] font-bold text-accent uppercase border border-accent-light/30">
                        Offline
                      </span>
                      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                        project.syncStatus === 'synced' 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' 
                          : 'bg-accent-surface text-accent border border-accent-light/30'
                      }`}>
                        {project.syncStatus === 'synced' ? 'Synced' : 'Pending Sync'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {pending} Pending
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        {completed} Completed
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(project.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Edit / Delete actions overlay */}
                  <div className="mt-3 flex justify-end gap-3 border-t border-border pt-2.5 relative z-20">
                    <button
                      type="button"
                      onClick={() => {
                        setProjectToEdit(project);
                        setEditProjectName(project.name);
                        setEditBuildingName(project.buildingName);
                      }}
                      className="flex items-center gap-1 text-slate-500 hover:text-accent px-2 py-1 text-xs font-semibold cursor-pointer"
                      title="Edit Project"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setProjectToDelete(project)}
                      className="flex items-center gap-1 text-slate-500 hover:text-rose-600 px-2 py-1 text-xs font-semibold cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>

                  <Link
                    href={`/room?projectId=${project.id}`}
                    className="absolute inset-0 z-10 cursor-pointer"
                    aria-label={`Open ${project.name}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============ CREATE PROJECT MODAL (Simple) ============ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-surface border-t sm:border border-border shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-3 border-b border-border">
              <div>
                <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">Offline Setup</span>
                <h2 className="text-base font-black text-foreground">New Project</h2>
              </div>
              <button
                type="button"
                onClick={() => { resetForm(); setShowCreateModal(false); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Project Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Burj Khalifa Commercial Inspection"
                  className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-xs text-foreground placeholder-slate-400 focus:border-accent focus:outline-none"
                />
              </div>

              {/* Building Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BuildingIcon className="h-3.5 w-3.5 text-accent" /> Building Name
                </label>
                <input
                  type="text"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  placeholder="e.g. Main Tower"
                  className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-xs text-foreground placeholder-slate-400 focus:border-accent focus:outline-none"
                />
              </div>

              {/* Helper text */}
              <p className="text-[10px] text-slate-400 italic leading-relaxed">
                Wings, floors, and rooms will be added on the fly when you start inspecting.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-5 pt-0">
              <button
                type="button"
                onClick={() => { resetForm(); setShowCreateModal(false); }}
                className="flex-1 h-11 rounded-2xl border border-border text-slate-600 dark:text-slate-400 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={creating || !projectName.trim() || !buildingName.trim()}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-gradient-from to-gradient-to text-white font-semibold text-xs shadow hover:bg-accent disabled:opacity-50 flex items-center justify-center gap-1.5 ripple"
              >
                {creating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Create Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {projectToEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-surface border-t sm:border border-border shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-3 border-b border-border">
              <div>
                <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">Modify Project</span>
                <h2 className="text-base font-black text-foreground">Edit Project Details</h2>
              </div>
              <button
                type="button"
                onClick={() => setProjectToEdit(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Edit Project Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Project Name</label>
                <input
                  type="text"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              {/* Edit Building Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BuildingIcon className="h-3.5 w-3.5 text-accent" /> Building Name
                </label>
                <input
                  type="text"
                  value={editBuildingName}
                  onChange={(e) => setEditBuildingName(e.target.value)}
                  placeholder="Building name"
                  className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-xs text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-5 pt-0">
              <button
                type="button"
                onClick={() => setProjectToEdit(null)}
                className="flex-1 h-11 rounded-2xl border border-border text-slate-600 dark:text-slate-400 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={savingEdit || !editProjectName.trim() || !editBuildingName.trim()}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-gradient-from to-gradient-to text-white font-semibold text-xs shadow hover:bg-accent disabled:opacity-50 flex items-center justify-center gap-1.5 ripple"
              >
                {savingEdit ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6 border border-border shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mx-auto animate-bounce">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Delete Project?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-2 leading-relaxed">
                Are you sure you want to permanently delete <span className="font-bold text-foreground">"{projectToDelete.name}"</span>?
                This will delete all wings, floors, rooms, and captured inspection defects with annotations. **This action cannot be undone.**
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="flex-1 h-10 rounded-xl border border-border text-slate-600 dark:text-slate-400 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 h-10 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 shadow transition-colors flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
