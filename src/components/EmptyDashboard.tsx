import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  Briefcase, 
  PlusCircle, 
  Clock, 
  Box, 
  LogOut, 
  Package, 
  ChevronDown, 
  ChevronRight, 
  LayoutDashboard,
  Layers,
  Archive,
  Cpu,
  Database,
  CloudCheck,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Scissors,
  Printer,
  Workflow,
  BookOpen
} from 'lucide-react';
import { GeminiChatBot } from './GeminiChatBot';
import { NewJobModal } from './NewJobModal';
import { PendingJobsView } from './PendingJobsView';
import { OrderInventoryModal } from './OrderInventoryModal';
import { OrderInventoryView } from './OrderInventoryView';
import { ExistingInventoryView } from './ExistingInventoryView';
import { PlantDataView } from './PlantDataView';
import { DaybookView } from './DaybookView';
import { 
  CorrugationJob, 
  InventoryItem, 
  JobStatus, 
  INITIAL_JOB_TYPES, 
  INITIAL_STOCK_TYPES,
  COMMON_SUPPLIERS,
  INITIAL_PRESS_NAMES,
  INITIAL_DIE_MAKERS,
  INITIAL_PUNCH_TYPES,
  formatReceivedTimestamp
} from '../types/job';
import {
  subscribeToJobs,
  addJobToFirestore,
  updateJobStatusInFirestore,
  updateJobDetailsInFirestore,
  deleteJobFromFirestore,
  subscribeToInventory,
  addInventoryItemsToFirestore,
  updateInventoryItemInFirestore,
  deleteInventoryItemFromFirestore,
  subscribeToFactorySettings,
  addCustomOptionToFirestore,
  deleteCustomOptionFromFirestore,
  testFirestoreConnection,
  getPersistedJobs,
  getPersistedInventory,
  getPersistedSettings,
  reconcileCompletedJobsInventory,
  syncLocalJobsAndInventoryToFirestore
} from '../firebase/db';

interface EmptyDashboardProps {
  onLogout: () => void;
}

