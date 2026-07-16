'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Issue, Photo, DefectTemplate } from '@/database/db';
import { useAuthStore } from '@/store/authStore';
import { useDraftStore, DraftIssue } from '@/store/draftStore';
import { useLicenseStore, canCreateInspection } from '@/store/licenseStore';
import CameraCapture from '@/components/CameraCapture';
import PhotoAnnotation from '@/components/PhotoAnnotation';
import { 
  ArrowLeft, Save, MapPin, Sparkles, Plus, 
  HelpCircle, Mic, CheckCircle, Navigation, ExternalLink, X, ShieldOff 
} from 'lucide-react';

const CATEGORIES = [
  'Civil', 'Carpentry', 'Electrical', 'HVAC', 'Mechanical', 'Plumbing', 
  'Painting', 'Fire Fighting', 'Fire Alarm', 'Ceiling', 'Doors', 
  'Windows', 'Glass', 'Furniture', 'Flooring', 'Housekeeping', 'Safety', 'Other'
];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low', 'Cosmetic'];

export default function IssuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
  if (!user) return null;
  
  const roomId = searchParams.get('roomId') || '';
  const projectId = searchParams.get('projectId') || '';
  const issueId = searchParams.get('issueId') || ''; // Set if editing existing issue
  const draftIdParam = searchParams.get('draftId') || ''; // Set if resuming draft

  // Zustand draft state
  const { 
    activeDraft, initializeNewDraft, setDraftField, 
    loadDraftFromStorage, saveDraftAsIssue, discardDraft 
  } = useDraftStore();

  // Database queries
  const roomDetails = useLiveQuery(() => db.rooms.get(roomId), [roomId]);
  const templates = useLiveQuery(() => db.templates.toArray());

  // Editing state (if editing already saved issue)
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  
  // Track if form has been loaded/initialized to prevent sync loops
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  
  // Form container ref for scrolling
  const formRef = useRef<HTMLFormElement>(null);

  // Form Field local states (bind to activeDraft or editingIssue)
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low' | 'Cosmetic'>('Medium');
  const [description, setDescription] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'pending' | 'completed' | 'draft'>('pending');
  const [gps, setGps] = useState<{ latitude: number; longitude: number; accuracy: number; timestamp: number } | undefined>(undefined);
  const [photos, setPhotos] = useState<{ id: string; originalUrl: string; annotatedUrl: string; annotationsJson: string }[]>([]);

  // Navigation overlays
  const [activeAnnotationIdx, setActiveAnnotationIdx] = useState<number | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

  // Initial Form Seeding and Autosave Listeners
  useEffect(() => {
    if (!user) return;

    const setupForm = async () => {
      // SCENARIO 1: EDITING AN EXISTING PREVIOUSLY SUBMITTED ISSUE
      if (issueId) {
        const issue = await db.issues.get(issueId);
        if (issue) {
          setEditingIssue(issue);
          setTitle(issue.title);
          setCategory(issue.category);
          setSubCategory(issue.subCategory);
          setPriority(issue.priority);
          setDescription(issue.description);
          setRemarks(issue.remarks);
          setStatus(issue.status);
          setGps(issue.gps);
          
          // Load photos
          const pList = await db.photos.where({ issueId: issue.id }).toArray();
          setPhotos(pList.map(p => ({
            id: p.id,
            originalUrl: p.originalUrl,
            annotatedUrl: p.annotatedUrl,
            annotationsJson: p.annotationsJson
          })));
        }
      } 
      // SCENARIO 2: RESUMING DRAFT
      else if (draftIdParam && activeDraft) {
        syncDraftToLocalState(activeDraft);
      } 
      // SCENARIO 3: CREATING NEW DRAFT
      else if (roomId && roomDetails) {
        // Resolve hierarchy IDs from the room's floorId
        const floorRecord = await db.floors.get(roomDetails.floorId);
        const wingRecord = floorRecord ? await db.wings.get(floorRecord.wingId) : undefined;
        const buildingId = wingRecord?.buildingId || '';
        const wingId = floorRecord?.wingId || '';

        initializeNewDraft(
          roomId, 
          roomDetails.projectId, 
          buildingId, 
          wingId, 
          roomDetails.floorId, 
          user.name
        );
      }
    };
    setupForm();
  }, [issueId, roomId, roomDetails, draftIdParam, user]);

  // Sync draft fields to local react state when activeDraft changes (only on initial mount/load)
  useEffect(() => {
    if (activeDraft && !issueId && !isFormInitialized) {
      syncDraftToLocalState(activeDraft);
      setIsFormInitialized(true);
    }
  }, [activeDraft, issueId, isFormInitialized]);

  const syncDraftToLocalState = async (draft: DraftIssue) => {
    setTitle(draft.title);
    setCategory(draft.category);
    setSubCategory(draft.subCategory);
    setPriority(draft.priority);
    setDescription(draft.description);
    setRemarks(draft.remarks);
    setStatus('draft');
    setGps(draft.gps);
    
    // Load draft photos from Dexie
    const draftPhotos = await db.photos.where({ issueId: draft.id }).toArray();
    setPhotos(draftPhotos.map(p => ({
      id: p.id,
      originalUrl: p.originalUrl,
      annotatedUrl: p.annotatedUrl,
      annotationsJson: p.annotationsJson
    })));
  };

  // Debounced auto-save handler for text changes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleFieldChange = (field: keyof DraftIssue, value: any) => {
    if (issueId) {
      // Editing Mode - update local states directly, save only on submit
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      setDraftField(field, value);
    }, 1000); // 1-second debounce
  };

  // Trigger GPS Geolocation capture
  const captureGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your device.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp
        };
        setGps(coords);
        setGpsLoading(false);
        handleFieldChange('gps', coords);
      },
      (err) => {
        console.error('GPS Geolocation error', err);
        alert(`Failed to capture GPS: ${err.message}. You can still save the inspection.`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Photo updates handler (updates component and IndexedDB simultaneously)
  const handlePhotosChange = async (updatedPhotos: typeof photos) => {
    setPhotos(updatedPhotos);

    // Save photos to IndexedDB immediately for persistent drafts
    const targetIssueId = issueId || (activeDraft ? activeDraft.id : '');
    if (!targetIssueId) return;

    // 1. Sync list of photo references in the issue draft
    if (!issueId && activeDraft) {
      setDraftField('photos', updatedPhotos.map(p => p.id));
    }

    // 2. Put photos in Dexie DB
    for (const photo of updatedPhotos) {
      await db.photos.put({
        id: photo.id,
        issueId: targetIssueId,
        originalUrl: photo.originalUrl,
        annotatedUrl: photo.annotatedUrl,
        annotationsJson: photo.annotationsJson
      });
    }

    // Delete photos removed in the UI from the database
    const existingPhotoIds = updatedPhotos.map(p => p.id);
    const dbPhotos = await db.photos.where({ issueId: targetIssueId }).toArray();
    const photosToDelete = dbPhotos.filter(dp => !existingPhotoIds.includes(dp.id));
    if (photosToDelete.length > 0) {
      await db.photos.bulkDelete(photosToDelete.map(p => p.id));
    }
  };

  // Select a template, auto-populating fields
  const handleSelectTemplate = (tmpl: DefectTemplate) => {
    setTitle(tmpl.name);
    setCategory(tmpl.category);
    setSubCategory(tmpl.subCategory);
    setPriority(tmpl.priority);
    setDescription(tmpl.description);
    setRemarks(tmpl.recommendedAction);
    setShowTemplateModal(false);

    // Write to active draft instantly
    if (!issueId && activeDraft) {
      setDraftField('title', tmpl.name);
      setDraftField('category', tmpl.category);
      setDraftField('subCategory', tmpl.subCategory);
      setDraftField('priority', tmpl.priority);
      setDraftField('description', tmpl.description);
      setDraftField('remarks', tmpl.recommendedAction);
    }
  };

  // Save/Submit the form
  const handleSaveIssue = async (e: React.FormEvent) => {
    e.preventDefault();

    // License enforcement: block new issue creation if expired (editing existing is allowed)
    if (!issueId && !canCreateInspection()) {
      alert('Your subscription has expired or is inactive. You cannot create new inspections. Please renew your license.');
      return;
    }

    if (!title.trim() || !category) {
      alert('Description and Category are required.');
      return;
    }

    const photoIds = photos.map(p => p.id);

    // SCENARIO A: EDITING AN ALREADY SAVED ISSUE
    if (issueId && editingIssue) {
      await db.issues.update(issueId, {
        title: title.trim(),
        category,
        subCategory: subCategory.trim(),
        priority,
        description: description.trim(),
        remarks: remarks.trim(),
        status,
        gps,
        photos: photoIds
      });

      // Update project counts if status changed
      if (editingIssue.status !== status && projectId) {
        const proj = await db.projects.get(projectId);
        if (proj) {
          const updates: any = {};
          if (status === 'completed') {
            updates.completedIssues = (proj.completedIssues || 0) + 1;
            updates.pendingIssues = Math.max(0, (proj.pendingIssues || 0) - 1);
          } else {
            updates.pendingIssues = (proj.pendingIssues || 0) + 1;
            updates.completedIssues = Math.max(0, (proj.completedIssues || 0) - 1);
          }
          await db.projects.update(projectId, updates);
        }
      }
      router.push(`/room?projectId=${projectId}&roomId=${roomId}`);
    } 
    // SCENARIO B: SAVING NEW ISSUE FROM ACTIVE DRAFT
    else if (activeDraft) {
      // Write current local state to draft before saving
      const finalDraft: DraftIssue = {
        ...activeDraft,
        title: title.trim(),
        category,
        subCategory: subCategory.trim(),
        priority,
        description: description.trim(),
        remarks: remarks.trim(),
        gps,
        photos: photoIds
      };
      
      // Update active draft in store
      useDraftStore.setState({ activeDraft: finalDraft });
      
      // Save draft as issue
      await saveDraftAsIssue();
      router.push(`/room?projectId=${projectId}&roomId=${roomId}`);
    }
  };

  // Reset form while remaining in the same room selection for rapid issue batching
  const handleSaveAndAddAnother = async () => {
    if (!title.trim() || !category) {
      alert('Description and Category are required.');
      return;
    }

    const photoIds = photos.map(p => p.id);
    const targetRoomId = roomId || (activeDraft ? activeDraft.roomId : '');
    const targetProjId = projectId || (activeDraft ? activeDraft.projectId : '');

    // Save active issue
    if (activeDraft) {
      const finalDraft: DraftIssue = {
        ...activeDraft,
        title: title.trim(),
        category,
        subCategory: subCategory.trim(),
        priority,
        description: description.trim(),
        remarks: remarks.trim(),
        gps,
        photos: photoIds
      };
      useDraftStore.setState({ activeDraft: finalDraft });
      await saveDraftAsIssue();
    }

    // Reset local states for next issue
    setTitle('');
    setCategory('');
    setSubCategory('');
    setPriority('Medium');
    setDescription('');
    setRemarks('');
    setGps(undefined);
    setPhotos([]);

    // Initialize brand new draft for same room
    if (roomDetails && user) {
      const floorRecord = await db.floors.get(roomDetails.floorId);
      const wingRecord = floorRecord ? await db.wings.get(floorRecord.wingId) : undefined;
      const buildingId = wingRecord?.buildingId || '';
      const wingId = floorRecord?.wingId || '';

      // Reset initialization flag so the new draft can be synced once
      setIsFormInitialized(false);

      initializeNewDraft(
        roomDetails.id, 
        roomDetails.projectId, 
        buildingId, 
        wingId, 
        roomDetails.floorId, 
        user.name
      );
    }

    // Scroll back to top of the form
    if (formRef.current) {
      formRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Filter templates list
  const filteredTemplates = templates?.filter(t => 
    t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(templateSearchQuery.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-1 flex-col bg-background h-[calc(100vh-7.5rem)] w-full overflow-hidden relative min-h-0">
      
      {/* Photo annotation full-screen modal */}
      {activeAnnotationIdx !== null && photos[activeAnnotationIdx] && (
        <PhotoAnnotation
          originalUrl={photos[activeAnnotationIdx].originalUrl}
          initialAnnotationsJson={photos[activeAnnotationIdx].annotationsJson}
          onSave={async (annotatedUrl, annotationsJson) => {
            const updated = [...photos];
            updated[activeAnnotationIdx] = {
              ...updated[activeAnnotationIdx],
              annotatedUrl,
              annotationsJson
            };
            await handlePhotosChange(updated);
            setActiveAnnotationIdx(null);
          }}
          onCancel={() => setActiveAnnotationIdx(null)}
        />
      )}

      {/* Templates overlay sheet */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-md rounded-t-3xl bg-surface p-6 border-t border-border shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar pb-8">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-foreground">Standard Defect Templates</h3>
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="text-xs text-slate-400 font-bold hover:underline"
              >
                Close
              </button>
            </div>
            
            <div className="relative rounded-xl shadow-sm">
              <input
                type="text"
                placeholder="Search templates..."
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-surface p-2.5 text-xs text-foreground focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              {filteredTemplates.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No templates match search.</p>
              ) : (
                filteredTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className="w-full text-left p-3 rounded-2xl border border-border bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-foreground block">{t.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Category: {t.category} • Priority: {t.priority}</span>
                    </div>
                    <span className="text-[10px] text-accent font-bold uppercase">Select</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-surface px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => {
              router.push(`/room?projectId=${projectId}&roomId=${roomId}`);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">
              {issueId ? 'Modify Defect' : 'New Defect'}
            </span>
            <h2 className="text-sm font-bold text-foreground truncate max-w-[200px]">
              {roomDetails ? `${roomDetails.number} Inspection` : 'Add Defect'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick template button */}
          {!issueId && (
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-1 rounded-full bg-accent-surface dark:bg-accent-surface-alt px-3 py-1.5 text-xs font-bold text-accent border border-accent-light/30 ripple"
            >
              <Sparkles className="h-3.5 w-3.5" /> Defect Template
            </button>
          )}

          {/* Close/Cancel button */}
          <button
            type="button"
            onClick={() => {
              router.push(`/room?projectId=${projectId}&roomId=${roomId}`);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 ripple"
            title="Cancel defect capture"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Form Content */}
      <form ref={formRef} onSubmit={handleSaveIssue} className="p-4 space-y-5 flex-1 overflow-y-auto no-scrollbar pb-24 min-h-0">
        
        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              handleFieldChange('title', e.target.value);
            }}
            placeholder="e.g. Broken wall socket panel"
            className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-xs text-foreground placeholder-slate-400 focus:border-accent focus:outline-none"
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Location</label>
          <input
            type="text"
            value={subCategory}
            onChange={(e) => {
              setSubCategory(e.target.value);
              handleFieldChange('subCategory', e.target.value);
            }}
            placeholder="e.g. Apt 4B, Room 101, Near main entrance..."
            className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-4 py-3 text-xs text-foreground placeholder-slate-400 focus:border-accent focus:outline-none"
          />
        </div>

        {/* Category Selector (as buttons) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
          <div className="flex flex-wrap gap-2">
            {['Mechanical', 'Electrical', 'Plumbing', 'Hvac', 'Civil', 'ELV', 'FF & FA', 'HSE'].map(cat => {
              const isSelected = category.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat);
                    handleFieldChange('category', cat);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-gradient-from to-gradient-to border-accent text-white shadow-sm shadow-accent-glow'
                      : 'bg-surface border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority Level</label>
          <div className="grid grid-cols-5 gap-1.5">
            {PRIORITIES.map(pr => {
              const isSelected = priority === pr;
              return (
                <button
                  key={pr}
                  type="button"
                  onClick={() => {
                    setPriority(pr as any);
                    handleFieldChange('priority', pr);
                  }}
                  className={`py-2 rounded-xl text-[10px] font-bold text-center border transition-all ${
                    isSelected
                      ? pr === 'Critical' ? 'bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-500/20' :
                        pr === 'High' ? 'bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/20' :
                        pr === 'Medium' ? 'bg-yellow-500 border-yellow-500 text-slate-900 shadow-sm shadow-yellow-500/20' :
                        pr === 'Low' ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20' :
                        'bg-slate-600 border-slate-600 text-white shadow-sm shadow-slate-500/20'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {pr}
                </button>
              );
            })}
          </div>
        </div>



        {/* Form Status Guard (Only Auditors/Inspectors can approve, Technicians submit as pending) */}
        {issueId && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Inspection Status</label>
            <select
              disabled={user?.role === 'Technician'}
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface px-3 py-3 text-xs text-foreground focus:outline-none disabled:opacity-50"
            >
              <option value="pending">Open (Pending Resolution)</option>
              <option value="completed">Resolved (Completed/Approved)</option>
            </select>
            {user?.role === 'Technician' && (
              <p className="text-[10px] text-slate-400 italic">Technicians can only submit issues as Open. Auditors/Inspectors resolve them.</p>
            )}
          </div>
        )}



        {/* Photos grid */}
        <CameraCapture
          photoUrls={photos}
          onChange={handlePhotosChange}
          onAnnotateTapped={(idx) => setActiveAnnotationIdx(idx)}
        />

        {/* Voice Notes Placeholder */}
        <div className="flex h-11 items-center justify-between rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 px-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Mic className="h-4 w-4" /> Voice Notes (Future Ready)
          </span>
          <span className="text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-400">
            SOON
          </span>
        </div>

        {/* Save button panel */}
        <div className="flex flex-col gap-2.5 pt-4">
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-gradient-from to-gradient-to text-white text-sm font-semibold hover:bg-accent shadow-md ripple"
          >
            <CheckCircle className="h-4 w-4" /> 
            {issueId ? 'Save Edits' : 'Save & Close'}
          </button>

          {!issueId && (
            <button
              type="button"
              onClick={handleSaveAndAddAnother}
              className="flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl border border-accent-light/30 text-accent text-sm font-semibold hover:bg-accent-surface ripple"
            >
              <Plus className="h-4 w-4" /> Save & Inspect Another Defect
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              router.push(`/room?projectId=${projectId}&roomId=${roomId}`);
            }}
            className="flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl border border-transparent text-slate-500 dark:text-slate-400 text-xs font-bold hover:underline ripple mt-1"
          >
            Cancel and Return
          </button>
        </div>

      </form>
    </div>
  );
}
