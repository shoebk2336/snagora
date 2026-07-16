'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Room, Issue, Photo, Building, Wing, Floor } from '@/database/db';
import { useAuthStore } from '@/store/authStore';
import { 
  Building as BuildingIcon, MapPin, Layers, DoorOpen, Plus, 
  ChevronRight, ArrowLeft, Search, Copy, Trash2, 
  Edit, ShieldAlert, CheckCircle
} from 'lucide-react';

export default function RoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const projectId = searchParams.get('projectId') || '';
  const roomIdParam = searchParams.get('roomId') || '';

  // Selectors State
  const [selectedBld, setSelectedBld] = useState('');
  const [selectedWing, setSelectedWing] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [issueToDelete, setIssueToDelete] = useState<Issue | null>(null);

  // New entry inputs
  const [newWingName, setNewWingName] = useState('');
  const [newFloorName, setNewFloorName] = useState('');
  const [creatingEntry, setCreatingEntry] = useState(false);

  // Database Queries
  const activeProject = useLiveQuery(() => db.projects.get(projectId), [projectId]);
  const buildings = useLiveQuery(() => db.buildings.where({ projectId }).toArray(), [projectId]);
  const wings = useLiveQuery(() => selectedBld ? db.wings.where({ buildingId: selectedBld }).toArray() : Promise.resolve([] as Wing[]), [selectedBld]);
  const floors = useLiveQuery(() => selectedWing ? db.floors.where({ wingId: selectedWing }).toArray() : Promise.resolve([] as Floor[]), [selectedWing]);

  // If roomId is set in URL, we query room details and room issues
  const activeRoom = useLiveQuery(() => Promise.resolve(roomIdParam ? db.rooms.get(roomIdParam) : undefined), [roomIdParam]);
  const roomIssues = useLiveQuery(() => roomIdParam ? db.issues.where({ roomId: roomIdParam }).toArray() : Promise.resolve([] as Issue[]), [roomIdParam]);
  const allPhotos = useLiveQuery(() => db.photos.toArray());

  // Auto-select first building if only one exists
  useEffect(() => {
    if (buildings && buildings.length > 0 && !selectedBld) {
      setSelectedBld(buildings[0].id);
    }
  }, [buildings, selectedBld]);

  // Auto-fill selector state if roomId is active
  useEffect(() => {
    if (activeRoom) {
      setSelectedFloor(activeRoom.floorId);
    }
  }, [activeRoom]);

  if (!user) return null;

  // ---- On-the-fly creation helpers ----
  const handleCreateWing = async () => {
    if (!newWingName.trim() || !selectedBld) return;
    setCreatingEntry(true);
    try {
      const wingId = `wing-${Date.now()}`;
      await db.wings.add({
        id: wingId,
        buildingId: selectedBld,
        name: newWingName.trim(),
      });
      setSelectedWing(wingId);
      setNewWingName('');
      setSelectedFloor('');
    } finally {
      setCreatingEntry(false);
    }
  };

  const handleCreateFloor = async () => {
    if (!newFloorName.trim() || !selectedWing) return;
    setCreatingEntry(true);
    try {
      const floorId = `flr-${Date.now()}`;
      await db.floors.add({
        id: floorId,
        wingId: selectedWing,
        name: newFloorName.trim(),
      });
      setSelectedFloor(floorId);
      setNewFloorName('');
    } finally {
      setCreatingEntry(false);
    }
  };

  const handleGoToFloor = async (floorId: string) => {
    if (!floorId || !selectedBld || !selectedWing) return;
    setCreatingEntry(true);
    try {
      let room = await db.rooms.where({ floorId }).first();
      if (!room) {
        const wingRecord = await db.wings.get(selectedWing);
        const floorRecord = await db.floors.get(floorId);
        const buildingRecord = await db.buildings.get(selectedBld);

        const roomId = `rm-${Date.now()}`;
        await db.rooms.add({
          id: roomId,
          floorId: floorId,
          number: floorRecord?.name || 'General Area',
          wing: wingRecord?.name || '',
          floor: floorRecord?.name || '',
          building: buildingRecord?.name || '',
          projectId,
        });
        
        router.push(`/room?projectId=${projectId}&roomId=${roomId}`);
      } else {
        router.push(`/room?projectId=${projectId}&roomId=${room.id}`);
      }
    } finally {
      setCreatingEntry(false);
    }
  };

  // Actions for Issues
  const handleDuplicateIssue = async (issue: Issue) => {
    const newIssueId = `iss-${Date.now()}`;
    
    // Duplicate photos in DB if any
    const duplicatedPhotoIds: string[] = [];
    if (issue.photos && issue.photos.length > 0) {
      for (const photoId of issue.photos) {
        const photo = await db.photos.get(photoId);
        if (photo) {
          const newPhotoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          await db.photos.add({
            ...photo,
            id: newPhotoId,
            issueId: newIssueId
          });
          duplicatedPhotoIds.push(newPhotoId);
        }
      }
    }

    await db.issues.add({
      ...issue,
      id: newIssueId,
      title: `${issue.title} (Copy)`,
      photos: duplicatedPhotoIds,
      createdDate: Date.now()
    });

    // Update project counters
    const proj = await db.projects.get(projectId);
    if (proj) {
      await db.projects.update(projectId, {
        pendingIssues: (proj.pendingIssues || 0) + 1,
        lastUpdated: Date.now()
      });
    }
  };

  const handleDeleteIssue = (issue: Issue) => {
    setIssueToDelete(issue);
  };

  const handleConfirmDelete = async () => {
    if (!issueToDelete) return;
    
    // 1. Delete associated photos
    if (issueToDelete.photos && issueToDelete.photos.length > 0) {
      await db.photos.bulkDelete(issueToDelete.photos);
    }
    // 2. Delete issue
    await db.issues.delete(issueToDelete.id);

    // 3. Update project counts
    const proj = await db.projects.get(projectId);
    if (proj) {
      const key = issueToDelete.status === 'completed' ? 'completedIssues' : 'pendingIssues';
      await db.projects.update(projectId, {
        [key]: Math.max(0, (proj[key] || 0) - 1),
        lastUpdated: Date.now()
      });
    }
    
    setIssueToDelete(null);
  };

  return (
    <div className="flex flex-1 flex-col bg-background h-[calc(100vh-7.5rem)] w-full overflow-hidden relative min-h-0">
      
      {/* 1. ROOM DETAILS SCREEN (when roomId is selected) */}
      {roomIdParam && activeRoom ? (
        <div className="flex flex-1 flex-col h-full w-full overflow-hidden relative min-h-0">
          {/* Header */}
          <div className="bg-surface px-4 py-3 border-b border-border flex items-center gap-3">
            <button 
              onClick={() => router.push(`/room?projectId=${projectId}`)}
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">Active Room</span>
              <h2 className="text-base font-bold text-foreground">{activeRoom.number}</h2>
            </div>
          </div>

          {/* Room Location Info */}
          <div className="bg-surface-variant p-4 flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <BuildingIcon className="h-4 w-4 text-accent" />
              <span>Building: <span className="font-semibold text-foreground">{activeRoom.building}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              <span>Wing: <span className="font-semibold text-foreground">{activeRoom.wing}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" />
              <span>Floor: <span className="font-semibold text-foreground">{activeRoom.floor}</span></span>
            </div>
          </div>

          {/* Issues list section */}
          <div className="p-4 space-y-4 flex-1 overflow-y-auto no-scrollbar pb-28 min-h-0">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Inspection Issues ({roomIssues?.length || 0})
            </h3>

            {roomIssues?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-2">
                <DoorOpen className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-semibold">No issues captured in this room.</p>
                <p className="text-xs">Tap the Floating Action Button (+) below to inspect a new defect.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {roomIssues?.map((issue) => {
                  // Find thumbnail photo (first photo annotated if exists, else original, else empty)
                  const issuePhotos = allPhotos?.filter(p => issue.photos.includes(p.id)) || [];
                  const thumb = issuePhotos[0]?.annotatedUrl || issuePhotos[0]?.originalUrl || '';

                  return (
                    <div
                      key={issue.id}
                      className="group relative rounded-3xl border border-border bg-surface p-4 shadow-sm space-y-3"
                    >
                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        {thumb ? (
                          <img
                            src={thumb}
                            alt="Defect preview"
                            className="w-20 h-20 rounded-2xl object-cover border border-border flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-border flex flex-col items-center justify-center text-slate-400 flex-shrink-0">
                            <ShieldAlert className="h-6 w-6" />
                            <span className="text-[9px] mt-0.5">No photo</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-accent uppercase">
                              {issue.category} {issue.subCategory && `• ${issue.subCategory}`}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              issue.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                              issue.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                              issue.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {issue.priority}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-foreground mt-1 truncate">{issue.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{issue.description}</p>
                        </div>
                      </div>

                      {/* Created date/user & status */}
                      <div className="flex items-center justify-between border-t border-border pt-3 text-[10px] text-slate-400">
                        <span className="truncate">
                          By: <span className="font-semibold">{issue.createdBy}</span> • {new Date(issue.createdDate).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {issue.status === 'completed' ? (
                            <span className="flex items-center gap-0.5 text-accent font-bold uppercase">
                              <CheckCircle className="h-3.5 w-3.5" /> Resolved
                            </span>
                          ) : (
                            <span className="rounded bg-accent-surface dark:bg-accent-surface-alt px-1 py-0.5 font-bold uppercase text-accent">
                              Open
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Interactive Buttons (Duplicate, Delete, Edit) */}
                      <div className="flex justify-end gap-2 border-t border-border pt-2.5">
                        <button
                          type="button"
                          onClick={() => handleDuplicateIssue(issue)}
                          className="flex items-center gap-1 text-slate-500 hover:text-accent px-2 py-1 text-xs font-semibold"
                          title="Duplicate Issue"
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleDeleteIssue(issue)}
                          className="flex items-center gap-1 text-slate-500 hover:text-rose-600 px-2 py-1 text-xs font-semibold"
                          title="Delete Issue"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                        <Link
                          href={`/issue?roomId=${roomIdParam}&projectId=${projectId}&issueId=${issue.id}`}
                          className="flex items-center gap-1 text-accent hover:underline px-2 py-1 text-xs font-bold"
                          title="Edit Issue"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Floating Action Button (FAB) to Add Issue */}
          <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-end px-6 pointer-events-none">
            <Link
              href={`/issue?roomId=${roomIdParam}&projectId=${projectId}`}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-gradient-from to-gradient-to text-white shadow-xl shadow-accent-glow hover:bg-accent ripple pointer-events-auto"
              aria-label="Add Inspection Issue"
            >
              <Plus className="h-7 w-7" />
            </Link>
          </div>
        </div>
      ) : (
        
        // 2. ROOM HIERARCHY SELECTOR SCREEN — with on-the-fly creation
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6 pb-24 min-h-0">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">
                {activeProject?.buildingName || 'Project'}
              </span>
              <h2 className="text-base font-bold text-foreground">
                {activeProject ? activeProject.name : 'Select Location'}
              </h2>
            </div>
          </div>

          {/* Step-by-step location entry */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Select or Create Location
            </h3>

            {/* 1. Wing — Select existing or type new */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-accent" /> 1. Wing / Zone
              </label>
              
              {/* Existing wings as selectable chips */}
              {wings && wings.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {wings.map(w => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        setSelectedWing(w.id);
                        setSelectedFloor('');
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedWing === w.id
                          ? 'bg-gradient-to-r from-gradient-from to-gradient-to text-white border-accent shadow-sm shadow-accent-glow'
                          : 'bg-surface border-border text-foreground hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Create new wing inline */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWingName}
                  onChange={(e) => setNewWingName(e.target.value)}
                  placeholder="New wing name (e.g. Zone A, North Wing)"
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-surface px-3 py-2.5 text-xs text-foreground placeholder-slate-400 focus:border-accent focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWing()}
                />
                <button
                  type="button"
                  onClick={handleCreateWing}
                  disabled={!newWingName.trim() || creatingEntry}
                  className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-gradient-from to-gradient-to text-white text-xs font-bold disabled:opacity-40 hover:bg-accent flex items-center gap-1 ripple"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            {/* 2. Floor — Select existing or type new */}
            <div className={`space-y-2 transition-opacity ${selectedWing ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-accent" /> 2. Floor
              </label>
              
              {floors && floors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {floors.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelectedFloor(f.id);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedFloor === f.id
                          ? 'bg-gradient-to-r from-gradient-from to-gradient-to text-white border-accent shadow-sm shadow-accent-glow'
                          : 'bg-surface border-border text-foreground hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  placeholder="New floor name (e.g. Ground Floor, Floor 12)"
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-surface px-3 py-2.5 text-xs text-foreground placeholder-slate-400 focus:border-accent focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFloor()}
                />
                <button
                  type="button"
                  onClick={handleCreateFloor}
                  disabled={!newFloorName.trim() || !selectedWing || creatingEntry}
                  className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-gradient-from to-gradient-to text-white text-xs font-bold disabled:opacity-40 hover:bg-accent flex items-center gap-1 ripple"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Go Button after selecting/adding a floor */}
            {selectedFloor && (
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => handleGoToFloor(selectedFloor)}
                  disabled={creatingEntry}
                  className="w-full h-11 rounded-2xl bg-gradient-to-r from-gradient-from to-gradient-to text-white font-semibold text-xs shadow hover:bg-accent transition-all flex items-center justify-center gap-1.5 ripple"
                >
                  Go <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Dialog */}
      {issueToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface p-6 border border-border shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 mx-auto animate-bounce">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Delete Issue?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-2">
                Are you sure you want to permanently delete <span className="font-semibold text-foreground">"{issueToDelete.title}"</span>? This will remove all annotated inspection photos and cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIssueToDelete(null)}
                className="flex-1 h-10 rounded-xl border border-border text-slate-600 dark:text-slate-400 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 h-10 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 shadow transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
