import React, { useState, useEffect, useMemo } from 'react';
import {
  Factory,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  LogOut,
  Search,
  Filter,
  Check,
  RotateCcw,
  Layers,
  Printer,
  Scissors,
  ArrowRight,
  ExternalLink,
  Calendar,
  Sparkles,
  ChevronRight,
  Plus,
  Truck,
  Box,
  FileCheck,
  RefreshCw,
  Eye,
  CheckSquare,
  Square,
  Flame,
} from 'lucide-react';
import {
  CorrugationJob,
  InventoryItem,
  JobProcessStep,
  JobStatus,
  formatReceivedTimestamp,
} from '../types/job';
import {
  subscribeToJobs,
  subscribeToInventory,
  updateJobDetailsInFirestore,
  updateJobStatusInFirestore,
  updateInventoryItemInFirestore,
  markAttachedStockUsedForJob,
  reconcileCompletedJobsInventory,
} from '../firebase/db';

interface FactoryFloorDashboardProps {
  onLogout: () => void;
}

const DEFAULT_CORRUGATION_PROCESSES = [
  'Paper Reel Splicing & Loading',
  'Corrugation / Fluting (Single / Double Wall)',
  'Sheet Slitting & Scoring',
  'Flexo Printing & Inking',
  'Die Cutting & Creasing',
  'Rotary Slotting & Punching',
  'Folder Gluer / Side Pasting',
  'Wire Stitching & Binding',
  'Quality Inspection & Burst Testing',
  'Bundling & Strapping',
  'Palletization & Shrink Wrapping',
  'Dispatch & Logistics',
];

function parseJobDateToTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) return parsed;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.getTime();
  } catch {}
  return 0;
}

function formatJobAge(dateStr?: string): { text: string; isOld: boolean } {
  const ts = parseJobDateToTimestamp(dateStr);
  if (!ts) return { text: dateStr || 'N/A', isOld: false };
  const diffMs = Date.now() - ts;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays >= 3) {
    return { text: `${diffDays} days old (${new Date(ts).toLocaleDateString()})`, isOld: true };
  }
  if (diffDays >= 1) {
    return { text: `${diffDays}d ago (${new Date(ts).toLocaleDateString()})`, isOld: false };
  }
  if (diffHours > 0) {
    return { text: `${diffHours}h ago today`, isOld: false };
  }
  return { text: 'Today (New)', isOld: false };
}

