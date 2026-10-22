import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Search, Factory, Building2, Check, ChevronDown, Tag, Trash2, Workflow, Sparkles, CheckCircle2 } from 'lucide-react';
import { CorrugationJob, JobPlacement, JobProcessStep } from '../types/job';
import {
  subscribeToJobProcesses,
  addJobProcessToFirestore,
  deleteJobProcessFromFirestore,
} from '../firebase/db';

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveJob: (job: Omit<CorrugationJob, 'id' | 'createdAt' | 'status'>) => void;
  availableTypes: string[];
  onAddNewType: (newType: string) => void;
  onDeleteType?: (type: string) => void;
}

export const NewJobModal: React.FC<NewJobModalProps> = ({
  isOpen,
  onClose,
  onSaveJob,
  availableTypes,
  onAddNewType,
  onDeleteType,
}) => {
  const [jobName, setJobName] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [placement, setPlacement] = useState<JobPlacement>('Factory');
  const [notes, setNotes] = useState('');
  const [jobDate, setJobDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedProcesses, setSelectedProcesses] = useState<JobProcessStep[]>([]);
  const [customProcessInput, setCustomProcessInput] = useState('');
  const [savedProcesses, setSavedProcesses] = useState<string[]>([]);
  const [processSearch, setProcessSearch] = useState('');

  // Subscribe to real-time custom job processes from Firestore
  useEffect(() => {
    const unsub = subscribeToJobProcesses((list) => {
      setSavedProcesses(list);
    });
    return () => unsub();
  }, []);
  
  // Job Type Search & Add state
  const [typeSearch, setTypeSearch] = useState('');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');
  const [isAddingCustomType, setIsAddingCustomType] = useState(availableTypes.length === 0);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteConfirmType, setDeleteConfirmType] = useState<string | null>(null);

  // Filter types based on search
  const filteredTypes = useMemo(() => {
    if (!typeSearch.trim()) return availableTypes;
    return availableTypes.filter((t) =>
      t.toLowerCase().includes(typeSearch.trim().toLowerCase())
    );
  }, [availableTypes, typeSearch]);

  // Filter saved processes based on search
  const filteredSavedProcesses = useMemo(() => {
    if (!processSearch.trim()) return savedProcesses;
    return savedProcesses.filter((p) =>
      p.toLowerCase().includes(processSearch.trim().toLowerCase())
    );
  }, [savedProcesses, processSearch]);

  if (!isOpen) return null;

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    setIsTypeDropdownOpen(false);
    setTypeSearch('');
    setErrorMessage('');
  };

  const handleAddNewType = (typeToAdd?: string) => {
    const raw = (typeToAdd || newTypeInput).trim();
    if (!raw) return;

    // Check if it already exists case-insensitively
    const existing = availableTypes.find(
      (t) => t.toLowerCase() === raw.toLowerCase()
    );

    if (existing) {
      setSelectedType(existing);
    } else {
      onAddNewType(raw);
      setSelectedType(raw);
    }

    setNewTypeInput('');
    setIsAddingCustomType(false);
    setIsTypeDropdownOpen(false);
    setTypeSearch('');
  };

  const handleAddProcess = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (selectedProcesses.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    const newStep: JobProcessStep = {
      id: `proc_${Date.now()}_${selectedProcesses.length + 1}`,
      name: trimmed,
      completed: false,
      sequence: selectedProcesses.length + 1,
    };
    setSelectedProcesses((prev) => [...prev, newStep]);
    setCustomProcessInput('');
  };

  const handleSaveAndAddProcess = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addJobProcessToFirestore(trimmed);
    handleAddProcess(trimmed);
  };

  const handleSaveOnlyProcess = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addJobProcessToFirestore(trimmed);
    setCustomProcessInput('');
  };

  const handleDeleteSavedProcess = async (pToDelete: string) => {
    await deleteJobProcessFromFirestore(pToDelete);
  };

  const handleRemoveProcess = (id: string) => {
    setSelectedProcesses((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddAllSavedProcesses = () => {
    savedProcesses.forEach((name) => {
      if (!selectedProcesses.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        handleAddProcess(name);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobName.trim()) {
      setErrorMessage('Please enter a Job Name.');
      return;
    }
    if (!selectedType.trim()) {
      setErrorMessage('Please select or add a Job Type.');
      return;
    }

    onSaveJob({
      jobName: jobName.trim(),
      jobType: selectedType.trim(),
      jobPlacement: placement,
      notes: notes.trim() || undefined,
      createdAt: `${jobDate} 12:00`,
      processes: selectedProcesses.length > 0 ? selectedProcesses : undefined,
    } as any);

    // Reset fields
    setJobName('');
    setSelectedType('');
    setPlacement('Factory');
    setNotes('');
    setSelectedProcesses([]);
    setCustomProcessInput('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-white">Create New Job</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* 1. Job Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Job Name <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={jobName}
              onChange={(e) => {
                setJobName(e.target.value);
                setErrorMessage('');
              }}
              placeholder="e.g. 5-Ply Master Carton Production Batch 102"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Job Date <span className="text-amber-400">*</span>
            </label>
            <input
              type="date"
              required
              value={jobDate}
              onChange={(e) => setJobDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500 [color-scheme:dark]"
            />
          </div>

          {/* 2. Job Type (Search, Select, and Add Type) */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Job Type <span className="text-amber-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCustomType(!isAddingCustomType);
                  setIsTypeDropdownOpen(false);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingCustomType ? 'Select from list' : 'Add new type'}</span>
              </button>
            </div>

            {/* Quick add custom type input bar */}
            {isAddingCustomType ? (
              <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2 mb-2">
                <div className="text-[11px] text-amber-400 font-medium">Add a new Job Type to the plant list:</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTypeInput}
                    onChange={(e) => setNewTypeInput(e.target.value)}
                    placeholder="Enter new custom job type name..."
                    autoFocus
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewType();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddNewType()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Add Type
                  </button>
                </div>
              </div>
            ) : null}

            {/* Type Selector Dropdown Trigger */}
            <div
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm flex items-center justify-between cursor-pointer transition-colors ${
                isTypeDropdownOpen ? 'border-amber-500' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                <span className={selectedType ? 'text-slate-100 font-medium' : 'text-slate-500'}>
                  {selectedType || 'Search and select job type...'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Panel with Search & Filter */}
            {isTypeDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-2">
                
                {/* Search input */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                    placeholder="Search existing job types..."
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Types List - Only shows saved items */}
                <div className="max-h-48 overflow-y-auto space-y-1">
                  <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 mb-1">
                    <span>Saved Job Types ({filteredTypes.length})</span>
                    {typeSearch && <span>Filter: "{typeSearch}"</span>}
                  </div>

                  {filteredTypes.length > 0 ? (
                    filteredTypes.map((type) => (
                      <div
                        key={type}
                        className={`px-3 py-2 text-xs rounded-lg flex items-center justify-between cursor-pointer transition-colors group ${
                          selectedType === type
                            ? 'bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div 
                          onClick={() => handleSelectType(type)}
                          className="flex-1 flex items-center gap-2 truncate"
                        >
                          <span className="truncate">{type}</span>
                          {selectedType === type && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>

                        {onDeleteType && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmType(type);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 rounded transition-colors opacity-70 group-hover:opacity-100 ml-2"
                            title={`Delete saved type "${type}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      {availableTypes.length === 0 ? (
                        <>
                          <span className="font-semibold text-slate-300 block mb-1">0 Saved Job Types</span>
                          <span>No job types saved yet. Use the "Add new type" box above to add your first job type.</span>
                        </>
                      ) : (
                        <>
                          <span>No saved job types match "{typeSearch}".</span>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Only saved items are shown in search.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Job Placement (Factory vs Office) */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Job Placement <span className="text-amber-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1: Factory */}
              <button
                type="button"
                onClick={() => setPlacement('Factory')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  placement === 'Factory'
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  placement === 'Factory' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Factory className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Factory</div>
                  <div className="text-[10px] text-slate-400">Corrugator floor & converting lines</div>
                </div>
              </button>

              {/* Option 2: Office */}
              <button
                type="button"
                onClick={() => setPlacement('Office')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  placement === 'Office'
                    ? 'bg-blue-500/10 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  placement === 'Office' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Office</div>
                  <div className="text-[10px] text-slate-400">Admin, billing, estimation & dispatch</div>
                </div>
              </button>
            </div>
          </div>

          {/* Manufacturing Processes Pipeline (Custom Type & Save, No Hardcoded Suggestions) */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-teal-400 uppercase tracking-wide flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5" />
                <span>Manufacturing Processes Pipeline ({selectedProcesses.length})</span>
              </label>
              {savedProcesses.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddAllSavedProcesses}
                  className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  title="Add all your saved processes to this job"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Add All Saved ({savedProcesses.length})</span>
                </button>
              )}
            </div>

            {/* Input to type custom process with Save and Add actions */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customProcessInput}
                  onChange={(e) => setCustomProcessInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (customProcessInput.trim()) {
                        handleSaveAndAddProcess(customProcessInput);
                      }
                    }
                  }}
                  placeholder="Type new process (e.g. UV Coating, Pasting, Stitching)..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!customProcessInput.trim()}
                    onClick={() => handleSaveOnlyProcess(customProcessInput)}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1 shrink-0"
                    title="Save process permanently to your list without adding to job right now"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Save Process</span>
                  </button>
                  <button
                    type="button"
                    disabled={!customProcessInput.trim()}
                    onClick={() => handleSaveAndAddProcess(customProcessInput)}
                    className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1 shrink-0 shadow-sm"
                    title="Save process to your list and add as step to this job"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save & Add Step</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Processes Section (Type & Save first, then select) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Your Saved Processes ({savedProcesses.length})
                </span>
                {savedProcesses.length > 3 && (
                  <div className="relative w-44">
                    <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1.5" />
                    <input
                      type="text"
                      value={processSearch}
                      onChange={(e) => setProcessSearch(e.target.value)}
                      placeholder="Search saved..."
                      className="w-full pl-6 pr-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                )}
              </div>

              {savedProcesses.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-900/60 rounded-xl border border-slate-800/60">
                  {filteredSavedProcesses.map((processName) => {
                    const isSelected = selectedProcesses.some(
                      (p) => p.name.toLowerCase() === processName.toLowerCase()
                    );
                    return (
                      <div
                        key={processName}
                        className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-teal-950/70 text-teal-300 border-teal-700/80 shadow-xs'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-teal-500/60 hover:text-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleAddProcess(processName)}
                          className="cursor-pointer flex items-center gap-1"
                          title={isSelected ? 'Already added to job' : `Add "${processName}" to job`}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3 text-teal-400" />
                          ) : (
                            <Plus className="w-3 h-3 text-teal-400" />
                          )}
                          <span>{processName}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSavedProcess(processName);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors opacity-70 group-hover:opacity-100 cursor-pointer ml-1"
                          title={`Delete "${processName}" from saved processes`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {filteredSavedProcesses.length === 0 && processSearch && (
                    <div className="p-2 text-[11px] text-slate-400">
                      No saved processes match "{processSearch}".
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-400">
                    No processes saved yet.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Type your process above and click <strong className="text-teal-400">Save Process</strong> or <strong className="text-teal-400">Save & Add Step</strong> to build your factory's custom process list.
                  </p>
                </div>
              )}
            </div>

            {/* Selected Processes Pills */}
            {selectedProcesses.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                {selectedProcesses.map((proc, idx) => (
                  <span
                    key={proc.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-950/50 border border-teal-800/70 text-teal-200 text-xs font-medium"
                  >
                    <span className="font-mono text-[10px] text-teal-400">#{idx + 1}</span>
                    <span>{proc.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProcess(proc.id)}
                      className="text-slate-400 hover:text-rose-400 cursor-pointer ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4. Notes / Specification Details */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Additional Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Flute type C, 300 GSM Kraft top liner, order quantity 5,000 pcs..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save as Pending Job</span>
            </button>
          </div>

        </form>

      </div>

      {/* CONFIRMATION MODAL FOR DELETING JOB TYPE */}
      {deleteConfirmType && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Job Type?</h3>
                <p className="text-xs text-slate-400">Permanently removes from saved list</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete <strong>"{deleteConfirmType}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmType(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteType && deleteConfirmType) {
                    if (selectedType === deleteConfirmType) setSelectedType('');
                    onDeleteType(deleteConfirmType);
                  }
                  setDeleteConfirmType(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                Delete Job Type
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
