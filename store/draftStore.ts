import { create } from 'zustand';
import { db } from '@/database/db';
import { logger } from '@/utils/logger';

export interface DraftIssue {
  id: string; // Temp issue ID
  roomId: string;
  projectId: string;
  buildingId: string;
  wingId: string;
  floorId: string;
  title: string;
  category: string;
  subCategory: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | 'Cosmetic';
  description: string;
  remarks: string;
  status: 'draft';
  gps?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  photos: string[]; // List of Photo IDs (stored in Dexie)
  createdDate: number;
  createdBy: string;
}

interface DraftState {
  activeDraft: DraftIssue | null;
  setDraftField: <K extends keyof DraftIssue>(field: K, value: DraftIssue[K]) => void;
  initializeNewDraft: (roomId: string, projectId: string, buildingId: string, wingId: string, floorId: string, username: string) => void;
  loadDraftFromStorage: () => DraftIssue | null;
  saveDraftToStorage: (draft: DraftIssue) => void;
  discardDraft: () => Promise<void>;
  saveDraftAsIssue: () => Promise<void>;
}

const LOCAL_STORAGE_KEY = 'inspection_active_draft';

export const useDraftStore = create<DraftState>((set, get) => ({
  activeDraft: null,

  setDraftField: (field, value) => {
    const { activeDraft } = get();
    if (!activeDraft) return;

    const updated = { ...activeDraft, [field]: value };
    set({ activeDraft: updated });
    get().saveDraftToStorage(updated);
  },

  initializeNewDraft: (roomId, projectId, buildingId, wingId, floorId, username) => {
    const newDraft: DraftIssue = {
      id: `draft-${Date.now()}`,
      roomId,
      projectId,
      buildingId,
      wingId,
      floorId,
      title: '',
      category: '',
      subCategory: '',
      priority: 'Medium',
      description: '',
      remarks: '',
      status: 'draft',
      photos: [],
      createdDate: Date.now(),
      createdBy: username,
    };
    set({ activeDraft: newDraft });
    get().saveDraftToStorage(newDraft);
  },

  loadDraftFromStorage: () => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const draft = JSON.parse(stored) as DraftIssue;
        set({ activeDraft: draft });
        return draft;
      } catch (e) {
        logger.error('Failed to parse draft from localStorage', e);
      }
    }
    return null;
  },

  saveDraftToStorage: (draft) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft));
  },

  discardDraft: async () => {
    const { activeDraft } = get();
    if (activeDraft) {
      // Clean up photos associated with this draft in IndexedDB
      if (activeDraft.photos.length > 0) {
        await db.photos.bulkDelete(activeDraft.photos);
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    set({ activeDraft: null });
  },

  saveDraftAsIssue: async () => {
    const { activeDraft } = get();
    if (!activeDraft) return;

    // Save issue to Dexie database with status = pending
    await db.issues.add({
      ...activeDraft,
      status: 'pending', // Save as pending for sync
      createdDate: Date.now() // Set actual submit timestamp
    });

    // Update pending issue count for project
    const project = await db.projects.get(activeDraft.projectId);
    if (project) {
      await db.projects.update(activeDraft.projectId, {
        pendingIssues: (project.pendingIssues || 0) + 1,
        lastUpdated: Date.now()
      });
    }

    // Clean up local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    set({ activeDraft: null });
  }
}));