export const EmptyDashboard: React.FC<EmptyDashboardProps> = ({ onLogout }) => {
  // Navigation & Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isJobsMenuExpanded, setIsJobsMenuExpanded] = useState(true);
  const [isInventoryMenuExpanded, setIsInventoryMenuExpanded] = useState(true);
  const [isDataMenuExpanded, setIsDataMenuExpanded] = useState(true);
  const [dataTab, setDataTab] = useState<'stock' | 'die' | 'press' | 'process'>('stock');
  
  // Views: dashboard | pending_jobs | order_inventory | existing_inventory | data | daybook
  const [currentView, setCurrentView] = useState<
    'dashboard' | 'pending_jobs' | 'order_inventory' | 'existing_inventory' | 'data' | 'daybook'
  >('dashboard');

  // Modals State
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [isOrderInventoryModalOpen, setIsOrderInventoryModalOpen] = useState(false);
  const [targetJobForInventory, setTargetJobForInventory] = useState<CorrugationJob | null>(null);

  // Firestore Sync State
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<string>('Live Connected');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Dropdown Settings (Initialized from localStorage so they never reset to default on refresh)
  const [jobTypes, setJobTypes] = useState<string[]>(() => getPersistedSettings().jobTypes);
  const [stockTypes, setStockTypes] = useState<string[]>(() => getPersistedSettings().stockTypes);
  const [suppliers, setSuppliers] = useState<string[]>(() => getPersistedSettings().suppliers);
  const [presses, setPresses] = useState<string[]>(() => getPersistedSettings().presses);
  const [dieMakers, setDieMakers] = useState<string[]>(() => getPersistedSettings().dieMakers || INITIAL_DIE_MAKERS);
  const [punchTypes, setPunchTypes] = useState<string[]>(() => getPersistedSettings().punchTypes || INITIAL_PUNCH_TYPES);

  // Jobs List (Initialized from localStorage so deletions remain deleted and additions persist on refresh)
  const [jobs, setJobs] = useState<CorrugationJob[]>(() => getPersistedJobs());

  // Inventory Items List (Initialized from localStorage so deletions remain deleted and additions persist on refresh)
  const [inventory, setInventory] = useState<InventoryItem[]>(() => getPersistedInventory());

  // 1. Initial Firestore Setup & Real-time Subscriptions
  useEffect(() => {
    // Test connection
    testFirestoreConnection().then((connected) => {
      setIsFirestoreConnected(connected);
      if (connected) {
        setSyncStatus('Live Connected (mg-manager-3ab66)');
      }
    });

    // Subscribe to Jobs collection in Firestore (with local persistence & tombstone protection)
    const unsubJobs = subscribeToJobs(
      (realtimeJobs) => {
        setJobs(realtimeJobs);
        setSyncError(null);
      },
      (error) => {
        console.warn('Jobs Firestore listener warning:', error);
      }
    );

    // Subscribe to Inventory collection in Firestore (with local persistence & tombstone protection)
    const unsubInventory = subscribeToInventory(
      (realtimeInventory) => {
        setInventory(realtimeInventory);
        setSyncError(null);
      },
      (error) => {
        console.warn('Inventory Firestore listener warning:', error);
      }
    );

    // Subscribe to Factory dropdown settings in Firestore (with local persistence protection)
    const unsubSettings = subscribeToFactorySettings(
      (settings) => {
        setJobTypes(settings.jobTypes);
        setStockTypes(settings.stockTypes);
        setSuppliers(settings.suppliers);
        setPresses(settings.presses);
        if (settings.dieMakers && settings.dieMakers.length > 0) {
          setDieMakers(settings.dieMakers);
        }
        if (settings.punchTypes && settings.punchTypes.length > 0) {
          setPunchTypes(settings.punchTypes);
        }
      },
      (error) => {
        console.warn('Settings Firestore listener warning:', error);
      }
    );

    // Automatically reconcile any stock attached to completed jobs
    reconcileCompletedJobsInventory();

    // Ensure any offline local data is pushed to Firestore so all devices have it
    syncLocalJobsAndInventoryToFirestore();

    return () => {
      unsubJobs();
      unsubInventory();
      unsubSettings();
    };
  }, []);

  // Handler: Add new Job (persists to Firestore)
  const handleSaveJob = async (newJobData: Omit<CorrugationJob, 'id' | 'createdAt' | 'status'>) => {
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newJob: CorrugationJob = {
      id: `job-${Date.now()}`,
      ...newJobData,
      status: 'Pending',
      hasInventory: false,
      createdAt: timestamp,
    };

    // Optimistic local update
    setJobs((prev) => [newJob, ...prev]);
    setCurrentView('pending_jobs');

    try {
      await addJobToFirestore(newJob);
      setSyncStatus('Job saved to Firebase');
      setTimeout(() => setSyncStatus('Live Connected (mg-manager-3ab66)'), 3000);
    } catch (err: any) {
      console.error('Failed to save job to Firestore:', err);
    }
  };

  // Handler: Add custom Job Type (persists to Firestore)
  const handleAddNewJobType = async (newType: string) => {
    if (!jobTypes.includes(newType)) {
      setJobTypes((prev) => [...prev, newType]);
      try {
        await addCustomOptionToFirestore('jobTypes', newType);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteJobType = async (typeToDelete: string) => {
    setJobTypes((prev) => prev.filter((t) => t !== typeToDelete));
    try {
      await deleteCustomOptionFromFirestore('jobTypes', typeToDelete);
    } catch (e) {
      console.error(e);
    }
  };

  // Handler: Add custom Stock Type (persists to Firestore)
  const handleAddNewStockType = async (newType: string) => {
    if (!stockTypes.includes(newType)) {
      setStockTypes((prev) => [...prev, newType]);
      try {
        await addCustomOptionToFirestore('stockTypes', newType);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteStockType = async (typeToDelete: string) => {
    setStockTypes((prev) => prev.filter((t) => t !== typeToDelete));
    try {
      await deleteCustomOptionFromFirestore('stockTypes', typeToDelete);
    } catch (e) {
      console.error(e);
    }
  };

  // Handler: Add custom Supplier (persists to Firestore)
  const handleAddNewSupplier = async (newSupplier: string) => {
    if (!suppliers.includes(newSupplier)) {
      setSuppliers((prev) => [...prev, newSupplier]);
      try {
        await addCustomOptionToFirestore('suppliers', newSupplier);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteSupplier = async (supplierToDelete: string) => {
    setSuppliers((prev) => prev.filter((s) => s !== supplierToDelete));
    try {
      await deleteCustomOptionFromFirestore('suppliers', supplierToDelete);
    } catch (e) {
      console.error(e);
    }
  };

  // Handler: Add custom Press Name (persists to Firestore)
  const handleAddNewPress = async (newPress: string) => {
    if (!presses.includes(newPress)) {
      setPresses((prev) => [...prev, newPress]);
      try {
        await addCustomOptionToFirestore('presses', newPress);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeletePress = async (pressToDelete: string) => {
    setPresses((prev) => prev.filter((p) => p !== pressToDelete));
    try {
      await deleteCustomOptionFromFirestore('presses', pressToDelete);
    } catch (e) {
      console.error(e);
    }
  };

  // Handler: Add custom Die Maker
  const handleAddNewDieMaker = async (newDieMaker: string) => {
    if (!dieMakers.includes(newDieMaker)) {
      setDieMakers((prev) => [...prev, newDieMaker]);
      try {
        await addCustomOptionToFirestore('dieMakers', newDieMaker);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Handler: Add custom Punch Type
  const handleAddNewPunchType = async (newPunchType: string) => {
    if (!punchTypes.includes(newPunchType)) {
      setPunchTypes((prev) => [...prev, newPunchType]);
      try {
        await addCustomOptionToFirestore('punchTypes', newPunchType);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Handler: Open Order Inventory for a specific Job
  const handleOpenOrderForJob = (job: CorrugationJob) => {
    setTargetJobForInventory(job);
    setIsOrderInventoryModalOpen(true);
  };

  // Handler: Open Order Inventory without a Job
  const handleOpenOrderWithoutJob = () => {
    setTargetJobForInventory(null);
    setIsOrderInventoryModalOpen(true);
  };

  // Handler: Save Inventory Orders (supports multiple stock & die items, preserves date & status, saves to Firestore)
  const handleSaveInventoryOrders = async (
    orderList: (Omit<InventoryItem, 'id'>)[]
  ) => {
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newItems: InventoryItem[] = orderList.map((order, idx) => {
      const matchedJob = jobs.find(
        (j) =>
          (order.jobId && j.id === order.jobId) ||
          (order.jobName && j.jobName.trim().toLowerCase() === order.jobName.trim().toLowerCase())
      );
      const isJobCompleted = matchedJob?.status === 'Completed' || Boolean(order.isUsed);

      return {
        id: `inv-${Date.now()}-${idx}`,
        ...order,
        photoUrl: order.category === 'Die' ? order.photoUrl : undefined,
        orderedAt: order.orderedAt || timestamp,
        status: isJobCompleted ? ('Used' as const) : order.status || 'Not Received',
        isUrgent: Boolean(order.isUrgent),
        isUsed: isJobCompleted,
        usedAt: isJobCompleted ? (matchedJob?.completedAt || formatReceivedTimestamp()) : order.usedAt,
        usedJobId: isJobCompleted ? (matchedJob?.id || order.jobId) : order.usedJobId,
        usedJobName: isJobCompleted ? (matchedJob?.jobName || order.jobName) : order.usedJobName,
        usedJobDescription: isJobCompleted
          ? (matchedJob?.notes || matchedJob?.jobType || 'Ordered for Completed Job')
          : order.usedJobDescription,
      };
    });

    // Optimistic local update
    setInventory((prev) => [...newItems, ...prev]);

    const targetJobId = orderList[0]?.jobId;
    if (targetJobId) {
      const stockItems = orderList.filter((o) => o.category !== 'Die');
      const hasStock = stockItems.length > 0;
      const hasPrintedStock = stockItems.some((o) => o.isPrinted);
      const assignedPress = stockItems.find((o) => o.isPrinted && o.pressName)?.pressName;
      const assignedPressPhoto = stockItems.find((o) => o.pressPhotoUrl || (o.isPrinted && o.photoUrl));
      const pressPhotoUrl = assignedPressPhoto?.pressPhotoUrl || (assignedPressPhoto?.isPrinted ? assignedPressPhoto?.photoUrl : undefined);

      setJobs((prevJobs) =>
        prevJobs.map((j) => {
          if (j.id === targetJobId) {
            return {
              ...j,
              hasInventory: true,
              inventoryCount: (j.inventoryCount || 0) + newItems.length,
              ...(hasStock
                ? {
                    isPrinted: hasPrintedStock,
                    pressName: hasPrintedStock ? (assignedPress || j.pressName) : undefined,
                    pressPhotoUrl: pressPhotoUrl || j.pressPhotoUrl,
                  }
                : {}),
            };
          }
          return j;
        })
      );
    }

    setCurrentView('existing_inventory');

    try {
      await addInventoryItemsToFirestore(newItems, targetJobId);

      // If stock items were ordered, explicitly update the job's isPrinted, pressName, and pressPhotoUrl in Firestore
      if (targetJobId) {
        const stockItems = orderList.filter((o) => o.category !== 'Die');
        if (stockItems.length > 0) {
          const hasPrintedStock = stockItems.some((o) => o.isPrinted);
          const assignedPress = stockItems.find((o) => o.isPrinted && o.pressName)?.pressName;
          const assignedPressPhoto = stockItems.find((o) => o.pressPhotoUrl || (o.isPrinted && o.photoUrl));
          const pressPhotoUrl = assignedPressPhoto?.pressPhotoUrl || (assignedPressPhoto?.isPrinted ? assignedPressPhoto?.photoUrl : undefined);

          await updateJobDetailsInFirestore(targetJobId, {
            isPrinted: hasPrintedStock,
            pressName: hasPrintedStock ? (assignedPress || '') : '',
            ...(pressPhotoUrl ? { pressPhotoUrl } : {}),
          });
        }
      }

      setSyncStatus('Inventory saved to Firebase');
      setTimeout(() => setSyncStatus('Live Connected (mg-manager-3ab66)'), 3000);
    } catch (err: any) {
      console.error('Failed to save inventory to Firestore:', err);
    }
  };

  // Helper: When a job is completed, automatically mark all attached stock inventory as Used
  const markAttachedInventoryUsed = async (
    jobId: string,
    jobName?: string,
    jobType?: string,
    notes?: string,
    completedTime?: string
  ) => {
    const timestamp = completedTime || formatReceivedTimestamp();
    const targetJob = jobs.find((j) => j.id === jobId);
    const finalJobName = jobName || targetJob?.jobName || 'Completed Job';
    const finalDesc = `${jobType || targetJob?.jobType || 'Manufacturing Run'}${
      notes || targetJob?.notes ? ' - ' + (notes || targetJob?.notes) : ''
    }`;

    // Find all inventory items attached to this job that are not already marked used
    const attachedItems = inventory.filter(
      (i) =>
        !i.isUsed &&
        ((i.jobId && i.jobId === jobId) ||
          (i.jobName && finalJobName && i.jobName.trim().toLowerCase() === finalJobName.trim().toLowerCase()))
    );

    if (attachedItems.length > 0) {
      setInventory((prev) =>
        prev.map((it) => {
          const isMatch =
            !it.isUsed &&
            ((it.jobId && it.jobId === jobId) ||
              (it.jobName && finalJobName && it.jobName.trim().toLowerCase() === finalJobName.trim().toLowerCase()));
          if (isMatch) {
            return {
              ...it,
              isUsed: true,
              status: 'Used' as const,
              usedAt: timestamp,
              usedJobId: jobId,
              usedJobName: finalJobName,
              usedJobDescription: finalDesc,
            };
          }
          return it;
        })
      );

      for (const item of attachedItems) {
        try {
          await updateInventoryItemInFirestore(item.id, {
            isUsed: true,
            status: 'Used',
            usedAt: timestamp,
            usedJobId: jobId,
            usedJobName: finalJobName,
            usedJobDescription: finalDesc,
          });
        } catch (e) {
          console.warn(`Failed to mark inventory ${item.id} as used:`, e);
        }
      }
    }
  };

  const unmarkAttachedInventoryUsed = async (jobId: string) => {
    // Only revert items that were automatically marked as used by this specific jobId
    const autoUsedItems = inventory.filter((i) => i.isUsed && i.usedJobId === jobId);

    if (autoUsedItems.length > 0) {
      setInventory((prev) =>
        prev.map((it) => {
          if (it.isUsed && it.usedJobId === jobId) {
            return {
              ...it,
              isUsed: false,
              status: (it.receivedAt ? 'Received' : 'Not Received') as any,
              usedAt: undefined,
              usedJobId: undefined,
              usedJobName: undefined,
              usedJobDescription: undefined,
            };
          }
          return it;
        })
      );

      for (const item of autoUsedItems) {
        try {
          await updateInventoryItemInFirestore(item.id, {
            isUsed: false,
            status: item.receivedAt ? 'Received' : 'Not Received',
            usedAt: undefined,
            usedJobId: undefined,
            usedJobName: undefined,
            usedJobDescription: undefined,
          });
        } catch (e) {
          console.warn(`Failed to unmark inventory ${item.id}:`, e);
        }
      }
    }
  };

  // Handler: Update Job Status (Pending, Not Completed, Completed) with Firestore sync
  const handleSetJobStatus = async (jobId: string, status: JobStatus) => {
    const completedAt = status === 'Completed' ? formatReceivedTimestamp() : undefined;
    // Optimistic local update
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status, ...(status === 'Completed' ? { completedAt } : { completedAt: undefined }) } : j))
    );

    try {
      await updateJobStatusInFirestore(jobId, status, completedAt);
      setSyncStatus(`Job marked ${status} in Firebase`);
      setTimeout(() => setSyncStatus('Live Connected (mg-manager-3ab66)'), 3000);
    } catch (err: any) {
      console.error('Failed to update job status in Firestore:', err);
    }

    if (status === 'Completed') {
      const targetJob = jobs.find((j) => j.id === jobId);
      await markAttachedInventoryUsed(
        jobId,
        targetJob?.jobName,
        targetJob?.jobType,
        targetJob?.notes,
        completedAt
      );
    } else {
      await unmarkAttachedInventoryUsed(jobId);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    try {
      await deleteJobFromFirestore(jobId);
      setSyncStatus('Job permanently deleted');
      setTimeout(() => setSyncStatus('Live Connected (mg-manager-3ab66)'), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInventory = async (itemId: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await deleteInventoryItemFromFirestore(itemId);
      setSyncStatus('Inventory permanently deleted');
      setTimeout(() => setSyncStatus('Live Connected (mg-manager-3ab66)'), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateJobDetails = async (jobId: string, updates: Partial<CorrugationJob>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
    );
    try {
      await updateJobDetailsInFirestore(jobId, updates);
      setSyncStatus('Job updated in Firebase');
      setTimeout(() => setSyncStatus('Live Connected (mg-manager-3ab66)'), 2500);
    } catch (err) {
      console.error('Failed to update job details:', err);
    }

    if (updates.status === 'Completed') {
      const targetJob = jobs.find((j) => j.id === jobId);
      await markAttachedInventoryUsed(
        jobId,
        updates.jobName || targetJob?.jobName,
        updates.jobType || targetJob?.jobType,
        updates.notes || targetJob?.notes,
        updates.completedAt
      );
    } else if (updates.status) {
      await unmarkAttachedInventoryUsed(jobId);
    }
  };

  const handleUpdateInventoryDetails = async (itemId: string, updates: Partial<InventoryItem>) => {
    setInventory((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, ...updates } : it))
    );
    try {
      await updateInventoryItemInFirestore(itemId, updates);
      setSyncStatus('Inventory updated in Firebase');
      setTimeout(() => setSyncStatus('Live Connected (mg-manager-3ab66)'), 2500);
    } catch (err) {
      console.error('Failed to update inventory details:', err);
    }
  };

  const handleAddCustomInventory = async (newItem: Omit<InventoryItem, 'id' | 'orderedAt'>) => {
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const item: InventoryItem = {
      id: `inv-${Date.now()}`,
      ...newItem,
      orderedAt: timestamp,
    };
    setInventory((prev) => [item, ...prev]);
    try {
      await addInventoryItemsToFirestore([item]);
      setSyncStatus('Stock saved to Firebase');
      setTimeout(() => setSyncStatus('Live Connected (mg-manager-3ab66)'), 2500);
    } catch (err) {
      console.error('Failed to add custom inventory:', err);
    }
  };

  const activeQueueCount = (jobs || []).filter((j) => j && j.status !== 'Completed').length;
  const notCompletedCount = (jobs || []).filter((j) => j && j.status === 'Not Completed').length;
  const jobsNeedingInventoryCount = (jobs || []).filter((j) => j && !j.hasInventory).length;
  const urgentStockCount = (inventory || []).filter((i) => i && i.isUrgent).length;
  const urgentJobCount = (jobs || []).filter((j) => j && j.isUrgent).length;
  const urgentTotalCount = urgentStockCount + urgentJobCount;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      
      {/* Top Bar with 3-Line Menu Button at Top-Left & Firebase Indicator */}
      <header className="sticky top-0 z-40 bg-slate-950/95 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Top Left: 3-Line Menu Button & Brand Wordmark */}
          <div className="flex items-center gap-3.5 shrink-0">
            {/* 3 LINE BUTTON AT TOP LEFT */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
              className="p-2 -ml-1 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center shadow-xs"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Brand Logo and Title */}
            <div 
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-xs">
                <Box className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap hidden sm:inline">
                Corrugation Factory Operations
              </span>
            </div>
          </div>

          {/* Quick Breadcrumbs / Active View Indicator */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                currentView === 'dashboard'
                  ? 'bg-slate-800 text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('pending_jobs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                currentView === 'pending_jobs'
                  ? 'bg-slate-800 text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Jobs Queue</span>
              {activeQueueCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] font-mono font-bold rounded-full">
                  {activeQueueCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentView('existing_inventory')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                currentView === 'existing_inventory'
                  ? 'bg-slate-800 text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Inventory ({inventory.length})</span>
            </button>
            {/* Stock Data */}
            <button
              onClick={() => {
                setCurrentView('data');
                setDataTab('stock');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                currentView === 'data' && dataTab === 'stock'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Stock Data</span>
            </button>

            {/* Die Data (Separate option for Die in Data) */}
            <button
              onClick={() => {
                setCurrentView('data');
                setDataTab('die');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                currentView === 'data' && dataTab === 'die'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5 text-purple-400" />
              <span>Die Data</span>
            </button>

            {/* Press Data */}
            <button
              onClick={() => {
                setCurrentView('data');
                setDataTab('press');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                currentView === 'data' && dataTab === 'press'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Press Data</span>
            </button>

            {/* Process Tracking */}
            <button
              onClick={() => {
                setCurrentView('data');
                setDataTab('process');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                currentView === 'data' && dataTab === 'process'
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Workflow className="w-3.5 h-3.5 text-teal-400" />
              <span>Process</span>
            </button>

            {/* Daybook Navigation Tab */}
            <button
              onClick={() => setCurrentView('daybook')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                currentView === 'daybook'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Daybook</span>
            </button>
          </div>

          {/* Top Right: Firebase Status, User & Logout */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Firebase DB Badge */}
            <div 
              title="Connected to Firebase project: mg-manager-3ab66"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 font-mono shadow-xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Database className="w-3 h-3 text-emerald-400" />
              <span>mg-manager-3ab66</span>
            </div>

            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-mono text-slate-300">admin</span>
              <span className="text-slate-500 text-[10px]">· Supervisor</span>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Slide-out Navigation Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Menu Panel */}
          <div className="relative w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Box className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Plant Navigation</h3>
                  <p className="text-[11px] text-slate-400">Corrugation Plant Menu</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Dashboard Link */}
              <button
                onClick={() => {
                  setCurrentView('dashboard');
                  setIsDrawerOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                <span>Dashboard & Factory AI</span>
              </button>

              {/* 1. SECTION: JOBS */}
              <div>
                <div 
                  onClick={() => setIsJobsMenuExpanded(!isJobsMenuExpanded)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs font-bold text-white cursor-pointer hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <span>Jobs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeQueueCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500 text-slate-950 font-bold">
                        {activeQueueCount}
                      </span>
                    )}
                    {isJobsMenuExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Jobs Sub-options */}
                {isJobsMenuExpanded && (
                  <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-800 space-y-1">
                    {/* Option 1: New Job */}
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        setIsNewJobModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-amber-500/10 hover:text-amber-300 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <PlusCircle className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span>New Job</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        + Add
                      </span>
                    </button>

                    {/* Option 2: Pending Job */}
                    <button
                      onClick={() => {
                        setCurrentView('pending_jobs');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        currentView === 'pending_jobs'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending Jobs Queue</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {notCompletedCount > 0 && (
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                            {notCompletedCount} !
                          </span>
                        )}
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          currentView === 'pending_jobs'
                            ? 'bg-slate-950 text-amber-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {activeQueueCount}
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. SECTION: INVENTORY */}
              <div>
                <div 
                  onClick={() => setIsInventoryMenuExpanded(!isInventoryMenuExpanded)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs font-bold text-white cursor-pointer hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <span>Inventory</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {inventory.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-500 text-slate-950 font-bold">
                        {inventory.length}
                      </span>
                    )}
                    {isInventoryMenuExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Inventory Sub-options */}
                {isInventoryMenuExpanded && (
                  <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-800 space-y-1">
                    <button
                      onClick={() => {
                        setCurrentView('order_inventory');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        currentView === 'order_inventory'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>Order Inventory</span>
                      </div>
                      {jobsNeedingInventoryCount > 0 && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {jobsNeedingInventoryCount} Due
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setCurrentView('existing_inventory');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        currentView === 'existing_inventory'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Archive className="w-3.5 h-3.5" />
                        <span>Existing Inventory</span>
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        currentView === 'existing_inventory'
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {inventory.length}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3. SECTION: DATA (Stock, Die, Press) */}
              <div>
                <div 
                  onClick={() => setIsDataMenuExpanded(!isDataMenuExpanded)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs font-bold text-white cursor-pointer hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Database className="w-3.5 h-3.5" />
                    </div>
                    <span>Data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDataMenuExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Data Sub-options */}
                {isDataMenuExpanded && (
                  <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-800 space-y-1">
                    <button
                      onClick={() => {
                        setCurrentView('data');
                        setDataTab('stock');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        currentView === 'data' && dataTab === 'stock'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span>Stock Data</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setCurrentView('data');
                        setDataTab('die');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        currentView === 'data' && dataTab === 'die'
                          ? 'bg-purple-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-purple-400" />
                        <span>Die Data</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setCurrentView('data');
                        setDataTab('press');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        currentView === 'data' && dataTab === 'press'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Press Data</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setCurrentView('data');
                        setDataTab('process');
                        setIsDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        currentView === 'data' && dataTab === 'process'
                          ? 'bg-teal-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Workflow className="w-3.5 h-3.5 text-teal-400" />
                        <span>Process</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* 4. SECTION: DAYBOOK (Office Daybook) */}
              <div>
                <button
                  onClick={() => {
                    setCurrentView('daybook');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    currentView === 'daybook'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-xs'
                      : 'bg-slate-950/60 border border-slate-800/80 text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <span>Daybook</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 font-semibold">
                    Accounts
                  </span>
                </button>
              </div>

              {/* Firebase Database Status Box */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Database Engine</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Firebase Firestore</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Project: <strong className="text-slate-200">mg-manager-3ab66</strong>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                  <span>Sync status:</span>
                  <span className="text-emerald-400">{syncStatus}</span>
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400 font-mono">
              <div className="flex items-center justify-between mb-2">
                <span>Supervisor:</span>
                <span className="text-slate-200">admin</span>
              </div>
              <button
                onClick={onLogout}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-rose-400 hover:text-rose-300 border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW 1: Dashboard with Summary & Gemini Chat Bot */}
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                  <span>Plant Dashboard</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                    Firebase Connected
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Corrugation packaging operations console · Manage <strong className="text-amber-400">Jobs</strong> & <strong className="text-blue-400">Inventory</strong> via 3-line top-left menu
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsNewJobModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>New Job</span>
                </button>

                <button
                  onClick={handleOpenOrderWithoutJob}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span>Order Inventory</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 space-y-6">
                
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-amber-400" />
                      <h2 className="text-base font-bold text-white">Jobs & Inventory Operations</h2>
                    </div>
                    <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {activeQueueCount} Active Jobs
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    All jobs and inventory orders are continuously synced with your Firestore database (<code className="text-amber-300 font-mono">mg-manager-3ab66</code>). The AI Assistant can read this entire database live to answer questions or assist with factory planning.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => setCurrentView('pending_jobs')}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all"
                    >
                      <div className="text-xs text-slate-400">Jobs in Queue</div>
                      <div className="text-xl font-bold font-mono text-white mt-1">{activeQueueCount}</div>
                      <div className="text-[10px] text-amber-400 mt-0.5">
                        {notCompletedCount > 0 ? `${notCompletedCount} marked not completed →` : 'Inspect queue & mark status →'}
                      </div>
                    </div>

                    <div 
                      onClick={() => setCurrentView('existing_inventory')}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all"
                    >
                      <div className="text-xs text-slate-400">Existing Inventory</div>
                      <div className="text-xl font-bold font-mono text-white mt-1">{inventory.length} Lots</div>
                      <div className="text-[10px] text-blue-400 mt-0.5">View printed & raw stock →</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      onClick={() => setCurrentView('order_inventory')}
                      className="w-full sm:flex-1 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Order Inventory Portal</span>
                    </button>
                    <button
                      onClick={() => setCurrentView('data')}
                      className="w-full sm:flex-1 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>Data (Stock & Press)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Database Engine</span>
                      <Database className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-400">mg-manager-3ab66</div>
                    <p className="text-[11px] text-slate-400 mt-1">Google Cloud Firestore Active</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Paper Reel Inventory</span>
                      <Box className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-white">{inventory.length} Registered</div>
                    <p className="text-[11px] text-slate-400 mt-1">Kraft Liner & Fluting Stock</p>
                  </div>
                </div>

              </div>

              {/* Gemini Chat Bot with Live Database Access */}
              <div className="lg:col-span-6">
                <GeminiChatBot jobs={jobs} inventory={inventory} />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Pending Jobs Queue View */}
        {currentView === 'pending_jobs' && (
          <PendingJobsView
            jobs={jobs}
            inventory={inventory}
            onOpenNewJobModal={() => setIsNewJobModalOpen(true)}
            onSetJobStatus={handleSetJobStatus}
            onDeleteJob={handleDeleteJob}
            onOrderInventoryForJob={handleOpenOrderForJob}
            onUpdateInventoryDetails={handleUpdateInventoryDetails}
            onUpdateJobDetails={handleUpdateJobDetails}
          />
        )}

        {/* VIEW 3: Order Inventory View (Order Without Job, and Existing Jobs Without Inventory) */}
        {currentView === 'order_inventory' && (
          <OrderInventoryView
            jobs={jobs || []}
            onOrderWithoutJob={handleOpenOrderWithoutJob}
            onOrderForJob={handleOpenOrderForJob}
          />
        )}

        {/* VIEW 4: Existing Inventory Registry View */}
        {currentView === 'existing_inventory' && (
          <ExistingInventoryView
            inventory={inventory || []}
            jobs={jobs || []}
            onOpenOrderModal={handleOpenOrderWithoutJob}
            onDeleteInventory={handleDeleteInventory}
            onUpdateInventoryDetails={handleUpdateInventoryDetails}
          />
        )}

        {/* VIEW 5: Data Operations Registry View (Ordered Stock & Press Data) */}
        {currentView === 'data' && (
          <PlantDataView
            jobs={jobs || []}
            inventory={inventory || []}
            availablePresses={presses || INITIAL_PRESS_NAMES}
            availableStockTypes={stockTypes || INITIAL_STOCK_TYPES}
            availableSuppliers={suppliers || COMMON_SUPPLIERS}
            initialTab={dataTab}
            onUpdateJobDetails={handleUpdateJobDetails}
            onDeleteJob={handleDeleteJob}
            onAddJob={async (newJobData) => {
              await handleSaveJob(newJobData as any);
            }}
            onUpdateInventoryDetails={handleUpdateInventoryDetails}
            onDeleteInventory={handleDeleteInventory}
            onAddInventoryItem={handleAddCustomInventory}
          />
        )}

        {/* VIEW 6: Office Daybook */}
        {currentView === 'daybook' && (
          <DaybookView />
        )}

      </main>

      {/* MODAL 1: New Job Modal */}
      <NewJobModal
        isOpen={isNewJobModalOpen}
        onClose={() => setIsNewJobModalOpen(false)}
        onSaveJob={handleSaveJob}
        availableTypes={jobTypes || []}
        onAddNewType={handleAddNewJobType}
        onDeleteType={handleDeleteJobType}
      />

      {/* MODAL 2: Order Inventory Modal with Multiple Stock for Jobs, Search/Save for Receiving & Press Name */}
      <OrderInventoryModal
        isOpen={isOrderInventoryModalOpen}
        onClose={() => setIsOrderInventoryModalOpen(false)}
        onSaveInventoryOrders={handleSaveInventoryOrders}
        availableStockTypes={stockTypes || INITIAL_STOCK_TYPES}
        onAddNewStockType={handleAddNewStockType}
        onDeleteStockType={handleDeleteStockType}
        availableSuppliers={suppliers || COMMON_SUPPLIERS}
        onAddNewSupplier={handleAddNewSupplier}
        onDeleteSupplier={handleDeleteSupplier}
        availablePresses={presses || INITIAL_PRESS_NAMES}
        onAddNewPress={handleAddNewPress}
        onDeletePress={handleDeletePress}
        targetJob={targetJobForInventory}
        existingInventory={inventory || []}
        availableJobs={jobs || []}
        availableJobTypes={jobTypes || []}
        onAddNewJobType={handleAddNewJobType}
        availableDieMakers={dieMakers || INITIAL_DIE_MAKERS}
        onAddNewDieMaker={handleAddNewDieMaker}
        availablePunchTypes={punchTypes || INITIAL_PUNCH_TYPES}
        onAddNewPunchType={handleAddNewPunchType}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-2">
          <span>Corrugation Plant Operations</span>
          <span>·</span>
          <span className="text-emerald-400">Firestore: mg-manager-3ab66</span>
        </div>
        <div>
          Authenticated: <span className="text-amber-400">admin</span>
        </div>
      </footer>

    </div>
  );
};