export const FactoryFloorDashboard: React.FC<FactoryFloorDashboardProps> = ({ onLogout }) => {
  const [jobs, setJobs] = useState<CorrugationJob[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<CorrugationJob | null>(null);

  // Active view tab: 'dashboard' (Prioritized FIFO Queue) | 'all_jobs' | 'completed'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'all_jobs' | 'completed'>('dashboard');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState(false);
  const [floorCustomProcess, setFloorCustomProcess] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const todayIso = new Date().toISOString().split('T')[0];

  // Subscribe to live Firestore jobs & inventory
  useEffect(() => {
    const unsubJobs = subscribeToJobs((updatedJobs) => {
      setJobs(updatedJobs);
    });

    const unsubInventory = subscribeToInventory((updatedInv) => {
      setInventory(updatedInv);
    });

    // Automatically reconcile any stock attached to completed jobs
    reconcileCompletedJobsInventory();

    return () => {
      unsubJobs();
      unsubInventory();
    };
  }, []);

  // Synchronize selected job if its data changes in Firestore
  useEffect(() => {
    if (selectedJob) {
      const refreshed = jobs.find((j) => j.id === selectedJob.id);
      if (refreshed) {
        setSelectedJob(refreshed);
      }
    }
  }, [jobs]);

  const showNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  // Helper: Get all linked stock items for a specific job
  const getLinkedStockForJob = (job: CorrugationJob): InventoryItem[] => {
    return inventory.filter(
      (item) => item.jobId === job.id || (item.jobName && item.jobName.trim().toLowerCase() === job.jobName.trim().toLowerCase())
    );
  };

  // Check if all stock for a job is received
  const isAllStockReceivedForJob = (job: CorrugationJob): boolean => {
    const linked = getLinkedStockForJob(job);
    if (linked.length === 0) return true; // No stock required
    return linked.every((item) => item.status === 'Received');
  };

  // Check if all processes for a job are completed
  const isAllProcessesCompletedForJob = (job: CorrugationJob): boolean => {
    const steps = job.processes || [];
    if (steps.length === 0) return false;
    return steps.every((s) => s.completed && Boolean(s.completedDate));
  };

  // Check if job is ready to be marked OK / Completed
  const isJobReadyForOk = (job: CorrugationJob): boolean => {
    return isAllStockReceivedForJob(job) && isAllProcessesCompletedForJob(job);
  };

  // SORTING REQUIREMENT:
  // "older the job the processes should pop up at the top" -> Ascending sort by createdAt (Oldest first)
  const activePendingJobsOldestFirst = useMemo(() => {
    return [...jobs]
      .filter((j) => j.status !== 'Completed')
      .sort((a, b) => {
        const tsA = parseJobDateToTimestamp(a.createdAt);
        const tsB = parseJobDateToTimestamp(b.createdAt);
        return tsA - tsB; // Oldest first
      });
  }, [jobs]);

  // FIFO Queue 1: Pending Stock (Jobs awaiting paper/die stock delivery, oldest first)
  const pendingStockQueue = useMemo(() => {
    const queue: { job: CorrugationJob; pendingItems: InventoryItem[] }[] = [];
    activePendingJobsOldestFirst.forEach((job) => {
      const linked = getLinkedStockForJob(job);
      const pendingItems = linked.filter((item) => item.status !== 'Received');
      if (pendingItems.length > 0) {
        queue.push({ job, pendingItems });
      }
    });
    return queue;
  }, [activePendingJobsOldestFirst, inventory]);

  // FIFO Queue 2: Pending Processes (Jobs with unfinished manufacturing steps, oldest first)
  const pendingProcessesQueue = useMemo(() => {
    const queue: { job: CorrugationJob; pendingSteps: JobProcessStep[] }[] = [];
    activePendingJobsOldestFirst.forEach((job) => {
      const steps = job.processes || [];
      const pendingSteps = steps.filter((s) => !s.completed);
      if (pendingSteps.length > 0) {
        queue.push({ job, pendingSteps });
      }
    });
    return queue;
  }, [activePendingJobsOldestFirst]);

  // Completed jobs
  const completedJobsList = useMemo(() => {
    return jobs
      .filter((j) => j.status === 'Completed')
      .sort((a, b) => {
        const tsA = parseJobDateToTimestamp(a.completedAt || a.createdAt);
        const tsB = parseJobDateToTimestamp(b.completedAt || b.createdAt);
        return tsB - tsA; // Most recently completed first
      });
  }, [jobs]);

  // Filtered jobs list based on search and placement
  const filteredJobsList = useMemo(() => {
    return jobs.filter((j) => {
      const matchesSearch =
        !searchQuery.trim() ||
        j.jobName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.jobType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.boardSize && j.boardSize.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (j.pressName && j.pressName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (filterType === 'pending') return j.status !== 'Completed';
      if (filterType === 'completed') return j.status === 'Completed';
      if (filterType === 'needs_stock') {
        const linked = getLinkedStockForJob(j);
        return linked.some((item) => item.status !== 'Received');
      }
      return true;
    });
  }, [jobs, searchQuery, filterType, inventory]);

  // ----------------------------------------------------
  // ACTION HANDLERS (Real-time updates to Firestore)
  // ----------------------------------------------------

  // 1. Mark stock item as Received
  const handleMarkStockReceived = async (item: InventoryItem, jobName?: string) => {
    setIsUpdating(true);
    try {
      const nowFormatted = formatReceivedTimestamp();
      await updateInventoryItemInFirestore(item.id, {
        status: 'Received',
        receivedAt: nowFormatted,
      });
      showNotification(`Stock "${item.stockType}" for "${jobName || item.jobName}" marked as RECEIVED!`);
    } catch (err: any) {
      alert(`Error updating stock: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 2. Unmark / revert stock item
  const handleUnmarkStockReceived = async (item: InventoryItem) => {
    setIsUpdating(true);
    try {
      await updateInventoryItemInFirestore(item.id, {
        status: 'Not Received',
        receivedAt: undefined,
      });
      showNotification(`Stock "${item.stockType}" marked as NOT RECEIVED.`, 'info');
    } catch (err: any) {
      alert(`Error updating stock: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 3. Mark single process step as completed
  const handleMarkProcessComplete = async (jobId: string, stepId: string, customDate?: string) => {
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    setIsUpdating(true);
    try {
      const dateUsed = customDate || todayIso;
      const currentSteps = targetJob.processes || [];
      const updatedSteps = currentSteps.map((p) =>
        p.id === stepId ? { ...p, completed: true, completedDate: dateUsed } : p
      );

      // Check if all processes are completed
      const allCompleted = updatedSteps.length > 0 && updatedSteps.every((p) => p.completed && Boolean(p.completedDate));
      const nextStatus: JobStatus = allCompleted ? 'Completed' : targetJob.status;

      const payload: Partial<CorrugationJob> = {
        processes: updatedSteps,
        status: nextStatus,
      };
      if (allCompleted) {
        payload.completedAt = new Date().toISOString();
      }

      await updateJobDetailsInFirestore(targetJob.id, payload);

      if (allCompleted) {
        await markAttachedStockUsedForJob(
          targetJob.id,
          targetJob.jobName,
          targetJob.jobType,
          targetJob.notes,
          payload.completedAt
        );

        // Optimistically update local inventory state
        setInventory((prev) =>
          prev.map((it) => {
            const matchesId = it.jobId && it.jobId === targetJob.id;
            const matchesName = it.jobName && it.jobName.trim().toLowerCase() === targetJob.jobName.trim().toLowerCase();
            if (!it.isUsed && (matchesId || matchesName)) {
              return {
                ...it,
                isUsed: true,
                status: 'Used',
                usedAt: formatReceivedTimestamp(),
                usedJobId: targetJob.id,
                usedJobName: targetJob.jobName,
                usedJobDescription: targetJob.notes || targetJob.jobType || 'Completed with Job',
              };
            }
            return it;
          })
        );
      }

      const stepName = currentSteps.find((s) => s.id === stepId)?.name || 'Process';
      if (allCompleted) {
        showNotification(`🎉 All processes finished for "${targetJob.jobName}"! Job is now marked as OK / COMPLETED.`);
      } else {
        showNotification(`Marked "${stepName}" as COMPLETED (${dateUsed}) for "${targetJob.jobName}".`);
      }
    } catch (err: any) {
      alert(`Error updating process: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 4. Toggle / Unmark process step
  const handleUnmarkProcess = async (jobId: string, stepId: string) => {
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    setIsUpdating(true);
    try {
      const currentSteps = targetJob.processes || [];
      const updatedSteps = currentSteps.map((p) => {
        if (p.id === stepId) {
          const { completedDate, ...rest } = p;
          return { ...rest, completed: false };
        }
        return p;
      });

      const payload: Partial<CorrugationJob> = {
        processes: updatedSteps,
        status: targetJob.status === 'Completed' ? 'Pending' : targetJob.status,
      };
      if (targetJob.status === 'Completed') {
        payload.completedAt = null as any;
      }

      await updateJobDetailsInFirestore(targetJob.id, payload);

      showNotification(`Reopened process step for "${targetJob.jobName}".`, 'info');
    } catch (err: any) {
      alert(`Error updating process: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 5. Initialize standard process pipeline for a job
  const handleAssignStandardProcesses = async (job: CorrugationJob) => {
    setIsUpdating(true);
    try {
      const newSteps: JobProcessStep[] = DEFAULT_CORRUGATION_PROCESSES.map((name, idx) => ({
        id: `proc-${Date.now()}-${idx}`,
        name,
        completed: false,
        sequence: idx + 1,
      }));

      await updateJobDetailsInFirestore(job.id, {
        processes: newSteps,
      });
      showNotification(`Standard manufacturing pipeline (12 steps) assigned to "${job.jobName}".`);
    } catch (err: any) {
      alert(`Error assigning pipeline: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Add custom process directly on factory floor
  const handleAddCustomProcess = async (job: CorrugationJob, processName: string) => {
    if (!processName.trim()) return;
    setIsUpdating(true);
    try {
      const currentSteps = job.processes || [];
      const newStep: JobProcessStep = {
        id: `proc-${Date.now()}-${currentSteps.length + 1}`,
        name: processName.trim(),
        completed: false,
        sequence: currentSteps.length + 1,
      };
      await updateJobDetailsInFirestore(job.id, {
        processes: [...currentSteps, newStep],
      });
      showNotification(`Process "${processName.trim()}" added to "${job.jobName}".`);
    } catch (err: any) {
      alert(`Error adding process: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 6. Mark Entire Job as OK / Completed
  const handleMarkJobOk = async (job: CorrugationJob) => {
    setIsUpdating(true);
    try {
      const nowIso = new Date().toISOString();
      // Ensure all processes are also marked completed if they exist
      const currentSteps = job.processes || [];
      const finalizedSteps = currentSteps.map((p) => ({
        ...p,
        completed: true,
        completedDate: p.completedDate || todayIso,
      }));

      const payload: Partial<CorrugationJob> = {
        status: 'Completed',
        completedAt: nowIso,
      };
      if (finalizedSteps.length > 0) {
        payload.processes = finalizedSteps;
      }

      await updateJobDetailsInFirestore(job.id, payload);

      await markAttachedStockUsedForJob(job.id, job.jobName, job.jobType, job.notes, nowIso);

      // Optimistically update local inventory state
      setInventory((prev) =>
        prev.map((it) => {
          const matchesId = it.jobId && it.jobId === job.id;
          const matchesName = it.jobName && it.jobName.trim().toLowerCase() === job.jobName.trim().toLowerCase();
          if (!it.isUsed && (matchesId || matchesName)) {
            return {
              ...it,
              isUsed: true,
              status: 'Used',
              usedAt: formatReceivedTimestamp(),
              usedJobId: job.id,
              usedJobName: job.jobName,
              usedJobDescription: job.notes || job.jobType || 'Completed with Job',
            };
          }
          return it;
        })
      );

      showNotification(`✅ Job "${job.jobName}" successfully verified and marked as OK / COMPLETED!`);
      if (selectedJob && selectedJob.id === job.id) {
        setSelectedJob(null);
      }
    } catch (err: any) {
      alert(`Error marking job completed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // 7. Reopen job
  const handleReopenJob = async (job: CorrugationJob) => {
    setIsUpdating(true);
    try {
      await updateJobStatusInFirestore(job.id, 'Pending');
      showNotification(`Job "${job.jobName}" reopened to Active Pending queue.`, 'info');
    } catch (err: any) {
      alert(`Error reopening job: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-semibold ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
                : 'bg-slate-900/90 text-amber-200 border-amber-500/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand & User identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Factory className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Factory Floor Operations</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Shopfloor Mode
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Operator: <span className="text-slate-200 font-mono font-semibold">admin</span> · Focus: Job Execution & Stock Verification
              </p>
            </div>
          </div>

          {/* Navigation Mode Tabs & Sign Out */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>FIFO Pending Queue</span>
                {pendingStockQueue.length + pendingProcessesQueue.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold ml-0.5">
                    {pendingStockQueue.length + pendingProcessesQueue.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all_jobs')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'all_jobs'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>All Jobs ({jobs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'completed'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>OK / Completed ({completedJobsList.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Sign Out to Login"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* KPI METRICS OVERVIEW BAR */}
      <div className="bg-slate-900 border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Active Jobs</span>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {activePendingJobsOldestFirst.length}
              </div>
            </div>
            <Package className="w-5 h-5 text-amber-400 opacity-80" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-rose-400 uppercase">Stock Not Received</span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                {pendingStockQueue.length} <span className="text-xs font-normal text-slate-400">jobs</span>
              </div>
            </div>
            <Truck className="w-5 h-5 text-rose-400 opacity-80" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase">Pending Processes</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                {pendingProcessesQueue.reduce((acc, q) => acc + q.pendingSteps.length, 0)}{' '}
                <span className="text-xs font-normal text-slate-400">steps</span>
              </div>
            </div>
            <Printer className="w-5 h-5 text-amber-400 opacity-80" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase">Verified OK</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {completedJobsList.length} <span className="text-xs font-normal text-slate-400">jobs</span>
              </div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 opacity-80" />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ========================================================= */}
        {/* VIEW 1: FIFO PENDING DASHBOARD (OLDEST JOBS POP UP AT TOP) */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Priority Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    First-In, First-Out (FIFO) Production Dispatch
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Older jobs requiring raw material deliveries or process sign-offs pop up at the top automatically.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950 px-2.5 py-1 rounded-lg border border-amber-800 self-start sm:self-auto">
                ⚡ Sorted by Oldest Created Date
              </span>
            </div>

            {/* TWO PRIORITIZED SECTIONS: A) STOCK NOT RECEIVED, B) PENDING PROCESSES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SECTION A: STOCK NOT RECEIVED (Oldest Jobs at top) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Stock Not Received</span>
                      <span className="text-xs font-mono text-rose-400 bg-rose-950/60 px-2 py-0.2 rounded border border-rose-800/60 font-semibold">
                        {pendingStockQueue.length} jobs
                      </span>
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Oldest jobs first</span>
                </div>

                {pendingStockQueue.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl space-y-1.5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-white">All Raw Materials Received!</p>
                    <p className="text-[11px] text-slate-400">
                      No jobs are currently held up waiting for paper reels, sheets, or die delivery.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingStockQueue.map(({ job, pendingItems }, index) => {
                      const age = formatJobAge(job.createdAt);
                      return (
                        <div
                          key={`stock-${job.id}`}
                          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-amber-400 text-xs font-bold">
                                  #{index + 1}
                                </span>
                                <h4 className="text-sm font-bold text-white">{job.jobName}</h4>
                                {job.isUrgent && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 flex items-center gap-0.5">
                                    <Flame className="w-3 h-3 fill-rose-400" />
                                    <span>URGENT</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                Type: <span className="text-slate-300">{job.jobType}</span> · Age:{' '}
                                <strong className={age.isOld ? 'text-rose-400' : 'text-amber-300'}>
                                  {age.text}
                                </strong>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedJob(job)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer shrink-0"
                            >
                              View Details
                            </button>
                          </div>

                          {/* List of pending stock items for this job with 1-click mark received */}
                          <div className="space-y-2 pt-1 border-t border-slate-800/80">
                            {pendingItems.map((item) => (
                              <div
                                key={item.id}
                                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                                    <span>{item.stockType}</span>
                                    {item.category === 'Die' && (
                                      <span className="text-[10px] text-purple-400 font-mono">
                                        (Die Tool)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    Size: {item.jobSize || 'Std'} · Supplier:{' '}
                                    <span className="text-sky-300">{item.receivingFrom}</span> · Qty:{' '}
                                    {Number(item.quantity || 0).toLocaleString()}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleMarkStockReceived(item, job.jobName)}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 shadow-xs disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Mark Received</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION B: PENDING JOB PROCESSES (Oldest Jobs at top) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Pending Job Processes</span>
                      <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.2 rounded border border-amber-800/60 font-semibold">
                        {pendingProcessesQueue.length} jobs
                      </span>
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Oldest jobs first</span>
                </div>

                {pendingProcessesQueue.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl space-y-1.5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-white">All Processes Finished!</p>
                    <p className="text-[11px] text-slate-400">
                      No manufacturing process steps are currently pending for in-progress jobs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingProcessesQueue.map(({ job, pendingSteps }, index) => {
                      const age = formatJobAge(job.createdAt);
                      const totalSteps = job.processes?.length || 0;
                      const completedCount = totalSteps - pendingSteps.length;
                      const nextStep = pendingSteps[0]; // Next logical process to complete

                      return (
                        <div
                          key={`proc-${job.id}`}
                          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-amber-400 text-xs font-bold">
                                  #{index + 1}
                                </span>
                                <h4 className="text-sm font-bold text-white">{job.jobName}</h4>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-teal-300 border border-slate-800 font-semibold">
                                  {completedCount} / {totalSteps} Done
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                Age:{' '}
                                <strong className={age.isOld ? 'text-rose-400' : 'text-amber-300'}>
                                  {age.text}
                                </strong>{' '}
                                · Size: {job.boardSize || job.jobSize || 'Std'}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedJob(job)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer shrink-0"
                            >
                              All Steps
                            </button>
                          </div>

                          {/* Next Immediate Process Step to execute */}
                          <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                                Next Pending Process:
                              </span>
                              <div className="font-bold text-white truncate mt-0.5 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-mono text-[11px] shrink-0">
                                  {nextStep.sequence || 1}
                                </span>
                                <span>{nextStep.name}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleMarkProcessComplete(job.id, nextStep.id)}
                              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Mark Processed</span>
                            </button>
                          </div>

                          {/* Quick checklist of remaining steps if multiple */}
                          {pendingSteps.length > 1 && (
                            <div className="text-[11px] text-slate-400 flex flex-wrap gap-1.5 pt-1">
                              <span className="text-slate-500">Remaining:</span>
                              {pendingSteps.slice(1, 4).map((s) => (
                                <span
                                  key={s.id}
                                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300"
                                >
                                  {s.name}
                                </span>
                              ))}
                              {pendingSteps.length > 4 && (
                                <span className="text-slate-500">
                                  +{pendingSteps.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: ALL ACTIVE JOBS EXPLORER */}
        {/* ========================================================= */}
        {activeTab === 'all_jobs' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search jobs by name, board size, press, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">All Jobs ({jobs.length})</option>
                  <option value="pending">Pending Active Only</option>
                  <option value="needs_stock">Needs Raw Stock</option>
                  <option value="completed">Completed / OK</option>
                </select>
              </div>
            </div>

            {/* Jobs Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredJobsList.map((job) => {
                const linkedStock = getLinkedStockForJob(job);
                const pendingStockCount = linkedStock.filter((i) => i.status !== 'Received').length;
                const steps = job.processes || [];
                const completedStepsCount = steps.filter((s) => s.completed).length;
                const isReady = isJobReadyForOk(job);
                const age = formatJobAge(job.createdAt);

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 hover:bg-slate-900/90 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                          {job.jobType}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            job.status === 'Completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isReady
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {job.status === 'Completed' ? '✅ OK / Done' : isReady ? 'Ready for OK' : 'In Production'}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                        {job.jobName}
                      </h4>

                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        Age:{' '}
                        <strong className={age.isOld ? 'text-rose-400' : 'text-amber-300'}>
                          {age.text}
                        </strong>
                      </div>

                      {/* Specifications Summary */}
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Board Size:</span>
                          <span className="font-mono text-white font-semibold">
                            {job.boardSize || job.jobSize || 'Standard'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Raw Stock:</span>
                          <span
                            className={`font-mono font-semibold ${
                              pendingStockCount === 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {pendingStockCount === 0
                              ? `All Received (${linkedStock.length})`
                              : `${pendingStockCount} Pending Delivery`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Processes:</span>
                          <span className="font-mono text-teal-400 font-semibold">
                            {steps.length > 0 ? `${completedStepsCount} of ${steps.length} steps` : 'No pipeline'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 group-hover:text-white transition-colors">
                        Click to mark & view details
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: COMPLETED / VERIFIED OK JOBS ARCHIVE */}
        {/* ========================================================= */}
        {activeTab === 'completed' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Verified & Completed Job Orders ({completedJobsList.length})</span>
              </h3>
            </div>

            {completedJobsList.length === 0 ? (
              <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-400">No jobs have been finalized as completed yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {completedJobsList.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          ✅ VERIFIED OK
                        </span>
                        <h4 className="text-base font-bold text-white">{job.jobName}</h4>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        Type: {job.jobType} · Board: {job.boardSize || job.jobSize || 'Std'} · Completed:{' '}
                        {job.completedAt ? new Date(job.completedAt).toLocaleString() : 'Done'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedJob(job)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors cursor-pointer"
                      >
                        Inspect Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReopenJob(job)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl border border-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                        title="Reopen to pending active jobs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* JOB DETAIL INSPECTION MODAL (MARK STOCK, PROCESSES & OK) */}
      {/* ========================================================= */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
            onClick={() => setSelectedJob(null)}
          />

          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-slate-950 text-slate-300 border border-slate-800">
                    {selectedJob.jobType}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                      selectedJob.status === 'Completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {selectedJob.status === 'Completed' ? '✅ Status: OK / Completed' : '⏳ Status: In Production'}
                  </span>
                  {selectedJob.isUrgent && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-rose-400" />
                      <span>URGENT</span>
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-white mt-2">{selectedJob.jobName}</h2>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Created: {selectedJob.createdAt} · Age:{' '}
                  <strong className={formatJobAge(selectedJob.createdAt).isOld ? 'text-rose-400' : 'text-amber-300'}>
                    {formatJobAge(selectedJob.createdAt).text}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Specifications Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase">Board Size</span>
                <div className="font-mono text-white font-bold text-sm mt-0.5">
                  {selectedJob.boardSize || selectedJob.jobSize || 'Standard'}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase">Press Machine</span>
                <div className="text-slate-200 font-medium text-sm mt-0.5">
                  {selectedJob.pressName || 'Not Assigned'}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase">Print Status</span>
                <div className="text-slate-200 font-medium text-sm mt-0.5">
                  {selectedJob.isPrinted ? 'Printed Setup' : 'Plain Non-Printed'}
                </div>
              </div>
            </div>

            {/* 1. STOCK ITEMS & RAW MATERIALS (Mark Received) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. Required Stock & Raw Materials</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {isAllStockReceivedForJob(selectedJob) ? (
                    <span className="text-emerald-400 font-bold">✅ All Stock Received</span>
                  ) : (
                    <span className="text-rose-400 font-bold">⏳ Stock Pending Delivery</span>
                  )}
                </span>
              </div>

              {getLinkedStockForJob(selectedJob).length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                  No dedicated warehouse orders linked. You can proceed with standard plant stock.
                </div>
              ) : (
                <div className="space-y-2">
                  {getLinkedStockForJob(selectedJob).map((item) => {
                    const isReceived = item.status === 'Received';
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                          isReceived
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-slate-950 border-rose-500/40 shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 font-semibold text-white">
                            <span>{item.stockType}</span>
                            <span
                              className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                                isReceived
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {isReceived ? '✅ RECEIVED' : '⏳ NOT RECEIVED'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-1">
                            Board Size: {item.jobSize} · From: {item.receivingFrom} · Qty:{' '}
                            {Number(item.quantity || 0).toLocaleString()} units
                            {item.receivedAt && (
                              <span className="text-emerald-400 ml-1">· At: {item.receivedAt}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isReceived ? (
                            <button
                              type="button"
                              onClick={() => handleUnmarkStockReceived(item)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Unmark
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMarkStockReceived(item, selectedJob.jobName)}
                              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Mark Received</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. MANUFACTURING PROCESSES (Check off steps) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <Printer className="w-3.5 h-3.5 text-teal-400" />
                  <span>2. Production Processes Checklist</span>
                </h3>
                <span className="text-[11px] font-mono text-teal-400">
                  {(selectedJob.processes || []).filter((s) => s.completed).length} of{' '}
                  {(selectedJob.processes || []).length} Completed
                </span>
              </div>

              {(!selectedJob.processes || selectedJob.processes.length === 0) ? (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
                  <p className="text-xs text-slate-400">No process steps have been assigned to this job yet.</p>
                  <button
                    type="button"
                    onClick={() => handleAssignStandardProcesses(selectedJob)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Assign Standard 12-Step Manufacturing Pipeline</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedJob.processes.map((step) => {
                    return (
                      <div
                        key={step.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                          step.completed
                            ? 'bg-teal-950/20 border-teal-500/30 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              step.completed
                                ? handleUnmarkProcess(selectedJob.id, step.id)
                                : handleMarkProcessComplete(selectedJob.id, step.id)
                            }
                            className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                              step.completed
                                ? 'bg-teal-500 text-slate-950 font-bold'
                                : 'bg-slate-900 border border-slate-700 hover:border-teal-500'
                            }`}
                          >
                            {step.completed ? <Check className="w-4 h-4 stroke-[3]" /> : null}
                          </button>

                          <div className="min-w-0">
                            <div className="font-semibold truncate flex items-center gap-2">
                              <span className="text-[11px] font-mono text-slate-500">
                                #{step.sequence || 1}
                              </span>
                              <span className={step.completed ? 'line-through text-slate-400' : 'text-white'}>
                                {step.name}
                              </span>
                            </div>
                            {step.completed && step.completedDate && (
                              <div className="text-[10px] font-mono text-teal-400">
                                Done on {step.completedDate}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {step.completed ? (
                            <span className="text-[11px] font-mono text-teal-400 font-semibold px-2 py-0.5 rounded bg-teal-950 border border-teal-800/60">
                              Processed
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMarkProcessComplete(selectedJob.id, step.id)}
                              className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add process step or assign standard pipeline directly on floor */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={floorCustomProcess}
                        onChange={(e) => setFloorCustomProcess(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomProcess(selectedJob, floorCustomProcess);
                            setFloorCustomProcess('');
                          }
                        }}
                        placeholder="Add process step (e.g. UV Coating, Stitching)..."
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          handleAddCustomProcess(selectedJob, floorCustomProcess);
                          setFloorCustomProcess('');
                        }}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAssignStandardProcesses(selectedJob)}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Standard 12 Steps</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. FINAL JOB SIGN-OFF / OK ACTION */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  3. Final Inspection & Job Verification
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Confirm all raw materials are accounted for and manufacturing processes are verified.
                </p>
              </div>

              {selectedJob.status === 'Completed' ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
                    ✅ Job is Verified & Completed OK
                  </span>
                  <button
                    type="button"
                    onClick={() => handleReopenJob(selectedJob)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-semibold border border-slate-800 cursor-pointer"
                  >
                    Reopen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleMarkJobOk(selectedJob)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                    isJobReadyForOk(selectedJob)
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 animate-bounce'
                      : 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Mark Job as OK / Completed</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
