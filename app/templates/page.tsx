'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DefectTemplate } from '@/database/db';
import { useAuthStore } from '@/store/authStore';
import { 
  Search, Star, Trash2, Plus, Edit, 
  Sparkles, CheckCircle2, X, Clipboard 
} from 'lucide-react';

const CATEGORIES = [
  'Civil', 'Carpentry', 'Electrical', 'HVAC', 'Mechanical', 'Plumbing', 
  'Painting', 'Fire Fighting', 'Fire Alarm', 'Ceiling', 'Doors', 
  'Windows', 'Glass', 'Furniture', 'Flooring', 'Housekeeping', 'Safety', 'Other'
];

export default function TemplatesPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal editor states
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DefectTemplate | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low' | 'Cosmetic'>('Medium');
  const [description, setDescription] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('');
  const [department, setDepartment] = useState('');

  // Queries
  const templates = useLiveQuery(() => db.templates.toArray());

  if (!user) return null;

  const handleToggleFavorite = async (tmpl: DefectTemplate) => {
    const nextFav = tmpl.isFavorite === 1 ? 0 : 1;
    await db.templates.update(tmpl.id, { isFavorite: nextFav });
  };

  const handleOpenCreateModal = () => {
    const isAuditorOrInspector = user.role === 'Auditor' || user.role === 'Inspector';
    if (!isAuditorOrInspector) {
      alert('Only Auditors or Inspectors can create new templates.');
      return;
    }
    setEditingTemplate(null);
    setName('');
    setCategory('Civil');
    setSubCategory('');
    setPriority('Medium');
    setDescription('');
    setRecommendedAction('');
    setDepartment('');
    setShowModal(true);
  };

  const handleOpenEditModal = (tmpl: DefectTemplate) => {
    const isAuditorOrInspector = user.role === 'Auditor' || user.role === 'Inspector';
    if (!isAuditorOrInspector) {
      alert('Only Auditors or Inspectors can modify templates.');
      return;
    }
    setEditingTemplate(tmpl);
    setName(tmpl.name);
    setCategory(tmpl.category);
    setSubCategory(tmpl.subCategory);
    setPriority(tmpl.priority);
    setDescription(tmpl.description);
    setRecommendedAction(tmpl.recommendedAction);
    setDepartment(tmpl.department);
    setShowModal(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    const isAuditorOrInspector = user.role === 'Auditor' || user.role === 'Inspector';
    if (!isAuditorOrInspector) {
      alert('Only Auditors or Inspectors can delete templates.');
      return;
    }
    if (confirm('Permanently delete this defect template?')) {
      await db.templates.delete(id);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category) return;

    if (editingTemplate) {
      // Update
      await db.templates.update(editingTemplate.id, {
        name: name.trim(),
        category,
        subCategory: subCategory.trim(),
        priority,
        description: description.trim(),
        recommendedAction: recommendedAction.trim(),
        department: department.trim()
      });
    } else {
      // Add
      await db.templates.add({
        id: `tmpl-${Date.now()}`,
        name: name.trim(),
        category,
        subCategory: subCategory.trim(),
        priority,
        description: description.trim(),
        recommendedAction: recommendedAction.trim(),
        department: department.trim(),
        status: 'pending',
        isFavorite: 0
      });
    }

    setShowModal(false);
  };

  // Filter templates list
  const filteredTemplates = templates?.filter(t => {
    const query = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  }).sort((a, b) => b.isFavorite - a.isFavorite) || []; // Favorites bubble to top

  const isRoleAuthorized = user.role === 'Auditor' || user.role === 'Inspector';

  return (
    <div className="flex flex-1 flex-col bg-background h-full w-full overflow-hidden relative min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4 pb-24 min-h-0">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">Defect Engine</span>
          <h2 className="text-lg font-black text-foreground">Standard Templates</h2>
        </div>
        
        {isRoleAuthorized && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-gradient-from to-gradient-to px-3 py-2 text-xs font-semibold text-white shadow hover:bg-accent transition-colors ripple"
          >
            <Plus className="h-4 w-4" /> Create
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative rounded-2xl shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by defect type or category..."
          className="block w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-surface pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-slate-400 focus:outline-none transition-all"
        />
      </div>

      {/* Templates List */}
      <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <Clipboard className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-semibold">No templates found matching your query.</p>
          </div>
        ) : (
          filteredTemplates.map(tmpl => (
            <div
              key={tmpl.id}
              className="p-4 rounded-3xl border border-border bg-surface shadow-sm space-y-3 relative group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-accent uppercase">
                    {tmpl.category} {tmpl.subCategory && `• ${tmpl.subCategory}`}
                  </span>
                  <h4 className="text-sm font-bold text-foreground mt-0.5">{tmpl.name}</h4>
                </div>
                
                {/* Actions: Favorite Star and Delete/Edit */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleFavorite(tmpl)}
                    className="p-1 rounded-lg text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Toggle Favorite"
                  >
                    <Star className={`h-4.5 w-4.5 ${tmpl.isFavorite === 1 ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p><span className="font-semibold text-slate-600 dark:text-slate-300">Description:</span> {tmpl.description}</p>
                {tmpl.recommendedAction && (
                  <p><span className="font-semibold text-slate-600 dark:text-slate-300">Corrective:</span> {tmpl.recommendedAction}</p>
                )}
                <div className="flex gap-4 pt-1 text-[10px] text-slate-400">
                  <span>Dept: <span className="font-semibold">{tmpl.department || 'General'}</span></span>
                  <span>Priority: <span className={`font-semibold ${
                    tmpl.priority === 'Critical' ? 'text-rose-500' :
                    tmpl.priority === 'High' ? 'text-orange-500' :
                    tmpl.priority === 'Medium' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-blue-500'
                  }`}>{tmpl.priority}</span></span>
                </div>
              </div>

              {/* Edit/Delete Actions (Only for Authorized) */}
              {isRoleAuthorized && (
                <div className="flex justify-end gap-2 border-t border-border pt-2">
                  <button
                    onClick={() => handleOpenEditModal(tmpl)}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-accent font-bold px-2 py-1"
                  >
                    <Edit className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-rose-600 font-bold px-2 py-1"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Editor Modal Bottom Sheet */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <form 
            onSubmit={handleSaveTemplate}
            className="w-full max-w-md rounded-t-3xl bg-surface p-6 border-t border-border shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar pb-8"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-foreground">
                {editingTemplate ? 'Modify Template' : 'New Defect Template'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Template Title</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Exposed Copper Wiring"
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface p-2.5 text-foreground focus:outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Sub-Category</label>
                  <input
                    type="text"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    placeholder="e.g. Cables"
                    className="w-full rounded-xl border border-border bg-surface p-2.5 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Default Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-surface p-2.5 text-foreground focus:outline-none"
                  >
                    {['Critical', 'High', 'Medium', 'Low', 'Cosmetic'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Assigned Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Electricians"
                    className="w-full rounded-xl border border-border bg-surface p-2.5 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Standard Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Standard text to prefill issue descriptions..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-foreground focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Recommended Correction</label>
                <textarea
                  value={recommendedAction}
                  onChange={(e) => setRecommendedAction(e.target.value)}
                  placeholder="Standard repair instructions..."
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-foreground focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-gradient-to-r from-gradient-from to-gradient-to text-white font-semibold text-xs shadow hover:bg-accent transition-colors flex items-center justify-center gap-1.5 ripple"
              >
                <CheckCircle2 className="h-4 w-4" /> Save Template
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </div>
  );
}
