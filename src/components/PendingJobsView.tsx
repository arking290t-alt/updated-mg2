import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  Factory, 
  Building2, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Tag, 
  Calendar,
  Layers,
  AlertCircle,
  AlertTriangle,
  X,
  MoreVertical,
  Eye,
  Printer,
  Flame,
  CheckCircle2,
  ExternalLink,
  FileText
} from 'lucide-react';
import { CorrugationJob, InventoryItem, JobPlacement, JobStatus } from '../types/job';

interface PendingJobsViewProps {
  jobs: CorrugationJob[];
  inventory?: InventoryItem[];
  onOpenNewJobModal: () => void;
  onSetJobStatus: (jobId: string, status: JobStatus) => void;
  onDeleteJob: (jobId: string) => void;
  onOrderInventoryForJob: (job: CorrugationJob) => void;
  onUpdateInventoryDetails?: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  onUpdateJobDetails?: (jobId: string, updates: Partial<CorrugationJob>) => Promise<void>;
}

interface StatusConfirmationState {
  job: CorrugationJob;
  targetStatus: 'Completed' | 'Not Completed';
}

export const PendingJobsView: React.FC<PendingJobsViewProps> = ({
  jobs,
  inventory = [],
  onOpenNewJobModal,
  onSetJobStatus,
  onDeleteJob,
  onOrderInventoryForJob,
  onUpdateInventoryDetails,
  onUpdateJobDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Not Completed' | 'Completed'>('All');
  const [placementFilter, setPlacementFilter] = useState<'All' | JobPlacement>('All');

  // Confirmation state for marking completed / not completed
  const [confirmStatusModal, setConfirmStatusModal] = useState<StatusConfirmationState | null>(null);
  // Delete confirmation state
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<CorrugationJob | null>(null);
  // 3-dot Menu & Job Detail Modal State
  const [activeMenuJobId, setActiveMenuJobId] = useState<string | null>(null);
  const [detailModalJob, setDetailModalJob] = useState<CorrugationJob | null>(null);

  // Separate Popup Box state for clicked ordered inventory or press detail
  const [selectedInventoryItemPopup, setSelectedInventoryItemPopup] = useState<InventoryItem | null>(null);
  const [selectedPressDetailPopup, setSelectedPressDetailPopup] = useState<CorrugationJob | null>(null);

  // Filter jobs based on search, status, and placement
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.jobName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.notes && job.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'All'
        ? job.status !== 'Completed' // Default shows non-completed jobs
        : job.status === statusFilter;

    const matchesPlacement =
      placementFilter === 'All' || job.jobPlacement === placementFilter;

    return matchesSearch && matchesStatus && matchesPlacement;
  });

  const notCompletedCount = jobs.filter((j) => j.status === 'Not Completed').length;
  const pendingCount = jobs.filter((j) => j.status === 'Pending').length;
  const completedCount = jobs.filter((j) => j.status === 'Completed').length;

  // Confirm and apply status change
  const handleConfirmStatusChange = () => {
    if (!confirmStatusModal) return;
    onSetJobStatus(confirmStatusModal.job.id, confirmStatusModal.targetStatus);
    setConfirmStatusModal(null);
  };

  // Confirm and apply delete
  const handleConfirmDelete = () => {
    if (!deleteConfirmJob) return;
    onDeleteJob(deleteConfirmJob.id);
    setDeleteConfirmJob(null);
  };

  // Quick status & urgent toggle for ordered inventory popup
  const handleToggleInventoryPopupStatus = async () => {
    if (!selectedInventoryItemPopup || !onUpdateInventoryDetails) return;
    const nextStatus = selectedInventoryItemPopup.status === 'Received' ? 'Not Received' : 'Received';
    setSelectedInventoryItemPopup((prev) => (prev ? { ...prev, status: nextStatus } : null));
    await onUpdateInventoryDetails(selectedInventoryItemPopup.id, { status: nextStatus });
  };

  const handleToggleInventoryPopupUrgent = async () => {
    if (!selectedInventoryItemPopup || !onUpdateInventoryDetails) return;
    const nextUrgent = !selectedInventoryItemPopup.isUrgent;
    setSelectedInventoryItemPopup((prev) => (prev ? { ...prev, isUrgent: nextUrgent } : null));
    await onUpdateInventoryDetails(selectedInventoryItemPopup.id, { isUrgent: nextUrgent });
  };

  // Quick status & urgent toggle for press detail popup (NEVER marks parent job as completed!)
  const handleTogglePressPopupStatus = async () => {
    if (!selectedPressDetailPopup || !onUpdateJobDetails) return;
    const currentPressStatus = selectedPressDetailPopup.pressStatus || 'Pending';
    const nextPressStatus: 'Pending' | 'Completed' = currentPressStatus === 'Completed' ? 'Pending' : 'Completed';
    setSelectedPressDetailPopup((prev) => (prev ? { ...prev, pressStatus: nextPressStatus } : null));
    setDetailModalJob((prev) => (prev && prev.id === selectedPressDetailPopup.id ? { ...prev, pressStatus: nextPressStatus } : prev));
    await onUpdateJobDetails(selectedPressDetailPopup.id, { pressStatus: nextPressStatus });
  };

  const handleTogglePressPopupUrgent = async () => {
    if (!selectedPressDetailPopup || !onUpdateJobDetails) return;
    const nextUrgent = !selectedPressDetailPopup.isUrgent;
    setSelectedPressDetailPopup((prev) => (prev ? { ...prev, isUrgent: nextUrgent } : null));
    setDetailModalJob((prev) => (prev && prev.id === selectedPressDetailPopup.id ? { ...prev, isUrgent: nextUrgent } : prev));
    await onUpdateJobDetails(selectedPressDetailPopup.id, { isUrgent: nextUrgent });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wide">Plant Operations Queue</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Jobs Management Queue</h2>
        </div>

        <button
          onClick={onOpenNewJobModal}
          className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Job</span>
        </button>
      </div>

      {/* Filter and Stats Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        
        {/* Search */}
        <div className="lg:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs by name, type, or notes..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="lg:col-span-7 flex flex-wrap items-center justify-start lg:justify-end gap-2">
          
          {/* Status selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'All'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Queue ({pendingCount + notCompletedCount})
            </button>

            <button
              onClick={() => setStatusFilter('Not Completed')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                statusFilter === 'Not Completed'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Not Completed ({notCompletedCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('Completed')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                statusFilter === 'Completed'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              <span>Completed ({completedCount})</span>
            </button>
          </div>

          {/* Placement selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            {(['All', 'Factory', 'Office'] as const).map((place) => (
              <button
                key={place}
                onClick={() => setPlacementFilter(place)}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  placementFilter === place
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {place}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Jobs Found in Current Filter</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Try switching the filter tabs above or click below to create a new corrugation job.
          </p>
          <button
            onClick={onOpenNewJobModal}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Job</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredJobs.map((job) => {
            const isFactory = job.jobPlacement === 'Factory';
            const isCompleted = job.status === 'Completed';
            const isNotCompleted = job.status === 'Not Completed';

            return (
              <div
                key={job.id}
                className={`p-5 rounded-2xl bg-slate-900 border transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 group ${
                  isNotCompleted
                    ? 'border-rose-900/60 bg-rose-950/10'
                    : isCompleted
                    ? 'border-emerald-900/60 bg-emerald-950/10 opacity-80'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* Status badge */}
                    {isNotCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-rose-950 text-rose-300 border border-rose-800">
                        <XCircle className="w-3 h-3 text-rose-400" />
                        <span>Not Completed</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-amber-950 text-amber-300 border border-amber-800">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Pending</span>
                      </span>
                    )}

                    {/* Placement badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                        isFactory
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                      }`}
                    >
                      {isFactory ? <Factory className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      <span>{job.jobPlacement}</span>
                    </span>

                    {/* Job Type Tag */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono text-slate-300 bg-slate-950 border border-slate-800">
                      <Tag className="w-3 h-3 text-amber-400" />
                      <span>{job.jobType}</span>
                    </span>

                    {/* Inventory Status */}
                    {job.hasInventory ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                        <Layers className="w-3 h-3" />
                        <span>Inventory Allocated</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                        <Layers className="w-3 h-3" />
                        <span>No Inventory Ordered Yet</span>
                      </span>
                    )}
                  </div>

                  {/* Job Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    {job.jobName}
                  </h3>

                  {/* Notes & Timestamp */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    {job.notes && (
                      <p className="text-slate-300 italic">{job.notes}</p>
                    )}
                    <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      Created: {job.createdAt}
                    </span>
                  </div>
                </div>

                {/* Actions Area: Order Inventory, Mark Complete, and Mark Not Completed */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-800">
                  
                  {/* 1. Order Inventory for Job */}
                  <button
                    onClick={() => onOrderInventoryForJob(job)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Order Inventory for Job</span>
                  </button>

                  {/* 2. MARK COMPLETE Button (triggers confirmation modal) */}
                  <button
                    onClick={() => setConfirmStatusModal({ job, targetStatus: 'Completed' })}
                    title="Mark this job as completed"
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 hover:bg-emerald-950/70 hover:text-emerald-300 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mark Complete</span>
                  </button>

                  {/* 3. MARK NOT COMPLETED Button (triggers confirmation modal) */}
                  <button
                    onClick={() => setConfirmStatusModal({ job, targetStatus: 'Not Completed' })}
                    title="Mark this job as not completed"
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isNotCompleted
                        ? 'bg-rose-600 text-white font-bold'
                        : 'bg-slate-800 hover:bg-rose-950/70 hover:text-rose-300 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Mark Not Completed</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteConfirmJob(job)}
                    title="Delete job"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* 3-DOTS ACTION MENU (Show Detail, Order, Mark, Delete) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveMenuJobId(activeMenuJobId === job.id ? null : job.id)}
                      title="More options & Show Detail"
                      className={`p-1.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                        activeMenuJobId === job.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700'
                      }`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuJobId === job.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={() => setActiveMenuJobId(null)} 
                        />
                        <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-30 py-1 divide-y divide-slate-800/80 animate-in fade-in duration-100 font-sans">
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailModalJob(job);
                                setActiveMenuJobId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-bold text-amber-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>Show Detail</span>
                            </button>
                          </div>

                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuJobId(null);
                                onOrderInventoryForJob(job);
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Layers className="w-3.5 h-3.5 text-blue-400" />
                              <span>Order Inventory</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuJobId(null);
                                setConfirmStatusModal({ job, targetStatus: 'Completed' });
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-emerald-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Mark Complete</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuJobId(null);
                                setConfirmStatusModal({ job, targetStatus: 'Not Completed' });
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-rose-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Mark Not Completed</span>
                            </button>
                          </div>

                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuJobId(null);
                                setDeleteConfirmJob(job);
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              <span>Delete Job</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION MODAL FOR MARKING COMPLETED / NOT COMPLETED */}
      {confirmStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-4">
            
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmStatusModal.targetStatus === 'Completed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {confirmStatusModal.targetStatus === 'Completed' ? (
                    <CheckCircle className="w-5 h-5 stroke-[2.2]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">
                    {confirmStatusModal.targetStatus === 'Completed'
                      ? 'Confirm: Mark Job Completed?'
                      : 'Confirm: Mark Job Not Completed?'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Please confirm the status update</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirmStatusModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Job Card Summary */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wide">
                {confirmStatusModal.job.jobType} · {confirmStatusModal.job.jobPlacement}
              </div>
              <div className="text-sm font-bold text-white truncate">
                {confirmStatusModal.job.jobName}
              </div>
              <div className="text-xs text-slate-400">
                Current Status: <span className="text-slate-200 font-semibold">{confirmStatusModal.job.status}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmStatusModal.targetStatus === 'Completed' ? (
                <span>Are you sure you want to mark this corrugation job as <strong>Completed</strong>? This will archive the job from active pending queue.</span>
              ) : (
                <span>Are you sure you want to flag this corrugation job as <strong>Not Completed</strong>? This marks it as an incomplete/delayed run in the queue.</span>
              )}
            </p>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmStatusModal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmStatusChange}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md flex items-center gap-1.5 ${
                  confirmStatusModal.targetStatus === 'Completed'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {confirmStatusModal.targetStatus === 'Completed' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Yes, Mark Completed</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Yes, Mark Not Completed</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DELETING JOB */}
      {deleteConfirmJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Job from Queue?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete <strong>{deleteConfirmJob.jobName}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmJob(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer"
              >
                Delete Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SHOW JOB DETAIL (Triggered by 3-dots action menu) */}
      {detailModalJob && (() => {
        const linkedItems = inventory.filter(
          (i) =>
            (i.jobId && i.jobId === detailModalJob.id) ||
            (i.jobName && i.jobName.trim().toLowerCase() === detailModalJob.jobName.trim().toLowerCase())
        );
        const linkedStock = linkedItems.filter((i) => i.category !== 'Die');
        const linkedDie = linkedItems.filter((i) => i.category === 'Die');
        const linkedBoardSize =
          linkedStock.find((i) => i.jobSize)?.jobSize ||
          detailModalJob.boardSize ||
          'Not Ordered Yet';

        const isCompleted = detailModalJob.status === 'Completed';
        const isNotCompleted = detailModalJob.status === 'Not Completed';
        const isUrgent = Boolean(detailModalJob.isUrgent);
        const isPressCompleted = detailModalJob.pressStatus === 'Completed';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Job Details & Production Stages</h3>
                    <p className="text-xs text-slate-400">All specs, press run, and ordered stock & die tooling</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModalJob(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Badges Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">Overall Job Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono border ${
                        isCompleted
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : isNotCompleted
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}>
                        {detailModalJob.status}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {detailModalJob.jobPlacement} Line
                    </span>

                    {isUrgent && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-rose-400" />
                        <span>URGENT</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    Job ID: {detailModalJob.id}
                  </span>
                </div>

                {/* Key Spec Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Job Name</span>
                    <span className="text-sm font-bold text-white block">{detailModalJob.jobName}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Job Type</span>
                    <span className="text-sm font-semibold text-amber-400 block">{detailModalJob.jobType}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Board Size</span>
                      <span className="text-[10px] text-slate-500 font-mono">(From Ordered Board)</span>
                    </div>
                    <span className="text-sm font-bold font-mono text-amber-300 block">{linkedBoardSize}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Job Size</span>
                    <span className="text-sm font-bold font-mono text-sky-400 block">
                      {detailModalJob.jobSize || 'Not Specified'}
                    </span>
                  </div>
                </div>

                {/* Notes if present */}
                {detailModalJob.notes && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Job Notes</span>
                    <p className="text-xs text-slate-300 italic">{detailModalJob.notes}</p>
                  </div>
                )}

                {/* SECTION: PRESS DETAIL OR NON-PRINTED SPECIFICATION */}
                {(() => {
                  const isJobNonPrinted =
                    detailModalJob.isPrinted === false ||
                    (linkedStock.length > 0 && !linkedStock.some((s) => s.isPrinted));

                  if (isJobNonPrinted) {
                    return (
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-sky-400" />
                            <span>Print Specification</span>
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-sky-300 border border-slate-700">
                            Non-Printed (Plain Board)
                          </span>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-white">
                              No Press Run Required
                            </div>
                            <p className="text-[11px] text-slate-400">
                              This job is specified as Non-Printed plain corrugated board and is excluded from the printing schedule.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedPressDetailPopup(detailModalJob)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-amber-300 border border-slate-750 hover:border-amber-500/50 transition-colors cursor-pointer shrink-0"
                          >
                            Assign Press Run
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>Press & Converting Run Stage</span>
                        </h4>
                        <span className="text-[11px] text-slate-400">Click card for quick popup controls</span>
                      </div>

                      <div 
                        onClick={() => setSelectedPressDetailPopup(detailModalJob)}
                        className="p-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer group shadow-xs space-y-3"
                        title="Click to open Press Details Popup"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                              Machine: {detailModalJob.pressName || 'Not Assigned'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                              isPressCompleted
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}>
                              {isPressCompleted ? '✅ Press Completed' : '⏳ Press Pending'}
                            </span>
                            {detailModalJob.isUrgent && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                <Flame className="w-3 h-3 fill-rose-400" />
                                <span>URGENT</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-amber-400 group-hover:translate-x-0.5 transition-transform font-semibold">
                            <span>Open Press Popup</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-400 font-mono">
                          <div>Board Size: <span className="text-slate-200">{linkedBoardSize}</span></div>
                          <div>Job Size: <span className="text-sky-300">{detailModalJob.jobSize || '—'}</span></div>
                          <div>Placement: <span className="text-slate-200">{detailModalJob.jobPlacement} Line</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* SECTION: ORDERED INVENTORY (Board Stock & Die Tooling) */}
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Ordered Inventory for Job ({linkedItems.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">Click any item for separate popup box</span>
                  </div>

                  {linkedItems.length === 0 ? (
                    <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-400">No board stock or die tooling has been ordered for this job yet.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailModalJob(null);
                          onOrderInventoryForJob(detailModalJob);
                        }}
                        className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Order Board Stock or Die</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      
                      {/* 1. Board Stock Subsection */}
                      {linkedStock.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                            <span>Board & Paper Stock ({linkedStock.length})</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {linkedStock.map((it) => (
                              <div
                                key={it.id}
                                onClick={() => setSelectedInventoryItemPopup(it)}
                                className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 transition-all cursor-pointer group shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                title="Click to open popup box to mark received or urgent"
                              >
                                <div className="space-y-1">
                                  <div className="font-bold text-white group-hover:text-sky-300 transition-colors flex items-center gap-2">
                                    <span>{it.stockType}</span>
                                    {it.isUrgent && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-0.5">
                                        <Flame className="w-3 h-3 fill-rose-400" />
                                        <span>Urgent</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    Board Size: <span className="text-amber-300 font-semibold">{it.jobSize || 'Standard'}</span> · Supplier: {it.receivingFrom} · Qty: {Number(it.quantity || 0).toLocaleString()} units
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto font-mono text-[11px]">
                                  <span className={`px-2.5 py-1 rounded-lg font-bold ${
                                    it.status === 'Received'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                                  }`}>
                                    {it.status === 'Received' ? '✅ Received' : '⏳ Not Received'}
                                  </span>

                                  <div className="flex items-center gap-1 text-sky-400 group-hover:translate-x-0.5 transition-transform text-xs font-semibold">
                                    <span>Quick Controls</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Die Tooling Subsection */}
                      {linkedDie.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                            <span>Die Tooling Orders ({linkedDie.length})</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {linkedDie.map((it) => (
                              <div
                                key={it.id}
                                onClick={() => setSelectedInventoryItemPopup(it)}
                                className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                title="Click to open popup box to mark received or urgent"
                              >
                                <div className="space-y-1">
                                  <div className="font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-2">
                                    <span>Die Tool: {it.dieMaker || it.receivingFrom || 'Tooling Spec'}</span>
                                    {it.isUrgent && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-0.5">
                                        <Flame className="w-3 h-3 fill-rose-400" />
                                        <span>Urgent</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    Punch Type: <span className="text-purple-300">{it.punchType || it.jobSize || 'Custom'}</span> · Qty: {it.quantity || 1}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto font-mono text-[11px]">
                                  <span className={`px-2.5 py-1 rounded-lg font-bold ${
                                    it.status === 'Received'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                                  }`}>
                                    {it.status === 'Received' ? '✅ Received' : '⏳ Not Received'}
                                  </span>

                                  <div className="flex items-center gap-1 text-purple-400 group-hover:translate-x-0.5 transition-transform text-xs font-semibold">
                                    <span>Quick Controls</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>

              </div>

              {/* Footer Actions */}
              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Overall job remains active until explicitly marked complete.
                </span>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalJob(null);
                      onOrderInventoryForJob(detailModalJob);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Order Stock / Die</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailModalJob(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* SEPARATE POPUP BOX: ORDERED INVENTORY ITEM (Quick Complete & Mark Urgent) */}
      {selectedInventoryItemPopup && (() => {
        const item = selectedInventoryItemPopup;
        const isReceived = item.status === 'Received';
        const isUrgent = Boolean(item.isUrgent);
        const isDie = item.category === 'Die';

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    isDie
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  }`}>
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isDie ? 'Die Tooling Detail' : 'Board Stock Detail'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Item ID: {item.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedInventoryItemPopup(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Item Info Summary */}
              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-semibold text-slate-400">Job Reference</span>
                    <span className="text-xs font-bold text-amber-400 font-mono">{item.jobName || 'Unassigned'}</span>
                  </div>

                  {isDie ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Die Maker:</span>
                        <span className="text-xs font-semibold text-white">{item.dieMaker || item.receivingFrom}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Punch Type:</span>
                        <span className="text-xs font-mono font-semibold text-purple-300">{item.punchType || item.jobSize}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Quantity Ordered:</span>
                        <span className="text-xs font-mono font-bold text-white">{item.quantity} tool(s)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Stock / Paper Type:</span>
                        <span className="text-xs font-semibold text-white">{item.stockType}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Board Size:</span>
                        <span className="text-xs font-mono font-bold text-amber-300">{item.jobSize || 'Standard'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Quantity:</span>
                        <span className="text-xs font-mono font-bold text-white">{Number(item.quantity || 0).toLocaleString()} units</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Supplier:</span>
                        <span className="text-xs font-semibold text-slate-200">{item.receivingFrom}</span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400">Order Date:</span>
                    <span className="text-[11px] font-mono text-slate-400">{item.orderedAt}</span>
                  </div>
                </div>

                {/* QUICK CONTROLS AREA */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quick Status & Priority Controls</span>
                  </h4>

                  {/* 1. MARK COMPLETED / RECEIVED TOGGLE BUTTON */}
                  <button
                    type="button"
                    onClick={handleToggleInventoryPopupStatus}
                    className={`w-full p-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border shadow-sm ${
                      isReceived
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600 hover:bg-emerald-900/60'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 ${isReceived ? 'text-emerald-400' : 'text-slate-950'}`} />
                      <span>{isReceived ? 'Status: Received' : 'Status: Not Received'}</span>
                    </div>
                    <span className="underline font-mono text-[11px]">
                      {isReceived ? 'Click to Mark Not Received' : 'Click to Mark Received'}
                    </span>
                  </button>

                  {/* 2. MARK URGENT TOGGLE BUTTON */}
                  <button
                    type="button"
                    onClick={handleToggleInventoryPopupUrgent}
                    className={`w-full p-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border shadow-sm ${
                      isUrgent
                        ? 'bg-rose-950/60 text-rose-300 border-rose-600 hover:bg-rose-900/60'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Flame className={`w-4 h-4 ${isUrgent ? 'text-rose-400 fill-rose-400 animate-pulse' : 'text-slate-500'}`} />
                      <span>{isUrgent ? 'Priority: Urgent 🔥' : 'Priority: Normal'}</span>
                    </div>
                    <span className="underline font-mono text-[11px]">
                      {isUrgent ? 'Click to Remove Urgent' : 'Click to Mark Urgent 🔥'}
                    </span>
                  </button>

                  <p className="text-[11px] text-slate-500 italic text-center pt-1">
                    Updates save immediately. This does not automatically complete the main job.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedInventoryItemPopup(null)}
                  className="px-5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* SEPARATE POPUP BOX: PRESS DETAIL (Quick Complete & Mark Urgent) */}
      {selectedPressDetailPopup && (() => {
        const job = selectedPressDetailPopup;
        const isPressCompleted = job.pressStatus === 'Completed';
        const isPressUrgent = Boolean(job.isUrgent);

        return (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-amber-500/15 text-amber-400 border-amber-500/30">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Press Operations Detail
                    </h3>
                    <p className="text-xs text-slate-400">
                      Machine assignment & production status
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPressDetailPopup(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Item Info Summary */}
              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-semibold text-slate-400">Job Reference</span>
                    <span className="text-xs font-bold text-amber-400 font-mono">{job.jobName}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Assigned Press Machine:</span>
                    <span className="text-xs font-semibold text-white">{job.pressName || 'Not Assigned'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Board Size:</span>
                    <span className="text-xs font-mono font-bold text-amber-300">{job.boardSize || 'From Stock'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Job Size:</span>
                    <span className="text-xs font-mono font-bold text-sky-400">{job.jobSize || 'Not Specified'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Line Placement:</span>
                    <span className="text-xs font-semibold text-slate-200">{job.jobPlacement} Line</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400">Date Created:</span>
                    <span className="text-[11px] font-mono text-slate-400">{job.createdAt}</span>
                  </div>
                </div>

                {/* QUICK CONTROLS AREA */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Press Run Quick Controls</span>
                  </h4>

                  {/* 1. MARK PRESS COMPLETED TOGGLE BUTTON */}
                  <button
                    type="button"
                    onClick={handleTogglePressPopupStatus}
                    className={`w-full p-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border shadow-sm ${
                      isPressCompleted
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600 hover:bg-emerald-900/60'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className={`w-4 h-4 ${isPressCompleted ? 'text-emerald-400' : 'text-slate-950'}`} />
                      <span>{isPressCompleted ? 'Press Run: Completed' : 'Press Run: Pending'}</span>
                    </div>
                    <span className="underline font-mono text-[11px]">
                      {isPressCompleted ? 'Click to Mark Pending' : 'Click to Mark Press Completed'}
                    </span>
                  </button>

                  {/* 2. MARK URGENT TOGGLE BUTTON */}
                  <button
                    type="button"
                    onClick={handleTogglePressPopupUrgent}
                    className={`w-full p-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border shadow-sm ${
                      isPressUrgent
                        ? 'bg-rose-950/60 text-rose-300 border-rose-600 hover:bg-rose-900/60'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Flame className={`w-4 h-4 ${isPressUrgent ? 'text-rose-400 fill-rose-400 animate-pulse' : 'text-slate-500'}`} />
                      <span>{isPressUrgent ? 'Priority: Urgent 🔥' : 'Priority: Normal'}</span>
                    </div>
                    <span className="underline font-mono text-[11px]">
                      {isPressUrgent ? 'Click to Remove Urgent' : 'Click to Mark Urgent 🔥'}
                    </span>
                  </button>

                  <p className="text-[11px] text-slate-500 italic text-center pt-1">
                    Press completion is saved independently. The main corrugation job remains active in queue.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPressDetailPopup(null)}
                  className="px-5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
