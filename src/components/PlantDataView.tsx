import React, { useState, useRef, useEffect } from 'react';
import { 
  Database, 
  BarChart3, 
  Layers, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Flame, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  X, 
  Check, 
  ChevronRight,
  ArrowUpDown,
  FileText,
  Calendar,
  Scissors,
  MoreVertical,
  Eye,
  ExternalLink,
  Info,
  Tag,
  ChevronDown,
  Camera,
  Workflow
} from 'lucide-react';
import { 
  CorrugationJob, 
  InventoryItem, 
  JobStatus, 
  JobProcessStep,
  INITIAL_PRESS_NAMES, 
  INITIAL_STOCK_TYPES, 
  COMMON_SUPPLIERS,
  INITIAL_DIE_MAKERS,
  INITIAL_PUNCH_TYPES,
  formatReceivedTimestamp
} from '../types/job';
import { PhotoDropzone } from './PhotoDropzone';

interface PlantDataViewProps {
  jobs: CorrugationJob[];
  inventory: InventoryItem[];
  availablePresses?: string[];
  availableStockTypes?: string[];
  availableSuppliers?: string[];
  initialTab?: 'stock' | 'die' | 'press' | 'process';
  onUpdateJobDetails: (jobId: string, updates: Partial<CorrugationJob>) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
  onAddJob?: (newJob: Omit<CorrugationJob, 'id' | 'createdAt' | 'status'> & { boardSize?: string; jobSize?: string; pressName?: string; isUrgent?: boolean; status?: JobStatus }) => Promise<void>;
  onUpdateInventoryDetails: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  onDeleteInventory: (itemId: string) => Promise<void>;
  onAddInventoryItem?: (newItem: Omit<InventoryItem, 'id' | 'orderedAt'>) => Promise<void>;
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
  'Dispatch & Logistics'
];

const MG_SAVED_PROCESSES_KEY = 'mg_saved_process_names';

const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const PlantDataView: React.FC<PlantDataViewProps> = ({
  jobs,
  inventory,
  availablePresses = INITIAL_PRESS_NAMES,
  availableStockTypes = INITIAL_STOCK_TYPES,
  availableSuppliers = COMMON_SUPPLIERS,
  initialTab = 'stock',
  onUpdateJobDetails,
  onDeleteJob,
  onAddJob,
  onUpdateInventoryDetails,
  onDeleteInventory,
  onAddInventoryItem,
}) => {
  // Primary Tab: 'stock' | 'die' | 'press' | 'process'
  const [activeTab, setActiveTab] = useState<'stock' | 'die' | 'press' | 'process'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Search & Filters for Stock
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'pending' | 'received' | 'urgent'>('all');
  const [stockDateFilter, setStockDateFilter] = useState('');

  // Search & Filters for Die
  const [dieSearch, setDieSearch] = useState('');
  const [dieFilter, setDieFilter] = useState<'all' | 'pending' | 'received' | 'urgent'>('all');
  const [dieDateFilter, setDieDateFilter] = useState('');

  // Search & Filters for Press
  const [pressSearch, setPressSearch] = useState('');
  const [pressFilter, setPressFilter] = useState<'all' | 'pending' | 'completed' | 'urgent'>('all');
  const [pressDateFilter, setPressDateFilter] = useState('');

  // Modal: Edit Stock Item
  const [editingStockItem, setEditingStockItem] = useState<InventoryItem | null>(null);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);

  // Modal: Edit Press Job Details (Board Size, Job Size, Press Name, Urgent, Status)
  const [editingPressJob, setEditingPressJob] = useState<CorrugationJob | null>(null);
  const [isAddPressJobModalOpen, setIsAddPressJobModalOpen] = useState(false);

  // Modal: Delete Confirmation
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'job' | 'inventory';
    id: string;
    name: string;
  } | null>(null);

  // 3-Dot Dropdown Menu State: { section: 'stock' | 'die' | 'press', id: string } | null
  const [activeDropdownMenu, setActiveDropdownMenu] = useState<{
    section: 'stock' | 'die' | 'press';
    id: string;
  } | null>(null);

  // Dedicated Detail Modals for 3-Dot "Show Detail" (Board Stock, Die Tooling, Press Run)
  const [detailStockItem, setDetailStockItem] = useState<InventoryItem | null>(null);
  const [detailDieItem, setDetailDieItem] = useState<InventoryItem | null>(null);
  const [detailPressJob, setDetailPressJob] = useState<CorrugationJob | null>(null);

  // Global listener to close 3-dot menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdownMenu(null);
    if (activeDropdownMenu) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeDropdownMenu]);

  const todayIso = new Date().toISOString().split('T')[0];

  // Optional Photo Upload & Preview Lightbox States
  const [dieAddPhotoUrl, setDieAddPhotoUrl] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Process Tracking States
  const [selectedProcessJobId, setSelectedProcessJobId] = useState<string>('');
  const [savedProcesses, setSavedProcesses] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(MG_SAVED_PROCESSES_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
    return DEFAULT_CORRUGATION_PROCESSES;
  });
  const [customProcessInput, setCustomProcessInput] = useState<string>('');
  const [processSearch, setProcessSearch] = useState<string>('');
  const [processStatusFilter, setProcessStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [processNotification, setProcessNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [inlineDateInputs, setInlineDateInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedProcessJobId && jobs.length > 0) {
      setSelectedProcessJobId(jobs[0].id);
    }
  }, [jobs, selectedProcessJobId]);

  useEffect(() => {
    if (processNotification) {
      const timer = setTimeout(() => setProcessNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [processNotification]);

  // Form State for Adding / Editing Stock (with optional photoUrl)
  const [stockForm, setStockForm] = useState({
    stockType: availableStockTypes[0] || 'Kraft Liner 180 GSM',
    jobSize: '',
    quantity: 5000,
    receivingFrom: availableSuppliers[0] || 'Varun Board',
    status: 'Not Received' as 'Received' | 'Not Received',
    isUrgent: false,
    orderDate: todayIso,
    notes: '',
    photoUrl: '' as string,
  });

  // Die Order specifics in Add Stock Modal
  const [stockAddCategory, setStockAddCategory] = useState<'Stock' | 'Die'>('Stock');
  const [dieSelectedJobId, setDieSelectedJobId] = useState<string>('');
  const [dieJobName, setDieJobName] = useState<string>('');
  const [dieJobType, setDieJobType] = useState<string>('General Corrugation');
  const [dieMaker, setDieMaker] = useState<string>(INITIAL_DIE_MAKERS[0] || 'Apex Laser Dies');
  const [diePunchType, setDiePunchType] = useState<string>(INITIAL_PUNCH_TYPES[0] || 'Rotary Die Punch');
  const [dieQuantity, setDieQuantity] = useState<number>(1);

  const handleSelectExistingJobForDie = (jobId: string) => {
    setDieSelectedJobId(jobId);
    if (!jobId || jobId === 'custom') {
      setDieJobName('');
      return;
    }
    const found = jobs.find((j) => j.id === jobId);
    if (found) {
      setDieJobName(found.jobName);
      setDieJobType(found.jobType || 'General Corrugation');
    }
  };

  // Form State for Adding / Editing Press Job (with optional pressPhotoUrl)
  const [pressForm, setPressForm] = useState({
    jobName: '',
    jobType: 'Corrugated Board Slitting & Scoring',
    boardSize: '',
    jobSize: '',
    pressName: availablePresses[0] || 'Flexo Press 1 (4-Color)',
    jobPlacement: 'Factory' as 'Factory' | 'Office',
    status: 'Pending' as JobStatus,
    isUrgent: false,
    jobDate: todayIso,
    notes: '',
    pressPhotoUrl: '' as string,
  });

  // Export Loading States
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // -----------------------------------------------------------------
  // HELPER: GET BOARD SIZE FROM ORDERED BOARD FOR JOB
  // -----------------------------------------------------------------
  const getLinkedBoardSize = (job: CorrugationJob): string => {
    // Only search in actual paper/board STOCK items (NOT die items!)
    const linked = rawStockItems.find(
      (i) =>
        (i.jobId && i.jobId === job.id) ||
        (i.jobName && i.jobName.trim().toLowerCase() === job.jobName.trim().toLowerCase())
    );
    if (linked && linked.jobSize) {
      return linked.jobSize;
    }
    // If job has a boardSize that is NOT a punch type string (exclude "punch" or "die:")
    if (job.boardSize && !job.boardSize.toLowerCase().includes('punch') && !job.boardSize.toLowerCase().includes('die:')) {
      return job.boardSize;
    }
    return job.boardSize && !job.boardSize.toLowerCase().includes('punch') ? job.boardSize : 'Not Ordered Yet';
  };

  // -----------------------------------------------------------------
  // FILTERED DATA
  // -----------------------------------------------------------------
  // Split raw inventory into paper/board stock vs die tooling
  const rawStockItems = inventory.filter((item) => item.category !== 'Die' && !item.dieMaker && !item.punchType);
  const rawDieItems = inventory.filter((item) => item.category === 'Die' || Boolean(item.dieMaker || item.punchType));

  const filteredStock = rawStockItems.filter((item) => {
    const matchesSearch =
      (item.stockType || '').toLowerCase().includes(stockSearch.toLowerCase()) ||
      (item.receivingFrom || '').toLowerCase().includes(stockSearch.toLowerCase()) ||
      (item.jobSize || '').toLowerCase().includes(stockSearch.toLowerCase()) ||
      (item.jobName || '').toLowerCase().includes(stockSearch.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(stockSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (stockDateFilter) {
      const itemDate = (item.orderedAt || '').split(' ')[0];
      if (itemDate !== stockDateFilter) return false;
    }

    if (stockFilter === 'pending') return item.status !== 'Received';
    if (stockFilter === 'received') return item.status === 'Received';
    if (stockFilter === 'urgent') return Boolean(item.isUrgent);
    return true;
  });

  const filteredDie = rawDieItems.filter((item) => {
    const matchesSearch =
      (item.jobName || '').toLowerCase().includes(dieSearch.toLowerCase()) ||
      (item.dieMaker || '').toLowerCase().includes(dieSearch.toLowerCase()) ||
      (item.punchType || '').toLowerCase().includes(dieSearch.toLowerCase()) ||
      (item.jobType || '').toLowerCase().includes(dieSearch.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(dieSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (dieDateFilter) {
      const itemDate = (item.orderedAt || '').split(' ')[0];
      if (itemDate !== dieDateFilter) return false;
    }

    if (dieFilter === 'pending') return item.status !== 'Received';
    if (dieFilter === 'received') return item.status === 'Received';
    if (dieFilter === 'urgent') return Boolean(item.isUrgent);
    return true;
  });

  // Helper: Check if a job requires Press / Printing operations
  // If user selected Non-Printed or linked stock is non-printed, DO NOT SHOW IN PRINTING DATA!
  const isJobPrinted = (job: CorrugationJob): boolean => {
    // 1. Explicitly marked non-printed
    if (job.isPrinted === false) return false;

    // 2. Check linked paper/board stock
    const linkedStocks = rawStockItems.filter(
      (i) =>
        (i.jobId && i.jobId === job.id) ||
        (i.jobName && i.jobName.trim().toLowerCase() === job.jobName.trim().toLowerCase())
    );

    if (linkedStocks.length > 0) {
      // If ANY stock item is printed, it requires printing press
      const hasPrintedStock = linkedStocks.some((s) => s.isPrinted);
      // If all linked stock is Non-Printed, this job is Non-Printed and must NOT show in Printing Data!
      if (!hasPrintedStock) return false;
      return true;
    }

    // 3. If job itself has isPrinted === true
    if (job.isPrinted === true) return true;

    // 4. If job has an assigned press name (and was not marked non-printed)
    if (job.pressName && job.pressName.trim() !== '' && !job.pressName.toLowerCase().includes('not assigned')) {
      return true;
    }

    // Default: If no stock ordered, no press assigned, and not marked printed:
    // It does not belong in the printing data!
    return false;
  };

  const pressEligibleJobs = jobs.filter(isJobPrinted);

  const filteredPressJobs = pressEligibleJobs.filter((job) => {
    const matchesSearch =
      (job.jobName || '').toLowerCase().includes(pressSearch.toLowerCase()) ||
      (job.jobType || '').toLowerCase().includes(pressSearch.toLowerCase()) ||
      (job.pressName || '').toLowerCase().includes(pressSearch.toLowerCase()) ||
      (job.boardSize || '').toLowerCase().includes(pressSearch.toLowerCase()) ||
      (job.jobSize || '').toLowerCase().includes(pressSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (pressDateFilter) {
      const jobDate = (job.createdAt || '').split(' ')[0];
      if (jobDate !== pressDateFilter) return false;
    }

    const isPressDone = job.pressStatus === 'Completed';
    if (pressFilter === 'pending') return !isPressDone;
    if (pressFilter === 'completed') return isPressDone;
    if (pressFilter === 'urgent') return Boolean(job.isUrgent);
    return true;
  });

  // Metrics for Stock
  const totalStockLots = rawStockItems.length;
  const receivedStockLots = rawStockItems.filter((i) => i.status === 'Received').length;
  const pendingStockLots = rawStockItems.filter((i) => i.status !== 'Received').length;
  const urgentStockLots = rawStockItems.filter((i) => i.isUrgent).length;
  const totalStockQuantity = rawStockItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  // Metrics for Die
  const totalDieLots = rawDieItems.length;
  const receivedDieLots = rawDieItems.filter((i) => i.status === 'Received').length;
  const pendingDieLots = rawDieItems.filter((i) => i.status !== 'Received').length;
  const urgentDieLots = rawDieItems.filter((i) => Boolean(i.isUrgent)).length;

  // Metrics for Press (Press Stage Completion is separate from Job queue completion!)
  const totalPressJobs = pressEligibleJobs.length;
  const completedPressJobs = pressEligibleJobs.filter((j) => j.pressStatus === 'Completed').length;
  const pendingPressJobs = pressEligibleJobs.filter((j) => j.pressStatus !== 'Completed').length;
  const urgentPressJobs = pressEligibleJobs.filter((j) => j.isUrgent).length;

  // Metrics & Filtering for Process Tracking
  const jobsWithProcesses = jobs.filter((j) => j.processes && j.processes.length > 0);
  const jobsWithProcessesCount = jobsWithProcesses.length;
  const fullyCompletedProcessJobs = jobs.filter((j) => {
    const procs = j.processes || [];
    return procs.length > 0 && procs.every((p) => p.completed && Boolean(p.completedDate));
  });
  const inProgressProcessJobs = jobsWithProcesses.filter((j) => {
    const procs = j.processes || [];
    return procs.some((p) => !p.completed || !p.completedDate);
  });

  const filteredProcessJobs = jobs.filter((job) => {
    const matchesSearch =
      (job.jobName || '').toLowerCase().includes(processSearch.toLowerCase()) ||
      (job.jobType || '').toLowerCase().includes(processSearch.toLowerCase()) ||
      (job.jobPlacement || '').toLowerCase().includes(processSearch.toLowerCase());
    if (!matchesSearch) return false;

    const procs = job.processes || [];
    const isCompleted = procs.length > 0 && procs.every((p) => p.completed && Boolean(p.completedDate));

    if (processStatusFilter === 'pending') {
      return !isCompleted;
    }
    if (processStatusFilter === 'completed') {
      return isCompleted;
    }
    return true;
  });

  // -----------------------------------------------------------------
  // TOGGLES
  // -----------------------------------------------------------------
  const handleToggleStockReceived = async (item: InventoryItem) => {
    const nextStatus = item.status === 'Received' ? 'Not Received' : 'Received';
    const receivedAt = nextStatus === 'Received' ? formatReceivedTimestamp() : undefined;
    await onUpdateInventoryDetails(item.id, { status: nextStatus, receivedAt });
  };

  const handleToggleStockUrgent = async (item: InventoryItem) => {
    await onUpdateInventoryDetails(item.id, { isUrgent: !item.isUrgent });
  };

  const handleToggleDieReceived = async (item: InventoryItem) => {
    const nextStatus = item.status === 'Received' ? 'Not Received' : 'Received';
    const receivedAt = nextStatus === 'Received' ? formatReceivedTimestamp() : undefined;
    await onUpdateInventoryDetails(item.id, { status: nextStatus, receivedAt });
  };

  const handleToggleDieUrgent = async (item: InventoryItem) => {
    await onUpdateInventoryDetails(item.id, { isUrgent: !item.isUrgent });
  };

  const handleTogglePressStatus = async (job: CorrugationJob) => {
    // Only toggles press stage completion, NEVER auto-completes the parent job!
    const nextStatus: 'Pending' | 'Completed' = job.pressStatus === 'Completed' ? 'Pending' : 'Completed';
    const pressCompletedAt = nextStatus === 'Completed' ? formatReceivedTimestamp() : undefined;
    await onUpdateJobDetails(job.id, { pressStatus: nextStatus, pressCompletedAt });
  };

  const handleTogglePressUrgent = async (job: CorrugationJob) => {
    await onUpdateJobDetails(job.id, { isUrgent: !job.isUrgent });
  };

  // -----------------------------------------------------------------
  // ADD & EDIT SUBMISSIONS
  // -----------------------------------------------------------------
  const handleOpenAddStock = () => {
    setStockAddCategory('Stock');
    setDieJobName(jobs[0]?.jobName || '');
    setDieJobType(jobs[0]?.jobType || 'General Corrugation');
    setDieMaker(INITIAL_DIE_MAKERS[0] || 'Apex Laser Dies');
    setDiePunchType(INITIAL_PUNCH_TYPES[0] || 'Rotary Die Punch');
    setDieQuantity(1);
    setStockForm({
      stockType: availableStockTypes[0] || 'Kraft Liner 180 GSM',
      jobSize: '',
      quantity: 5000,
      receivingFrom: availableSuppliers[0] || 'Varun Board',
      status: 'Not Received',
      isUrgent: false,
      orderDate: todayIso,
      notes: '',
      photoUrl: '',
    });
    setIsAddStockModalOpen(true);
  };

  const handleOpenAddDie = () => {
    setStockAddCategory('Die');
    setDieSelectedJobId(jobs[0]?.id || '');
    setDieJobName(jobs[0]?.jobName || '');
    setDieJobType(jobs[0]?.jobType || 'General Corrugation');
    setDieMaker(INITIAL_DIE_MAKERS[0] || 'Apex Laser Dies');
    setDiePunchType(INITIAL_PUNCH_TYPES[0] || 'Rotary Die Punch');
    setDieQuantity(1);
    setDieAddPhotoUrl('');
    setStockForm({
      stockType: '',
      jobSize: '',
      quantity: 1,
      receivingFrom: INITIAL_DIE_MAKERS[0] || 'Apex Laser Dies',
      status: 'Not Received',
      isUrgent: false,
      orderDate: todayIso,
      notes: '',
      photoUrl: '',
    });
    setIsAddStockModalOpen(true);
  };

  const handleDieAddPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setDieAddPhotoUrl(compressed);
    } catch (err) {
      console.error('Error compressing die photo:', err);
    }
  };

  const handleEditStockPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setStockForm((prev) => ({ ...prev, photoUrl: compressed }));
    } catch (err) {
      console.error('Error compressing stock/die photo:', err);
    }
  };

  const handlePressPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setPressForm((prev) => ({ ...prev, pressPhotoUrl: compressed }));
    } catch (err) {
      console.error('Error compressing press photo:', err);
    }
  };

  const handleSaveNewStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const dateFormatted = `${stockForm.orderDate} 12:00`;
    if (onAddInventoryItem) {
      if (stockAddCategory === 'Die') {
        await onAddInventoryItem({
          category: 'Die',
          stockType: `Die: ${diePunchType.trim()} (${dieMaker.trim()})`,
          jobSize: diePunchType.trim(),
          receivingFrom: dieMaker.trim(),
          dieMaker: dieMaker.trim(),
          punchType: diePunchType.trim(),
          jobName: dieJobName.trim(),
          jobType: dieJobType.trim(),
          quantity: Number(dieQuantity) || 1,
          status: 'Not Received',
          isUrgent: false,
          isPrinted: false,
          notes: stockForm.notes,
          photoUrl: dieAddPhotoUrl || undefined,
        } as any);
      } else {
        await onAddInventoryItem({
          category: 'Stock',
          stockType: stockForm.stockType,
          jobSize: stockForm.jobSize || 'Standard',
          receivingFrom: stockForm.receivingFrom,
          quantity: Number(stockForm.quantity) || 1000,
          status: 'Not Received',
          isUrgent: false,
          isPrinted: false,
          notes: stockForm.notes,
          photoUrl: stockForm.photoUrl || undefined,
        });
      }
    } else {
      // Fallback
      await onUpdateInventoryDetails(`inv-${Date.now()}`, {
        category: stockAddCategory,
        stockType: stockAddCategory === 'Die' ? `Die: ${diePunchType} (${dieMaker})` : stockForm.stockType,
        jobSize: stockAddCategory === 'Die' ? diePunchType : (stockForm.jobSize || 'Standard'),
        receivingFrom: stockAddCategory === 'Die' ? dieMaker : stockForm.receivingFrom,
        quantity: stockAddCategory === 'Die' ? Number(dieQuantity) : (Number(stockForm.quantity) || 1000),
        status: 'Not Received',
        isUrgent: false,
        orderedAt: dateFormatted,
        jobName: stockAddCategory === 'Die' ? dieJobName : undefined,
        jobType: stockAddCategory === 'Die' ? dieJobType : undefined,
        dieMaker: stockAddCategory === 'Die' ? dieMaker : undefined,
        punchType: stockAddCategory === 'Die' ? diePunchType : undefined,
        photoUrl: (stockAddCategory === 'Die' ? dieAddPhotoUrl : stockForm.photoUrl) || undefined,
      });
    }
    setDieAddPhotoUrl('');
    setIsAddStockModalOpen(false);
  };

  const handleOpenEditStock = (item: InventoryItem) => {
    setEditingStockItem(item);
    setStockForm({
      stockType: item.stockType,
      jobSize: item.jobSize || '',
      quantity: item.quantity,
      receivingFrom: item.receivingFrom,
      status: item.status === 'Received' ? 'Received' : 'Not Received',
      isUrgent: Boolean(item.isUrgent),
      orderDate: (item.orderedAt || '').split(' ')[0] || todayIso,
      notes: item.notes || '',
      photoUrl: item.photoUrl || '',
    });
  };

  const handleSaveEditStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockItem) return;
    await onUpdateInventoryDetails(editingStockItem.id, {
      stockType: stockForm.stockType,
      jobSize: stockForm.jobSize,
      quantity: Number(stockForm.quantity) || 0,
      receivingFrom: stockForm.receivingFrom,
      status: stockForm.status,
      isUrgent: stockForm.isUrgent,
      orderedAt: `${stockForm.orderDate} 12:00`,
      notes: stockForm.notes,
      photoUrl: stockForm.photoUrl || undefined,
    });
    setEditingStockItem(null);
  };

  const handleOpenAddPressJob = () => {
    setPressForm({
      jobName: '',
      jobType: 'Corrugated Board Slitting & Scoring',
      boardSize: '',
      jobSize: '',
      pressName: availablePresses[0] || 'Flexo Press 1 (4-Color)',
      jobPlacement: 'Factory',
      status: 'Pending',
      isUrgent: false,
      jobDate: todayIso,
      notes: '',
      pressPhotoUrl: '',
    });
    setIsAddPressJobModalOpen(true);
  };

  const handleSaveNewPressJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pressForm.jobName.trim()) return;

    // Auto-fetch linked board size from inventory matching this job
    const linkedBoard =
      inventory.find(
        (i) =>
          i.jobName &&
          i.jobName.trim().toLowerCase() === pressForm.jobName.trim().toLowerCase()
      )?.jobSize || 'Not Ordered Yet';

    if (onAddJob) {
      await onAddJob({
        jobName: pressForm.jobName.trim(),
        jobType: pressForm.jobType,
        boardSize: linkedBoard,
        jobSize: pressForm.jobSize || 'Not Specified',
        pressName: pressForm.pressName,
        jobPlacement: pressForm.jobPlacement,
        status: pressForm.status,
        isUrgent: pressForm.isUrgent,
        createdAt: `${pressForm.jobDate} 12:00`,
        notes: pressForm.notes,
        pressPhotoUrl: pressForm.pressPhotoUrl || undefined,
      } as any);
    }
    setIsAddPressJobModalOpen(false);
  };

  const handleOpenEditPressJob = (job: CorrugationJob) => {
    setEditingPressJob(job);
    const linked = getLinkedBoardSize(job);
    setPressForm({
      jobName: job.jobName,
      jobType: job.jobType,
      boardSize: linked !== 'Not Ordered Yet' ? linked : (job.boardSize || ''),
      jobSize: job.jobSize || '',
      pressName: job.pressName || availablePresses[0] || 'Flexo Press 1',
      jobPlacement: job.jobPlacement,
      status: (job.pressStatus || 'Pending') as any,
      isUrgent: Boolean(job.isUrgent),
      jobDate: (job.createdAt || '').split(' ')[0] || todayIso,
      notes: job.notes || '',
      pressPhotoUrl: job.pressPhotoUrl || '',
    });
  };

  const handleSaveEditPressJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPressJob) return;
    const finalBoardSize = pressForm.boardSize?.trim() || getLinkedBoardSize(editingPressJob);
    await onUpdateJobDetails(editingPressJob.id, {
      jobName: pressForm.jobName.trim(),
      jobType: pressForm.jobType,
      boardSize: finalBoardSize,
      jobSize: pressForm.jobSize.trim(),
      pressName: pressForm.pressName.trim(),
      jobPlacement: pressForm.jobPlacement,
      pressStatus: (pressForm.status === 'Completed' ? 'Completed' : 'Pending'),
      isUrgent: pressForm.isUrgent,
      notes: pressForm.notes,
      pressPhotoUrl: pressForm.pressPhotoUrl || undefined,
    });
    setEditingPressJob(null);
  };

  // -----------------------------------------------------------------
  // PROCESS MANAGEMENT HANDLERS (Add by saving & selecting, mark date, auto-complete)
  // -----------------------------------------------------------------
  const handleSaveAndAddProcessToJob = async (jobId: string, processName: string) => {
    const trimmed = processName.trim();
    if (!trimmed) return;
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    // 1. Save to reusable process list
    if (!savedProcesses.includes(trimmed)) {
      const updatedSaved = [...savedProcesses, trimmed];
      setSavedProcesses(updatedSaved);
      try {
        localStorage.setItem(MG_SAVED_PROCESSES_KEY, JSON.stringify(updatedSaved));
      } catch (e) {
        // ignore
      }
    }

    // 2. Add process step to target job
    const currentSteps = targetJob.processes || [];
    const newStep: JobProcessStep = {
      id: `proc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: trimmed,
      completed: false,
      sequence: currentSteps.length + 1,
    };
    const updatedSteps = [...currentSteps, newStep];

    // Since a new pending process was added, if job was previously marked Completed, it now requires this step
    const allCompleted = updatedSteps.every((p) => p.completed && Boolean(p.completedDate));
    const nextStatus: JobStatus = allCompleted ? 'Completed' : (targetJob.status === 'Completed' ? 'Pending' : targetJob.status);

    await onUpdateJobDetails(targetJob.id, {
      processes: updatedSteps,
      status: nextStatus,
    });

    setCustomProcessInput('');
    setProcessNotification({
      type: 'info',
      message: `Process "${trimmed}" saved and added to job "${targetJob.jobName}".`
    });
  };

  const handleMarkProcessDate = async (jobId: string, stepId: string, dateStr?: string) => {
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    const chosenDate = (dateStr || inlineDateInputs[`${jobId}-${stepId}`] || todayIso).trim();
    const currentSteps = targetJob.processes || [];
    const updatedSteps = currentSteps.map((p) =>
      p.id === stepId ? { ...p, completed: true, completedDate: chosenDate } : p
    );

    // AUTO-COMPLETION RULE:
    // "AFTER COMPELTING ALL THE PROCESS AUTOMATICALLY THE JOB WILL BE COMPLETED"
    const allProcessesCompleted = updatedSteps.length > 0 && updatedSteps.every((p) => p.completed && Boolean(p.completedDate));
    const nextStatus: JobStatus = allProcessesCompleted ? 'Completed' : (targetJob.status === 'Completed' ? 'Pending' : targetJob.status);

    await onUpdateJobDetails(targetJob.id, {
      processes: updatedSteps,
      status: nextStatus,
    });

    if (allProcessesCompleted) {
      setProcessNotification({
        type: 'success',
        message: `🎉 All processes finished for "${targetJob.jobName}"! Job has been automatically marked as COMPLETED.`
      });
    } else {
      setProcessNotification({
        type: 'info',
        message: `Process dated (${chosenDate}) for "${targetJob.jobName}".`
      });
    }
  };

  const handleUnmarkProcessDate = async (jobId: string, stepId: string) => {
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    const currentSteps = targetJob.processes || [];
    const updatedSteps = currentSteps.map((p) =>
      p.id === stepId ? { ...p, completed: false, completedDate: undefined } : p
    );

    // If previously completed, revert to Pending since a process is uncompleted
    const nextStatus: JobStatus = targetJob.status === 'Completed' ? 'Pending' : targetJob.status;

    await onUpdateJobDetails(targetJob.id, {
      processes: updatedSteps,
      status: nextStatus,
    });

    setProcessNotification({
      type: 'info',
      message: `Process reset to Pending. Job status updated to ${nextStatus}.`
    });
  };

  const handleRemoveProcessFromJob = async (jobId: string, stepId: string) => {
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    const updatedSteps = (targetJob.processes || []).filter((p) => p.id !== stepId);
    const allCompleted = updatedSteps.length > 0 && updatedSteps.every((p) => p.completed && Boolean(p.completedDate));
    const nextStatus: JobStatus = allCompleted ? 'Completed' : (targetJob.status === 'Completed' && updatedSteps.length === 0 ? 'Pending' : targetJob.status);

    await onUpdateJobDetails(targetJob.id, {
      processes: updatedSteps,
      status: nextStatus,
    });
  };

  const handleAddStandardPipeline = async (jobId: string) => {
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    const standardSteps = [
      'Corrugation / Fluting (Single / Double Wall)',
      'Flexo Printing & Inking',
      'Die Cutting & Creasing',
      'Folder Gluer / Side Pasting',
      'Wire Stitching & Packaging',
      'Dispatch & Delivery'
    ];

    const currentSteps = targetJob.processes || [];
    const newSteps: JobProcessStep[] = standardSteps.map((name, idx) => ({
      id: `proc-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      completed: false,
      sequence: currentSteps.length + idx + 1,
    }));

    await onUpdateJobDetails(targetJob.id, {
      processes: [...currentSteps, ...newSteps],
      status: 'Pending',
    });

    setProcessNotification({
      type: 'info',
      message: `Standard 6-Step Production Pipeline added to "${targetJob.jobName}".`
    });
  };

  // -----------------------------------------------------------------
  // DELETE CONFIRMATION HANDLER
  // -----------------------------------------------------------------
  const handleExecuteDelete = async () => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === 'job') {
      await onDeleteJob(deleteConfirmTarget.id);
    } else {
      await onDeleteInventory(deleteConfirmTarget.id);
    }
    setDeleteConfirmTarget(null);
  };

  // -----------------------------------------------------------------
  // EXPORT 1: EXCEL (.csv spreadsheet with UTF-8 BOM)
  // -----------------------------------------------------------------
  const exportToExcel = () => {
    setIsExportingExcel(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      if (activeTab === 'stock') {
        const headers = [
          'Item ID',
          'Priority',
          'Stock / Paper Type',
          'Board Size',
          'Quantity (Units)',
          'Supplier / Received From',
          'Linked Job',
          'Status',
          'Order Date',
          'Notes',
        ];

        const rows = filteredStock.map((it) => [
          it.id,
          it.isUrgent ? 'URGENT' : 'NORMAL',
          it.stockType || 'Kraft Liner',
          it.jobSize || 'Standard',
          String(it.quantity || 0),
          it.receivingFrom || '',
          it.jobName || 'Unassigned',
          it.status || 'Not Received',
          it.orderedAt || '',
          it.notes || '',
        ]);

        const csvContent =
          '\uFEFF' +
          [
            'Stock Chart',
            '',
            headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
            ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
          ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Stock_Chart_${today}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (activeTab === 'die') {
        const headers = [
          'Item ID',
          'Priority',
          'Order Date',
          'Job Name',
          'Job Type',
          'Die Maker',
          'Punch Type',
          'Quantity',
          'Status',
          'Notes',
        ];

        const rows = filteredDie.map((it) => [
          it.id,
          it.isUrgent ? 'URGENT' : 'NORMAL',
          (it.orderedAt || '').split(' ')[0],
          it.jobName || 'Unassigned',
          it.jobType || 'General Corrugation',
          it.dieMaker || it.receivingFrom || '',
          it.punchType || it.jobSize || '',
          String(it.quantity || 1),
          it.status || 'Not Received',
          it.notes || '',
        ]);

        const csvContent =
          '\uFEFF' +
          [
            'Die Tooling Chart',
            '',
            headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
            ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
          ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Die_Chart_${today}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Press Data Export
        const headers = [
          'Job ID',
          'Priority',
          'Job Name',
          'Job Type',
          'Board Size',
          'Job Size',
          'Assigned Press Machine',
          'Placement',
          'Status',
          'Created Date',
          'Notes',
        ];

        const rows = filteredPressJobs.map((j) => [
          j.id,
          j.isUrgent ? 'URGENT' : 'NORMAL',
          j.jobName,
          j.jobType,
          getLinkedBoardSize(j),
          j.jobSize || 'Not Specified',
          j.pressName || 'Not Assigned',
          j.jobPlacement,
          j.pressStatus === 'Completed' ? 'Completed' : 'Pending',
          j.createdAt,
          j.notes || '',
        ]);

        const csvContent =
          '\uFEFF' +
          [
            'Press Chart',
            '',
            headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
            ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
          ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Press_Chart_${today}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export CSV/Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // -----------------------------------------------------------------
  // EXPORT 2: IMAGE (.png chart & table canvas snapshot - ALL WHITE & DECENT)
  // -----------------------------------------------------------------
  const exportToImage = () => {
    setIsExportingImage(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const itemsToRender = activeTab === 'stock' ? filteredStock : activeTab === 'die' ? filteredDie : filteredPressJobs;
      const chartTitle = activeTab === 'stock' ? 'Board Stock Inventory Report' : activeTab === 'die' ? 'Die Tooling Registry Report' : 'Press Production Operations Schedule';
      const fileDownloadName = activeTab === 'stock' ? `Stock_Chart_${today}.png` : activeTab === 'die' ? `Die_Chart_${today}.png` : `Press_Chart_${today}.png`;
      const accentColor = activeTab === 'stock' ? '#2563eb' : activeTab === 'die' ? '#7c3aed' : '#d97706';

      // Canvas dimensions without top stats cards (starts directly with title and clean data table)
      const width = 1200;
      const rowHeight = 44;
      const headerHeight = 110;
      const totalRows = Math.min(itemsToRender.length, 35);
      const height = Math.max(340, headerHeight + totalRows * rowHeight + 65);

      // Retina 2x scale
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      // 1. All-white clean canvas background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 2. Elegant outer boundary border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // 3. Top accent brand strip
      ctx.fillStyle = accentColor;
      ctx.fillRect(16, 16, width - 32, 5);

      // 4. Header title & subtitle
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(chartTitle, 36, 52);

      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Generated: ${today}  ·  Corrugation & Converting Plant Operations Registry`, 36, 76);

      // Helper for drawing a rounded rectangle
      const drawRoundRect = (x: number, y: number, w: number, h: number, radius: number, fill: string, stroke: string) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      // 5. Decent Light Table Header (Clean table without top stats cards)
      let y = headerHeight;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(36, y - 18, width - 72, 32);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(36, y - 18, width - 72, 32);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';

      if (activeTab === 'stock') {
        ctx.fillText('PRIORITY', 48, y + 3);
        ctx.fillText('STOCK / BOARD TYPE', 145, y + 3);
        ctx.fillText('BOARD SIZE', 415, y + 3);
        ctx.fillText('QTY (UNITS)', 540, y + 3);
        ctx.fillText('SUPPLIER (FROM)', 670, y + 3);
        ctx.fillText('STATUS', 890, y + 3);
        ctx.fillText('ORDER DATE', 1030, y + 3);
      } else if (activeTab === 'die') {
        ctx.fillText('PRIORITY', 48, y + 3);
        ctx.fillText('DATE', 135, y + 3);
        ctx.fillText('JOB NAME', 225, y + 3);
        ctx.fillText('JOB TYPE', 410, y + 3);
        ctx.fillText('DIE MAKER', 590, y + 3);
        ctx.fillText('PUNCH TYPE', 760, y + 3);
        ctx.fillText('QTY', 895, y + 3);
        ctx.fillText('STATUS', 975, y + 3);
      } else {
        ctx.fillText('PRIORITY', 48, y + 3);
        ctx.fillText('JOB NAME', 145, y + 3);
        ctx.fillText('BOARD SIZE', 380, y + 3);
        ctx.fillText('JOB SIZE', 510, y + 3);
        ctx.fillText('ASSIGNED PRESS', 645, y + 3);
        ctx.fillText('PRESS STATUS', 905, y + 3);
        ctx.fillText('CREATED', 1040, y + 3);
      }

      // 7. Clean Table Rows (White / Light-Slate Alternating)
      itemsToRender.slice(0, 35).forEach((item: any, idx) => {
        y += rowHeight;

        // Alternating row background
        ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        ctx.fillRect(36, y - 18, width - 72, rowHeight);

        // Clean subtle border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(36, y - 18, width - 72, rowHeight);

        const isUrgent = Boolean(item.isUrgent);

        // Draw Priority Badge Helper
        const drawPriorityBadge = (posX: number) => {
          if (isUrgent) {
            drawRoundRect(posX, y - 10, 72, 22, 6, '#fee2e2', '#fca5a5');
            ctx.fillStyle = '#b91c1c';
            ctx.font = 'bold 10px system-ui';
            ctx.fillText('🔥 URGENT', posX + 8, y + 5);
          } else {
            drawRoundRect(posX, y - 10, 60, 22, 6, '#f1f5f9', '#e2e8f0');
            ctx.fillStyle = '#64748b';
            ctx.font = '10px system-ui';
            ctx.fillText('Normal', posX + 12, y + 5);
          }
        };

        if (activeTab === 'stock') {
          // Priority
          drawPriorityBadge(48);

          // Stock Type
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 12px system-ui';
          ctx.fillText((item.stockType || '').slice(0, 32), 145, y + 5);

          // Board Size
          ctx.fillStyle = '#0284c7';
          ctx.font = '11px monospace';
          ctx.fillText(item.jobSize || 'Standard', 415, y + 5);

          // Qty
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(Number(item.quantity || 0).toLocaleString(), 540, y + 5);

          // Supplier
          ctx.fillStyle = '#334155';
          ctx.font = '11px system-ui';
          ctx.fillText((item.receivingFrom || '').slice(0, 24), 670, y + 5);

          // Status Badge
          const isRec = item.status === 'Received';
          if (isRec) {
            drawRoundRect(890, y - 10, 105, 22, 6, '#dcfce7', '#86efac');
            ctx.fillStyle = '#15803d';
            ctx.font = 'bold 10px system-ui';
            ctx.fillText('✅ RECEIVED', 902, y + 5);
          } else {
            drawRoundRect(890, y - 10, 115, 22, 6, '#fef3c7', '#fde68a');
            ctx.fillStyle = '#b45309';
            ctx.font = 'bold 10px system-ui';
            ctx.fillText('⏳ NOT RECEIVED', 900, y + 5);
          }

          // Date
          ctx.fillStyle = '#64748b';
          ctx.font = '10px monospace';
          ctx.fillText((item.orderedAt || '').slice(0, 16), 1030, y + 5);
        } else if (activeTab === 'die') {
          // Priority
          drawPriorityBadge(48);

          // Date
          ctx.fillStyle = '#64748b';
          ctx.font = '10px monospace';
          ctx.fillText((item.orderedAt || '').slice(0, 10), 135, y + 5);

          // Job Name
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 12px system-ui';
          ctx.fillText((item.jobName || 'Unassigned').slice(0, 22), 225, y + 5);

          // Job Type
          ctx.fillStyle = '#475569';
          ctx.font = '11px system-ui';
          ctx.fillText((item.jobType || 'General').slice(0, 20), 410, y + 5);

          // Die Maker
          ctx.fillStyle = '#6d28d9';
          ctx.font = '11px system-ui';
          ctx.fillText((item.dieMaker || item.receivingFrom || '').slice(0, 20), 590, y + 5);

          // Punch Type
          ctx.fillStyle = '#334155';
          ctx.font = '11px system-ui';
          ctx.fillText((item.punchType || item.jobSize || '').slice(0, 16), 760, y + 5);

          // Quantity
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(String(item.quantity || 1), 895, y + 5);

          // Status Badge
          const isRec = item.status === 'Received';
          if (isRec) {
            drawRoundRect(975, y - 10, 95, 22, 6, '#dcfce7', '#86efac');
            ctx.fillStyle = '#15803d';
            ctx.font = 'bold 10px system-ui';
            ctx.fillText('✅ RECEIVED', 985, y + 5);
          } else {
            drawRoundRect(975, y - 10, 95, 22, 6, '#fef3c7', '#fde68a');
            ctx.fillStyle = '#b45309';
            ctx.font = 'bold 10px system-ui';
            ctx.fillText('⏳ PENDING', 988, y + 5);
          }
        } else {
          // Press Row
          drawPriorityBadge(48);

          // Job Name
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 12px system-ui';
          ctx.fillText((item.jobName || '').slice(0, 26), 145, y + 5);

          // Board Size
          ctx.fillStyle = '#b45309';
          ctx.font = '11px monospace';
          ctx.fillText(getLinkedBoardSize(item as CorrugationJob), 380, y + 5);

          // Job Size
          ctx.fillStyle = '#0284c7';
          ctx.font = '11px monospace';
          ctx.fillText(item.jobSize || '—', 510, y + 5);

          // Press Name
          ctx.fillStyle = '#334155';
          ctx.font = '11px system-ui';
          ctx.fillText((item.pressName || 'Not Assigned').slice(0, 24), 645, y + 5);

          // Status Badge (Press status decoupled from Job status!)
          const isComp = (item as CorrugationJob).pressStatus === 'Completed';
          if (isComp) {
            drawRoundRect(905, y - 10, 100, 22, 6, '#dcfce7', '#86efac');
            ctx.fillStyle = '#15803d';
            ctx.font = 'bold 10px system-ui';
            ctx.fillText('✅ COMPLETED', 915, y + 5);
          } else {
            drawRoundRect(905, y - 10, 95, 22, 6, '#fef3c7', '#fde68a');
            ctx.fillStyle = '#b45309';
            ctx.font = 'bold 10px system-ui';
            ctx.fillText('⏳ PENDING', 918, y + 5);
          }

          // Created Date
          ctx.fillStyle = '#64748b';
          ctx.font = '10px monospace';
          ctx.fillText((item.createdAt || '').slice(0, 16), 1040, y + 5);
        }
      });

      // 8. Bottom Decent Footer
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(36, height - 36);
      ctx.lineTo(width - 36, height - 36);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui';
      ctx.fillText(
        `Plant Management Dashboard · ${chartTitle} · ${itemsToRender.length} Total Records`,
        36,
        height - 18
      );

      ctx.font = '11px monospace';
      ctx.fillText(
        `Export Date: ${today}`,
        width - 180,
        height - 18
      );

      // Download PNG
      const link = document.createElement('a');
      link.download = fileDownloadName;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner & View Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Factory Data & Operations Registry
            </h1>
          </div>
        </div>

        {/* Global Export & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Excel Sheet */}
          <button
            onClick={exportToExcel}
            disabled={isExportingExcel}
            className="px-3 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Download formatted Excel (.csv) spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{isExportingExcel ? 'Exporting...' : 'Download Excel'}</span>
          </button>

          {/* Download Chart Image */}
          <button
            onClick={exportToImage}
            disabled={isExportingImage}
            className="px-3 py-2 text-xs font-semibold text-sky-300 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/80 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Download styled high-resolution PNG chart image"
          >
            <ImageIcon className="w-4 h-4 text-sky-400" />
            <span>{isExportingImage ? 'Generating...' : 'Download Chart Image'}</span>
          </button>

          {/* Add Item according to active tab */}
          {activeTab === 'stock' ? (
            <button
              onClick={handleOpenAddStock}
              className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-blue-500 hover:bg-blue-400 active:bg-blue-600 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Ordered Stock</span>
            </button>
          ) : activeTab === 'die' ? (
            <button
              onClick={handleOpenAddDie}
              className="px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Die Tool</span>
            </button>
          ) : activeTab === 'press' ? (
            <button
              onClick={handleOpenAddPressJob}
              className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Press Job</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (selectedProcessJobId) {
                  handleAddStandardPipeline(selectedProcessJobId);
                }
              }}
              className="px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Workflow className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Standard Process Pipeline</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Navigation Tabs: Stock Data vs Die Data vs Press Data vs Process */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'stock'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Stock Data ({rawStockItems.length})</span>
          {urgentStockLots > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
              {urgentStockLots} Urgent
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('die')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'die'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>2. Die Data ({rawDieItems.length})</span>
          {pendingDieLots > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
              {pendingDieLots} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('press')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'press'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>3. Press Data ({totalPressJobs})</span>
          {urgentPressJobs > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
              {urgentPressJobs} Urgent
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('process')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'process'
              ? 'border-teal-500 text-teal-400 bg-teal-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Workflow className="w-4 h-4 text-teal-400" />
          <span>4. Process ({jobsWithProcessesCount}/{jobs.length})</span>
          {inProgressProcessJobs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold">
              {inProgressProcessJobs.length} Active
            </span>
          )}
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: ORDERED STOCK DATA */}
      {/* =================================================================== */}
      {activeTab === 'stock' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Stock KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Lots</span>
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{totalStockLots}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Received</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{receivedStockLots}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Pending</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">{pendingStockLots}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Urgent</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">{urgentStockLots}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-4 lg:col-span-1">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Suppliers</span>
                <Database className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-purple-300">
                {new Set(inventory.map((i) => i.receivingFrom).filter(Boolean)).size}
              </div>
            </div>
          </div>

          {/* Visual Progress / Distribution Chart */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Stock Fulfillment Breakdown</span>
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                {receivedStockLots} of {totalStockLots} Received
              </span>
            </div>
            
            {/* Multi-segment bar */}
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex">
              {totalStockLots > 0 ? (
                <>
                  <div
                    style={{ width: `${(receivedStockLots / totalStockLots) * 100}%` }}
                    className="bg-emerald-500 h-full transition-all duration-300"
                    title={`Received: ${receivedStockLots}`}
                  />
                  <div
                    style={{ width: `${(pendingStockLots / totalStockLots) * 100}%` }}
                    className="bg-amber-500 h-full transition-all duration-300"
                    title={`Not Received: ${pendingStockLots}`}
                  />
                </>
              ) : (
                <div className="w-full bg-slate-800 h-full" />
              )}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
                <span>Received ({receivedStockLots})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
                <span>Not Received ({pendingStockLots})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
                <span>Urgent Flags ({urgentStockLots})</span>
              </div>
            </div>
          </div>

          {/* Search, Filter & Quick Options */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="Search stock type, vendor, board size, or job..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                {stockSearch && (
                  <button
                    onClick={() => setStockSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shrink-0">
                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium">Date:</span>
                <input
                  type="date"
                  value={stockDateFilter}
                  onChange={(e) => setStockDateFilter(e.target.value)}
                  className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark] cursor-pointer"
                />
                {stockDateFilter ? (
                  <button
                    type="button"
                    onClick={() => setStockDateFilter('')}
                    title="Clear date filter"
                    className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStockDateFilter(todayIso)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold px-1.5 py-0.5 rounded bg-blue-950/40 border border-blue-800/40 cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  stockFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All ({inventory.length})
              </button>
              <button
                onClick={() => setStockFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  stockFilter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                ⏳ Not Received ({pendingStockLots})
              </button>
              <button
                onClick={() => setStockFilter('received')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  stockFilter === 'received'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                ✅ Received ({receivedStockLots})
              </button>
              <button
                onClick={() => setStockFilter('urgent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  stockFilter === 'urgent'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                🔥 Urgent ({urgentStockLots})
              </button>
              <button
                onClick={exportToImage}
                disabled={isExportingImage}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-blue-950/70 hover:bg-blue-900/70 text-blue-300 border border-blue-800/80 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                title="Download styled PNG Stock Chart"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>{isExportingImage ? 'Generating...' : 'Download Stock Chart'}</span>
              </button>
            </div>
          </div>

          {/* Ordered Stock Data Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Urgent Flag</th>
                    <th className="py-3 px-4">Stock / Paper Type</th>
                    <th className="py-3 px-4">Board Size</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Supplier (From)</th>
                    <th className="py-3 px-4">Linked Job</th>
                    <th className="py-3 px-4">Receiving Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-400" />
                        <p className="text-sm font-medium text-slate-400">No ordered stock found</p>
                        <p className="text-xs text-slate-600 mt-1">
                          Click "+ Add Ordered Stock" above to record ordered paper rolls or board lots.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredStock.map((item) => {
                      const isReceived = item.status === 'Received';
                      const isUrgent = Boolean(item.isUrgent);

                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isUrgent ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          {/* 1. Urgent Toggle Button */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleStockUrgent(item)}
                              title={isUrgent ? 'Click to remove Urgent priority' : 'Click to mark Urgent'}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isUrgent
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 shadow-xs'
                                  : 'bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700'
                              }`}
                            >
                              <Flame className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400 fill-rose-400 animate-pulse' : 'text-slate-500'}`} />
                              <span>{isUrgent ? 'URGENT' : 'Normal'}</span>
                            </button>
                          </td>

                          {/* 2. Stock Type */}
                          <td className="py-3 px-4 font-medium text-white">
                            <div className="font-semibold text-slate-100">{item.stockType}</div>
                            {item.notes && (
                              <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.notes}</div>
                            )}
                          </td>

                          {/* 3. Board Size */}
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {item.jobSize || <span className="text-slate-600">Standard</span>}
                          </td>

                          {/* 4. Quantity */}
                          <td className="py-3 px-4 font-mono font-bold text-sky-400">
                            {Number(item.quantity).toLocaleString()}{' '}
                            <span className="text-[10px] font-normal text-slate-500">units</span>
                          </td>

                          {/* 5. Supplier */}
                          <td className="py-3 px-4 text-slate-300 font-medium">
                            {item.receivingFrom || <span className="text-slate-600">Varun Board / Unspecified</span>}
                          </td>

                          {/* 6. Linked Job */}
                          <td className="py-3 px-4 text-slate-400">
                            {item.jobName ? (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 text-[11px]">
                                {item.jobName}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[11px]">Stock Buffer</span>
                            )}
                          </td>

                          {/* 7. Receiving Status Toggle (Mark Received / Not Received) */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleStockReceived(item)}
                              title={isReceived ? 'Click to mark Not Received' : 'Click to mark Received'}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                                isReceived
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                              }`}
                            >
                              {isReceived ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>✅ Received</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                                  <span>⏳ Not Received</span>
                                </>
                              )}
                            </button>
                            {isReceived && item.receivedAt && (
                              <div className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{item.receivedAt}</span>
                              </div>
                            )}
                            {item.isExistingStock && (
                              <div className="text-[10px] text-emerald-300 font-mono mt-0.5 font-semibold">
                                📦 Existing Stock
                              </div>
                            )}
                          </td>

                          {/* 8. Actions (Detail & 3-Dot Menu) */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 relative">
                              <button
                                type="button"
                                onClick={() => setDetailStockItem(item)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Show Stock Detail"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-400" />
                                <span>Detail</span>
                              </button>

                              {/* 3-DOT MENU BUTTON */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownMenu(
                                      activeDropdownMenu?.section === 'stock' && activeDropdownMenu?.id === item.id
                                        ? null
                                        : { section: 'stock', id: item.id }
                                    );
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="3-Dot Menu: Details & Quick Controls"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* FLOATING 3-DOT DROPDOWN MENU */}
                                {activeDropdownMenu?.section === 'stock' && activeDropdownMenu?.id === item.id && (
                                  <div 
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-1 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        setDetailStockItem(item);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                                      <span>Show Detail</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        handleToggleStockReceived(item);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <CheckCircle2 className={`w-3.5 h-3.5 ${isReceived ? 'text-emerald-400' : 'text-slate-400'}`} />
                                      <span>{isReceived ? 'Mark Not Received' : 'Mark Received'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        handleToggleStockUrgent(item);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Flame className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400 fill-rose-400' : 'text-slate-400'}`} />
                                      <span>{isUrgent ? 'Remove Urgent' : 'Mark Urgent 🔥'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        handleOpenEditStock(item);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Edit Stock Specs</span>
                                    </button>

                                    <div className="my-1 border-t border-slate-800" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        setDeleteConfirmTarget({
                                          type: 'inventory',
                                          id: item.id,
                                          name: `${item.stockType} (${item.quantity} units)`,
                                        });
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Record</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400 font-mono">
              Showing <strong>{filteredStock.length}</strong> of <strong>{rawStockItems.length}</strong> stock items
            </div>
          </div>

        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: DIE TOOLING DATA */}
      {/* =================================================================== */}
      {activeTab === 'die' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Die KPI Cards */}
          {/* Die KPI Cards (4 clean cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Die Tools</span>
                <Scissors className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{totalDieLots}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Received</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{receivedDieLots}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Pending</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">{pendingDieLots}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Urgent Dies</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">{urgentDieLots}</div>
            </div>
          </div>

          {/* Visual Progress / Distribution Chart for Die */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                <span>Die Tooling Readiness Breakdown</span>
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                {receivedDieLots} of {totalDieLots} Received
              </span>
            </div>
            
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex">
              {totalDieLots > 0 ? (
                <>
                  <div
                    style={{ width: `${(receivedDieLots / totalDieLots) * 100}%` }}
                    className="bg-emerald-500 h-full transition-all duration-300"
                    title={`Received: ${receivedDieLots}`}
                  />
                  <div
                    style={{ width: `${(pendingDieLots / totalDieLots) * 100}%` }}
                    className="bg-amber-500 h-full transition-all duration-300"
                    title={`Not Received: ${pendingDieLots}`}
                  />
                </>
              ) : (
                <div className="w-full bg-slate-800 h-full" />
              )}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
                <span>Received ({receivedDieLots})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
                <span>Not Received ({pendingDieLots})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
                <span>Urgent Dies ({urgentDieLots})</span>
              </div>
            </div>
          </div>

          {/* Search, Filter & Quick Options for Die */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={dieSearch}
                  onChange={(e) => setDieSearch(e.target.value)}
                  placeholder="Search job name, die maker, or punch type..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                {dieSearch && (
                  <button
                    onClick={() => setDieSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shrink-0">
                <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium">Date:</span>
                <input
                  type="date"
                  value={dieDateFilter}
                  onChange={(e) => setDieDateFilter(e.target.value)}
                  className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark] cursor-pointer"
                />
                {dieDateFilter ? (
                  <button
                    type="button"
                    onClick={() => setDieDateFilter('')}
                    title="Clear date filter"
                    className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDieDateFilter(todayIso)}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold px-1.5 py-0.5 rounded bg-purple-950/40 border border-purple-800/40 cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setDieFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  dieFilter === 'all'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All ({totalDieLots})
              </button>
              <button
                onClick={() => setDieFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  dieFilter === 'pending'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                ⏳ Not Received ({pendingDieLots})
              </button>
              <button
                onClick={() => setDieFilter('received')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  dieFilter === 'received'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                ✅ Received ({receivedDieLots})
              </button>
              <button
                onClick={() => setDieFilter('urgent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  dieFilter === 'urgent'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                🔥 Urgent ({urgentDieLots})
              </button>
              <button
                onClick={exportToImage}
                disabled={isExportingImage}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-purple-950/70 hover:bg-purple-900/70 text-purple-300 border border-purple-800/80 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                title="Download styled PNG Die Tooling Chart"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>{isExportingImage ? 'Generating...' : 'Download Die Chart'}</span>
              </button>
            </div>
          </div>

          {/* Die Tooling Data Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Urgent Flag</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Job Name</th>
                    <th className="py-3 px-4">Job Type</th>
                    <th className="py-3 px-4">Die Maker</th>
                    <th className="py-3 px-4">Punch Type</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Receiving Status</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredDie.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        <Scissors className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
                        <p className="text-sm font-medium text-slate-400">No die tooling records found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDie.map((item) => {
                      const isReceived = item.status === 'Received';
                      const isUrgent = Boolean(item.isUrgent);
                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isUrgent ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          {/* 1. Urgent Toggle Button for Die */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleDieUrgent(item)}
                              title={isUrgent ? 'Click to remove Urgent priority' : 'Click to mark Urgent'}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isUrgent
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 shadow-xs'
                                  : 'bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700'
                              }`}
                            >
                              <Flame className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400 fill-rose-400 animate-pulse' : 'text-slate-500'}`} />
                              <span>{isUrgent ? 'URGENT' : 'Normal'}</span>
                            </button>
                          </td>

                          {/* 2. Order Date */}
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {(item.orderedAt || '').split(' ')[0] || '—'}
                          </td>

                          {/* 3. Job Name */}
                          <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                            {item.jobName || 'Unassigned'}
                          </td>

                          {/* 4. Job Type */}
                          <td className="py-3 px-4 text-slate-300">
                            {item.jobType || 'General Corrugation'}
                          </td>

                          {/* 5. Die Maker */}
                          <td className="py-3 px-4 text-purple-300 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{item.dieMaker || item.receivingFrom || 'Apex Laser Dies'}</span>
                              {item.photoUrl && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage({
                                      url: item.photoUrl!,
                                      title: `${item.dieMaker || 'Die'} Tool Proof`,
                                    });
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                                  title="View uploaded Die Photo"
                                >
                                  <Camera className="w-3 h-3 text-purple-400" />
                                  <span>Photo</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 6. Punch Type */}
                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                            {item.punchType || item.jobSize || 'Rotary Die Punch'}
                          </td>

                          {/* 7. Quantity */}
                          <td className="py-3 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                            {item.quantity || 1}
                          </td>

                          {/* 8. Receiving Status Toggle */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleDieReceived(item)}
                              title={isReceived ? 'Click to mark Not Received' : 'Click to mark Received'}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isReceived
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                              }`}
                            >
                              {isReceived ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>✅ Received</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>⏳ Not Received</span>
                                </>
                              )}
                            </button>
                            {isReceived && item.receivedAt && (
                              <div className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{item.receivedAt}</span>
                              </div>
                            )}
                          </td>

                          {/* 9. Notes */}
                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                            {item.notes || '—'}
                          </td>

                          {/* 10. Actions (Detail & 3-Dot Menu) */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 relative">
                              <button
                                type="button"
                                onClick={() => setDetailDieItem(item)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Show Die Detail"
                              >
                                <Eye className="w-3.5 h-3.5 text-purple-400" />
                                <span>Detail</span>
                              </button>

                              {/* 3-DOT MENU BUTTON */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownMenu(
                                      activeDropdownMenu?.section === 'die' && activeDropdownMenu?.id === item.id
                                        ? null
                                        : { section: 'die', id: item.id }
                                    );
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="3-Dot Menu: Details & Quick Controls"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* FLOATING 3-DOT DROPDOWN MENU */}
                                {activeDropdownMenu?.section === 'die' && activeDropdownMenu?.id === item.id && (
                                  <div 
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-1 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        setDetailDieItem(item);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-semibold text-purple-400 hover:bg-purple-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-purple-400" />
                                      <span>Show Detail</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        handleToggleDieReceived(item);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <CheckCircle2 className={`w-3.5 h-3.5 ${isReceived ? 'text-emerald-400' : 'text-slate-400'}`} />
                                      <span>{isReceived ? 'Mark Not Received' : 'Mark Received'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        handleToggleDieUrgent(item);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Flame className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400 fill-rose-400' : 'text-slate-400'}`} />
                                      <span>{isUrgent ? 'Remove Urgent' : 'Mark Urgent 🔥'}</span>
                                    </button>

                                    <div className="my-1 border-t border-slate-800" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        setDeleteConfirmTarget({
                                          type: 'inventory',
                                          id: item.id,
                                          name: item.stockType || item.jobName || 'Die Record',
                                        });
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Record</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400 font-mono">
              Showing <strong>{filteredDie.length}</strong> of <strong>{totalDieLots}</strong> die tooling records
            </div>
          </div>

        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: PRESS OPERATIONS DATA */}
      {/* =================================================================== */}
      {activeTab === 'press' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Press KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Jobs</span>
                <Printer className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{totalPressJobs}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Completed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{completedPressJobs}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Pending</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">{pendingPressJobs}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Urgent</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">{urgentPressJobs}</div>
            </div>
          </div>

          {/* Press Progress Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Press Production Progress</span>
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                {completedPressJobs} of {totalPressJobs} Runs Completed
              </span>
            </div>
            
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex">
              {totalPressJobs > 0 ? (
                <>
                  <div
                    style={{ width: `${(completedPressJobs / totalPressJobs) * 100}%` }}
                    className="bg-emerald-500 h-full transition-all duration-300"
                    title={`Completed: ${completedPressJobs}`}
                  />
                  <div
                    style={{ width: `${(pendingPressJobs / totalPressJobs) * 100}%` }}
                    className="bg-amber-500 h-full transition-all duration-300"
                    title={`Pending: ${pendingPressJobs}`}
                  />
                </>
              ) : (
                <div className="w-full bg-slate-800 h-full" />
              )}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
                <span>Completed ({completedPressJobs})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
                <span>Pending ({pendingPressJobs})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
                <span>Urgent ({urgentPressJobs})</span>
              </div>
            </div>
          </div>

          {/* Search, Filter & Quick Options */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={pressSearch}
                  onChange={(e) => setPressSearch(e.target.value)}
                  placeholder="Search job name, press machine, board size, job size..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                {pressSearch && (
                  <button
                    onClick={() => setPressSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shrink-0">
                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium">Date:</span>
                <input
                  type="date"
                  value={pressDateFilter}
                  onChange={(e) => setPressDateFilter(e.target.value)}
                  className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark] cursor-pointer"
                />
                {pressDateFilter ? (
                  <button
                    type="button"
                    onClick={() => setPressDateFilter('')}
                    title="Clear date filter"
                    className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPressDateFilter(todayIso)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setPressFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  pressFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All ({jobs.length})
              </button>
              <button
                onClick={() => setPressFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  pressFilter === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                ⏳ Pending ({pendingPressJobs})
              </button>
              <button
                onClick={() => setPressFilter('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  pressFilter === 'completed'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                ✅ Completed ({completedPressJobs})
              </button>
              <button
                onClick={() => setPressFilter('urgent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  pressFilter === 'urgent'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                🔥 Urgent ({urgentPressJobs})
              </button>
              <button
                onClick={exportToImage}
                disabled={isExportingImage}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-amber-950/70 hover:bg-amber-900/70 text-amber-300 border border-amber-800/80 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                title="Download styled PNG Press Chart"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{isExportingImage ? 'Generating...' : 'Download Press Chart'}</span>
              </button>
            </div>
          </div>

          {/* Press Data Table with Board Size, Job Size, Press Name, Status & Urgent */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Urgent Flag</th>
                    <th className="py-3 px-4">Job Name</th>
                    <th className="py-3 px-4">Board Size</th>
                    <th className="py-3 px-4">Job Size</th>
                    <th className="py-3 px-4">Assigned Press Name</th>
                    <th className="py-3 px-4">Job Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredPressJobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <Printer className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
                        <p className="text-sm font-medium text-slate-400">No press jobs found</p>
                        <p className="text-xs text-slate-600 mt-1">
                          Click "+ Add Press Job" above to record job details including board size, job size, and press assignment.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPressJobs.map((job) => {
                      const isCompleted = job.pressStatus === 'Completed';
                      const isUrgent = Boolean(job.isUrgent);

                      return (
                        <tr 
                          key={job.id} 
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isUrgent ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          {/* 1. Urgent Toggle */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              onClick={() => handleTogglePressUrgent(job)}
                              title={isUrgent ? 'Click to remove Urgent priority' : 'Click to mark Urgent'}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isUrgent
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 shadow-xs'
                                  : 'bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700'
                              }`}
                            >
                              <Flame className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400 fill-rose-400 animate-pulse' : 'text-slate-500'}`} />
                              <span>{isUrgent ? 'URGENT' : 'Normal'}</span>
                            </button>
                          </td>

                          {/* 2. Job Name */}
                          <td className="py-3 px-4 font-semibold text-white">
                            <div className="text-slate-100">{job.jobName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{job.jobPlacement} Line</div>
                          </td>

                          {/* 3. Board Size (Same as Board Ordered for Job) */}
                          <td className="py-3 px-4 font-mono">
                            <span 
                              className="px-2 py-0.5 rounded bg-slate-950 border border-amber-500/30 text-amber-300 font-bold"
                              title="Board size matched from stock ordered for this job"
                            >
                              {getLinkedBoardSize(job)}
                            </span>
                          </td>

                          {/* 4. Job Size (Fillable / Editable detail) */}
                          <td className="py-3 px-4 font-mono">
                            {job.jobSize ? (
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-300 font-bold">
                                {job.jobSize}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenEditPressJob(job)}
                                className="text-slate-500 hover:text-sky-400 italic flex items-center gap-1 cursor-pointer"
                              >
                                <span>+ Fill Job Size</span>
                              </button>
                            )}
                          </td>

                          {/* 5. Assigned Press Name (Fillable / Editable detail) */}
                          <td className="py-3 px-4 text-slate-200 font-medium">
                            <div className="flex items-center gap-2">
                              {job.pressName ? (
                                <div className="flex items-center gap-1.5">
                                  <Printer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="font-semibold">{job.pressName}</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenEditPressJob(job)}
                                  className="text-slate-500 hover:text-amber-400 italic flex items-center gap-1 cursor-pointer"
                                >
                                  <span>+ Assign Press Name</span>
                                </button>
                              )}
                              {job.pressPhotoUrl && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage({
                                      url: job.pressPhotoUrl!,
                                      title: `${job.jobName} - Press Run Proof`,
                                    });
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                                  title="View Press Run / Proof Photo"
                                >
                                  <Camera className="w-3 h-3 text-amber-400" />
                                  <span>Photo</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 6. Job Type */}
                          <td className="py-3 px-4 text-slate-400">
                            <span className="truncate block max-w-xs">{job.jobType}</span>
                          </td>

                          {/* 7. Status Toggle (Completed / Pending) */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <button
                              onClick={() => handleTogglePressStatus(job)}
                              title={isCompleted ? 'Click to mark Pending' : 'Click to mark Completed'}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                                isCompleted
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                              }`}
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>✅ Completed</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>⏳ Pending</span>
                                </>
                              )}
                            </button>
                            {isCompleted && job.pressCompletedAt && (
                              <div className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{job.pressCompletedAt}</span>
                              </div>
                            )}
                          </td>

                          {/* 8. Actions (Fill / Edit details, Delete) */}
                          {/* 8. Actions (Detail & 3-Dot Menu) */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5 relative">
                              <button
                                type="button"
                                onClick={() => setDetailPressJob(job)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Show Press Detail"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-400" />
                                <span>Detail</span>
                              </button>

                              {/* 3-DOT MENU BUTTON */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownMenu(
                                      activeDropdownMenu?.section === 'press' && activeDropdownMenu?.id === job.id
                                        ? null
                                        : { section: 'press', id: job.id }
                                    );
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="3-Dot Menu: Details & Quick Controls"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* FLOATING 3-DOT DROPDOWN MENU */}
                                {activeDropdownMenu?.section === 'press' && activeDropdownMenu?.id === job.id && (
                                  <div 
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        setDetailPressJob(job);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Show Detail</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        handleTogglePressStatus(job);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-400' : 'text-slate-400'}`} />
                                      <span>{isCompleted ? 'Mark Press Pending' : 'Mark Press Completed'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        handleTogglePressUrgent(job);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Flame className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400 fill-rose-400' : 'text-slate-400'}`} />
                                      <span>{isUrgent ? 'Remove Urgent' : 'Mark Urgent 🔥'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        handleOpenEditPressJob(job);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Edit Press Specs</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setActiveDropdownMenu(null);
                                        // Mark as Non-Printed and remove from Press Data
                                        await onUpdateJobDetails(job.id, { isPrinted: false, pressName: '' });
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                                      title="Mark as Non-Printed plain kraft board (removes from printing schedule)"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                                      <span>Mark Non-Printed (Remove)</span>
                                    </button>

                                    <div className="my-1 border-t border-slate-800" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownMenu(null);
                                        setDeleteConfirmTarget({
                                          type: 'job',
                                          id: job.id,
                                          name: job.jobName,
                                        });
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Job</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
              <div>
                Showing <strong>{filteredPressJobs.length}</strong> of <strong>{jobs.length}</strong> press jobs
              </div>
              <div className="text-[11px] text-slate-500">
                Click <strong>Fill / Edit</strong> to update board size, job size, or machine name
              </div>
            </div>
          </div>

        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: MANUFACTURING PROCESS TRACKING & PIPELINE */}
      {/* =================================================================== */}
      {activeTab === 'process' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Process Notification Banner (Auto-Dismiss or Dismiss button) */}
          {processNotification && (
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-md transition-all ${
              processNotification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : 'bg-teal-950/80 border-teal-500 text-teal-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold">{processNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setProcessNotification(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Jobs</span>
                <Database className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{jobs.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">All registered jobs</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Configured Pipelines</span>
                <Workflow className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400">{jobsWithProcessesCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Jobs with process steps</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>In-Progress</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">{inProgressProcessJobs.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Pending process stages</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Auto-Completed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{fullyCompletedProcessJobs.length}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">All processes finished</div>
            </div>
          </div>

          {/* Section 1: Process Manager & Step Builder for Selected Job */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Job Process Configuration & Date Completion
                  </h2>
                  <p className="text-xs text-slate-400">
                    Select a job, add processes by saving & selecting, mark completion dates, and automatically finalize the job.
                  </p>
                </div>
              </div>

              {/* Select Job Picker */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                  Selected Job:
                </label>
                <select
                  value={selectedProcessJobId}
                  onChange={(e) => setSelectedProcessJobId(e.target.value)}
                  className="px-3 py-2 bg-slate-950 border border-teal-500/40 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-teal-400 cursor-pointer min-w-[220px]"
                >
                  {jobs.length === 0 ? (
                    <option value="">No jobs available</option>
                  ) : (
                    jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.jobName} ({j.status === 'Completed' ? '✅ Completed' : '⏳ Pending'} · {(j.processes?.length || 0)} steps)
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Currently Active Selected Job Details */}
            {(() => {
              const currentJob = jobs.find((j) => j.id === selectedProcessJobId) || jobs[0];
              if (!currentJob) {
                return (
                  <div className="p-8 text-center text-slate-500">
                    <p>No jobs found. Create a job first to assign processes.</p>
                  </div>
                );
              }

              const steps = currentJob.processes || [];
              const completedCount = steps.filter((s) => s.completed && Boolean(s.completedDate)).length;
              const totalCount = steps.length;
              const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              const isAllDone = totalCount > 0 && completedCount === totalCount;

              return (
                <div className="space-y-6">
                  {/* Selected Job Status Card */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{currentJob.jobName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {currentJob.jobPlacement} Line
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                          isAllDone || currentJob.status === 'Completed'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          {isAllDone || currentJob.status === 'Completed' ? '✅ Job Status: Completed' : '⏳ Job Status: Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Type: <span className="text-slate-300 font-medium">{currentJob.jobType}</span> · Progress: <strong className="text-teal-400">{completedCount} of {totalCount}</strong> processes finished ({percent}%)
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full sm:w-56 space-y-1.5 shrink-0">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Pipeline Completion</span>
                        <span className="font-bold text-teal-400">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className={`h-full transition-all duration-300 ${
                            isAllDone ? 'bg-emerald-400' : 'bg-teal-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Add Process to Selected Job (Save & Select) */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-teal-900/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs font-bold text-teal-300 flex items-center gap-1.5 uppercase tracking-wider">
                        <Plus className="w-3.5 h-3.5 text-teal-400" />
                        <span>Add Process by Saving & Selecting</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddStandardPipeline(currentJob.id)}
                        className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer underline decoration-dotted"
                      >
                        <span>⚡ Add Standard 6-Step Pipeline</span>
                      </button>
                    </div>

                    {/* Custom Process Input with Save & Select Button */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={customProcessInput}
                        onChange={(e) => setCustomProcessInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveAndAddProcessToJob(currentJob.id, customProcessInput);
                          }
                        }}
                        placeholder="Type process name (e.g. UV Varnishing, Die Punching, Box Gluing)..."
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveAndAddProcessToJob(currentJob.id, customProcessInput)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save & Select (+ Add to Job)</span>
                      </button>
                    </div>

                    {/* Reusable Saved Process Chips (Click to select & add) */}
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1.5">
                        Or click from saved reusable processes to add to <strong>{currentJob.jobName}</strong>:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {savedProcesses.map((pName) => {
                          const isAlreadyAdded = steps.some((s) => s.name.toLowerCase() === pName.toLowerCase());
                          return (
                            <button
                              key={pName}
                              type="button"
                              onClick={() => handleSaveAndAddProcessToJob(currentJob.id, pName)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 border ${
                                isAlreadyAdded
                                  ? 'bg-teal-950/40 text-teal-300 border-teal-800/60 hover:bg-teal-900/50'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-teal-500/50 hover:text-white'
                              }`}
                              title={isAlreadyAdded ? 'Already added (click to add another stage)' : 'Click to add process to job'}
                            >
                              <Plus className="w-3 h-3 text-teal-400" />
                              <span>{pName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Steps Table: Option Beside Job to Mark Process as Date */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Workflow className="w-3.5 h-3.5 text-teal-400" />
                        <span>Assigned Processes & Date Completion</span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {completedCount} / {totalCount} Completed
                      </span>
                    </div>

                    {steps.length === 0 ? (
                      <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
                        <Workflow className="w-8 h-8 mx-auto text-slate-600" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-300">No processes assigned to this job yet</p>
                          <p className="text-xs text-slate-500">
                            Use the form above to add custom processes by saving and selecting them, or click below to populate the standard pipeline.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddStandardPipeline(currentJob.id)}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Standard 6-Step Production Pipeline</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {steps.map((step, idx) => {
                          const isDone = step.completed && Boolean(step.completedDate);
                          const inputKey = `${currentJob.id}-${step.id}`;
                          const currentInputValue = inlineDateInputs[inputKey] || todayIso;

                          return (
                            <div
                              key={step.id}
                              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                isDone
                                  ? 'bg-emerald-950/20 border-emerald-800/60'
                                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {/* Step Index & Name */}
                              <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                                    <span>{step.name}</span>
                                    {isDone && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                        Completed
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    Stage {idx + 1} of {totalCount}
                                  </span>
                                </div>
                              </div>

                              {/* OPTION BESIDE JOB TO MARK PROCESS AS DATE */}
                              <div className="flex flex-wrap items-center gap-2">
                                {isDone ? (
                                  /* Completed Badge with Date and Reset option */
                                  <div className="flex items-center gap-2">
                                    <div className="px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-700 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs">
                                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Date Marked: {step.completedDate}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleUnmarkProcessDate(currentJob.id, step.id)}
                                      className="text-[11px] text-slate-400 hover:text-amber-300 underline cursor-pointer px-1 py-0.5"
                                      title="Reset this step to pending"
                                    >
                                      Change / Reset
                                    </button>
                                  </div>
                                ) : (
                                  /* Date Picker & Mark as Date Button */
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                                      <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                      <input
                                        type="date"
                                        value={currentInputValue}
                                        onChange={(e) =>
                                          setInlineDateInputs((prev) => ({
                                            ...prev,
                                            [inputKey]: e.target.value,
                                          }))
                                        }
                                        className="bg-transparent text-xs text-white [color-scheme:dark] focus:outline-none"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleMarkProcessDate(currentJob.id, step.id, currentInputValue)}
                                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                                      title="Mark this process completed with the selected date"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Mark as Date</span>
                                    </button>
                                  </div>
                                )}

                                {/* Remove Step Button */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProcessFromJob(currentJob.id, step.id)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Remove this process step"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Automatic completion callout when all processes completed */}
                        {isAllDone && (
                          <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-600/80 text-emerald-200 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                            <div>
                              <strong className="font-bold text-white block">
                                All processes for "{currentJob.jobName}" are completed!
                              </strong>
                              <span className="text-emerald-300 text-xs">
                                As requested, this job has been automatically updated to <strong>COMPLETED</strong> in the factory database.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section 2: Master Process Operations Board (All Jobs) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">All Jobs Process Pipeline Board</h3>
                <p className="text-xs text-slate-400">
                  Real-time overview of all jobs. Mark dates beside any job directly.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={processSearch}
                    onChange={(e) => setProcessSearch(e.target.value)}
                    placeholder="Search jobs..."
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setProcessStatusFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    processStatusFilter === 'all'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  All ({jobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProcessStatusFilter('pending')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    processStatusFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => setProcessStatusFilter('completed')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    processStatusFilter === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>

            {/* Jobs List with Pipeline Beside Each Job */}
            <div className="space-y-3">
              {filteredProcessJobs.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Workflow className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-400">No jobs matching filters</p>
                </div>
              ) : (
                filteredProcessJobs.map((job) => {
                  const jobSteps = job.processes || [];
                  const completedSteps = jobSteps.filter((s) => s.completed && Boolean(s.completedDate));
                  const isDone = jobSteps.length > 0 && completedSteps.length === jobSteps.length;
                  const isSelected = selectedProcessJobId === job.id;

                  return (
                    <div
                      key={job.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-teal-500/80 bg-slate-950/90 shadow-md ring-1 ring-teal-500/30'
                          : isDone
                          ? 'border-emerald-800/40 bg-slate-950/60'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Job Overview */}
                        <div className="space-y-1 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{job.jobName}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                              isDone || job.status === 'Completed'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}>
                              {isDone || job.status === 'Completed' ? '✅ Completed' : '⏳ Pending'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {job.jobType} · <span className="font-mono text-slate-300">{job.jobPlacement} Line</span>
                          </div>
                        </div>

                        {/* Pipeline Steps Beside Job */}
                        <div className="flex-1 overflow-x-auto pb-1 lg:pb-0">
                          {jobSteps.length === 0 ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                              <span>No processes assigned yet.</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProcessJobId(job.id);
                                  handleAddStandardPipeline(job.id);
                                }}
                                className="text-teal-400 hover:text-teal-300 font-semibold underline cursor-pointer"
                              >
                                + Add Standard Pipeline
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {jobSteps.map((step, sIdx) => {
                                const stepCompleted = step.completed && Boolean(step.completedDate);
                                return (
                                  <div
                                    key={step.id}
                                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium shrink-0 flex items-center gap-1.5 ${
                                      stepCompleted
                                        ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700'
                                        : 'bg-slate-900 text-slate-300 border-slate-800'
                                    }`}
                                  >
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                                      stepCompleted ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      {sIdx + 1}
                                    </span>
                                    <span>{step.name}</span>
                                    {stepCompleted ? (
                                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                        📅 {step.completedDate}
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleMarkProcessDate(job.id, step.id, todayIso)}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 hover:bg-teal-500/40 text-teal-300 border border-teal-500/30 cursor-pointer font-bold"
                                        title={`Mark completed today (${todayIso})`}
                                      >
                                        Mark Today
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Action: Manage / Select in Editor */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProcessJobId(job.id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-teal-600 text-white font-bold'
                                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                            }`}
                          >
                            <Workflow className="w-3.5 h-3.5" />
                            <span>{isSelected ? 'Managing' : 'Manage Processes'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: ADD ORDERED STOCK */}
      {/* =================================================================== */}
      {isAddStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Add New Ordered Stock Record</h3>
              </div>
              <button
                onClick={() => setIsAddStockModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode switcher: Stock vs Die */}
            <div className="flex border-b border-slate-800 mt-3 mb-4">
              <button
                type="button"
                onClick={() => setStockAddCategory('Stock')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  stockAddCategory === 'Stock'
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>1. Paper / Board Stock</span>
              </button>
              <button
                type="button"
                onClick={() => setStockAddCategory('Die')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  stockAddCategory === 'Die'
                    ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>2. Die Tool</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewStock} className="space-y-4">
              {/* Date Option for both Stock & Die */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Order Date <span className="text-amber-400">*</span></span>
                </label>
                <input
                  type="date"
                  required
                  value={stockForm.orderDate}
                  onChange={(e) => setStockForm({ ...stockForm, orderDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white [color-scheme:dark] focus:outline-none focus:border-blue-500"
                />
              </div>

              {stockAddCategory === 'Die' ? (
                /* DIE FIELDS: date, job name, job type, die maker, punch type, urgent, received/not received */
                <>
                  {/* Select Existing Job (Auto-fills Job Name and Job Type) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Select Existing Job (Auto-fills)
                    </label>
                    <select
                      value={dieSelectedJobId}
                      onChange={(e) => handleSelectExistingJobForDie(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="">-- Select Existing Job --</option>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.jobName} ({j.jobType})
                        </option>
                      ))}
                      <option value="custom">+ Custom / New Job</option>
                    </select>
                  </div>

                  {/* 1. Job Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Job Name <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={dieJobName}
                      onChange={(e) => setDieJobName(e.target.value)}
                      placeholder="Job Name..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* 2. Job Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Job Type <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="plant-die-jobtypes-list"
                      value={dieJobType}
                      onChange={(e) => setDieJobType(e.target.value)}
                      placeholder="Job Type..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                    <datalist id="plant-die-jobtypes-list">
                      <option value="General Corrugation" />
                      <option value="5-Ply Heavy Duty Master Box" />
                      <option value="3-Ply Mono Carton" />
                      <option value="Die Cut Fruit Tray" />
                      <option value="Pizza Box & Food Packaging" />
                    </datalist>
                  </div>

                  {/* 3. Die Maker (Adding and Selection) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Die Maker <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="plant-die-makers-list"
                      value={dieMaker}
                      onChange={(e) => setDieMaker(e.target.value)}
                      placeholder="Select or enter die maker vendor..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                    <datalist id="plant-die-makers-list">
                      {INITIAL_DIE_MAKERS.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>

                  {/* 4. Punch Type (Adding and Selection) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Punch Type <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="plant-die-punches-list"
                      value={diePunchType}
                      onChange={(e) => setDiePunchType(e.target.value)}
                      placeholder="Select or enter punch type..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                    <datalist id="plant-die-punches-list">
                      {INITIAL_PUNCH_TYPES.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Quantity (Die Sets)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={dieQuantity}
                      onChange={(e) => setDieQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Optional Die Tool Photo Upload */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <PhotoDropzone
                      value={dieAddPhotoUrl}
                      onChange={(url) => setDieAddPhotoUrl(url)}
                      onClear={() => setDieAddPhotoUrl('')}
                      label="Die Tool Photo / Proof (Optional)"
                      placeholder="Drag & drop die photo or click to browse"
                      accentColor="purple"
                    />
                  </div>
                </>
              ) : (
                /* STOCK FIELDS */
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Stock / Paper Type <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="stock-type-datalist"
                      value={stockForm.stockType}
                      onChange={(e) => setStockForm({ ...stockForm, stockType: e.target.value })}
                      placeholder="e.g. Duplex Board Grey Back, Kraft Liner 180 GSM..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    <datalist id="stock-type-datalist">
                      {availableStockTypes.map((st) => (
                        <option key={st} value={st} />
                      ))}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Board Size
                      </label>
                      <input
                        type="text"
                        value={stockForm.jobSize}
                        onChange={(e) => setStockForm({ ...stockForm, jobSize: e.target.value })}
                        placeholder="e.g. 36 x 52 in"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Quantity (Units) <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={stockForm.quantity}
                        onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Supplier / Received From <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="supplier-datalist"
                      value={stockForm.receivingFrom}
                      onChange={(e) => setStockForm({ ...stockForm, receivingFrom: e.target.value })}
                      placeholder="e.g. Varun Board, WestRock, International Paper..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    <datalist id="supplier-datalist">
                      {availableSuppliers.map((sup) => (
                        <option key={sup} value={sup} />
                      ))}
                    </datalist>
                  </div>
                </>
              )}


              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={stockForm.notes}
                  onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                  placeholder="e.g. Special instructions or material grade..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStockModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-blue-500 hover:bg-blue-400 rounded-xl cursor-pointer shadow-sm"
                >
                  Save Stock Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: EDIT STOCK ITEM */}
      {/* =================================================================== */}
      {editingStockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Edit Stock Details</h3>
              </div>
              <button
                onClick={() => setEditingStockItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStock} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Type</label>
                <input
                  type="text"
                  required
                  value={stockForm.stockType}
                  onChange={(e) => setStockForm({ ...stockForm, stockType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Board Size</label>
                  <input
                    type="text"
                    value={stockForm.jobSize}
                    onChange={(e) => setStockForm({ ...stockForm, jobSize: e.target.value })}
                    placeholder="e.g. 36 x 52 in"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier / Received From</label>
                <input
                  type="text"
                  required
                  value={stockForm.receivingFrom}
                  onChange={(e) => setStockForm({ ...stockForm, receivingFrom: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={stockForm.status}
                    onChange={(e) => setStockForm({ ...stockForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="Not Received">⏳ Not Received</option>
                    <option value="Received">✅ Received</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Urgent Flag</label>
                  <button
                    type="button"
                    onClick={() => setStockForm({ ...stockForm, isUrgent: !stockForm.isUrgent })}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      stockForm.isUrgent
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${stockForm.isUrgent ? 'text-rose-400' : 'text-slate-500'}`} />
                    <span>{stockForm.isUrgent ? '🔥 Urgent' : 'Normal'}</span>
                  </button>
                </div>
              </div>

              {/* Optional Photo for Stock or Die Tool */}
              {/* Optional Photo for Stock or Die Tool with Drag & Drop */}
              <PhotoDropzone
                value={stockForm.photoUrl}
                onChange={(url) => setStockForm((prev) => ({ ...prev, photoUrl: url }))}
                onClear={() => setStockForm((prev) => ({ ...prev, photoUrl: '' }))}
                label="Tool / Material Photo (Optional)"
                placeholder="Drag & drop photo or click to browse"
                accentColor="purple"
              />

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStockItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-blue-500 hover:bg-blue-400 rounded-xl cursor-pointer shadow-sm"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: ADD PRESS JOB (WITH BOARD SIZE, JOB SIZE, PRESS NAME) */}
      {/* =================================================================== */}
      {isAddPressJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Add New Press Job Run</h3>
              </div>
              <button
                onClick={() => setIsAddPressJobModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPressJob} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Job Name</label>
                <input
                  type="text"
                  required
                  value={pressForm.jobName}
                  onChange={(e) => setPressForm({ ...pressForm, jobName: e.target.value })}
                  placeholder="e.g. 5-Ply Master Shipper Carton, Fruit Tray..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Job Type</label>
                <input
                  type="text"
                  value={pressForm.jobType}
                  onChange={(e) => setPressForm({ ...pressForm, jobType: e.target.value })}
                  placeholder="e.g. Flexo Printing & Slotting..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Only give option for Job Size (Board Size is taken from ordered board) */}
              <div>
                <label className="block text-xs font-semibold text-sky-300 mb-1">
                  Job Size (e.g. 30 x 45 in) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pressForm.jobSize}
                  onChange={(e) => setPressForm({ ...pressForm, jobSize: e.target.value })}
                  placeholder="e.g. 30 x 45 in"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Board Size (Auto-matched from ordered stock for job) */}
              <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-400">Board Size</span>
                  <span className="text-[10px] text-slate-500 font-mono">(Same as board ordered for job)</span>
                </div>
                <div className="mt-1 font-mono text-xs font-bold text-amber-300">
                  {inventory.find(
                    (i) =>
                      pressForm.jobName &&
                      i.jobName?.trim().toLowerCase() === pressForm.jobName.trim().toLowerCase()
                  )?.jobSize || 'Auto-matched when board stock is ordered for this job'}
                </div>
              </div>

              {/* Run Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={pressForm.jobDate}
                  onChange={(e) => setPressForm({ ...pressForm, jobDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white [color-scheme:dark]"
                />
              </div>

              {/* Press Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Press Name
                </label>
                <input
                  type="text"
                  required
                  list="press-datalist"
                  value={pressForm.pressName}
                  onChange={(e) => setPressForm({ ...pressForm, pressName: e.target.value })}
                  placeholder="e.g. Flexo Press 1 (4-Color), Bobst, Heidelberg..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <datalist id="press-datalist">
                  {availablePresses.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={pressForm.status}
                    onChange={(e) => setPressForm({ ...pressForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Pending">⏳ Pending</option>
                    <option value="Completed">✅ Completed</option>
                    <option value="Not Completed">⚠️ Not Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Urgent Priority</label>
                  <button
                    type="button"
                    onClick={() => setPressForm({ ...pressForm, isUrgent: !pressForm.isUrgent })}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      pressForm.isUrgent
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${pressForm.isUrgent ? 'text-rose-400' : 'text-slate-500'}`} />
                    <span>{pressForm.isUrgent ? '🔥 Mark Urgent' : 'Normal'}</span>
                  </button>
                </div>
              </div>

              {/* Optional Press Photo Upload with Drag & Drop */}
              <PhotoDropzone
                value={pressForm.pressPhotoUrl}
                onChange={(url) => setPressForm((prev) => ({ ...prev, pressPhotoUrl: url }))}
                onClear={() => setPressForm((prev) => ({ ...prev, pressPhotoUrl: '' }))}
                label="Press Run / Print Proof Photo (Optional)"
                placeholder="Drag & drop press proof photo or click to browse"
                accentColor="amber"
              />

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPressJobModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer shadow-sm"
                >
                  Save Press Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: EDIT PRESS JOB DETAILS (BOARD SIZE, JOB SIZE, PRESS NAME) */}
      {/* =================================================================== */}
      {editingPressJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Fill & Edit Press Details</h3>
                  <p className="text-xs text-slate-400">Job: {editingPressJob.jobName}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPressJob(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPressJob} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Job Name</label>
                <input
                  type="text"
                  required
                  value={pressForm.jobName}
                  onChange={(e) => setPressForm({ ...pressForm, jobName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              {/* BOARD SIZE: Editable with auto-sync from linked stock */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-amber-300">
                    Board Size (From Ordered Stock)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingPressJob) return;
                      const linked = getLinkedBoardSize(editingPressJob);
                      if (linked && linked !== 'Not Ordered Yet') {
                        setPressForm((prev) => ({ ...prev, boardSize: linked }));
                      }
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline decoration-dotted"
                  >
                    Sync from Stock Order
                  </button>
                </div>
                <input
                  type="text"
                  value={pressForm.boardSize}
                  onChange={(e) => setPressForm({ ...pressForm, boardSize: e.target.value })}
                  placeholder="e.g. 1200 x 850 mm"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* JOB SIZE: Optional final job cut/print dimensions */}
              <div>
                <label className="block text-xs font-semibold text-sky-300 mb-1">
                  Job Size (e.g. 30 x 45 in)
                </label>
                <input
                  type="text"
                  value={pressForm.jobSize}
                  onChange={(e) => setPressForm({ ...pressForm, jobSize: e.target.value })}
                  placeholder="Enter final cut or die size..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* PRESS NAME TO BE FILLED */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Press Name
                </label>
                <input
                  type="text"
                  list="press-edit-datalist"
                  value={pressForm.pressName}
                  onChange={(e) => setPressForm({ ...pressForm, pressName: e.target.value })}
                  placeholder="e.g. Flexo Press 1 (4-Color), Heidelberg..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <datalist id="press-edit-datalist">
                  {availablePresses.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={pressForm.status}
                    onChange={(e) => setPressForm({ ...pressForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="Pending">⏳ Pending</option>
                    <option value="Completed">✅ Completed</option>
                    <option value="Not Completed">⚠️ Not Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Urgent Priority</label>
                  <button
                    type="button"
                    onClick={() => setPressForm({ ...pressForm, isUrgent: !pressForm.isUrgent })}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      pressForm.isUrgent
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${pressForm.isUrgent ? 'text-rose-400' : 'text-slate-500'}`} />
                    <span>{pressForm.isUrgent ? '🔥 Urgent Priority' : 'Normal Priority'}</span>
                  </button>
                </div>
              </div>

              {/* Optional Press Photo Upload with Drag & Drop */}
              <PhotoDropzone
                value={pressForm.pressPhotoUrl}
                onChange={(url) => setPressForm((prev) => ({ ...prev, pressPhotoUrl: url }))}
                onClear={() => setPressForm((prev) => ({ ...prev, pressPhotoUrl: '' }))}
                label="Press Run / Print Proof Photo (Optional)"
                placeholder="Drag & drop press proof photo or click to browse"
                accentColor="amber"
              />

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPressJob(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 5: DELETE CONFIRMATION MODAL */}
      {/* =================================================================== */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-900/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Permanent Deletion</h3>
                <p className="text-xs text-rose-400/80">Action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white font-semibold">"{deleteConfirmTarget.name}"</strong>?
              It will be permanently removed from your Firestore database (<code className="text-amber-300 font-mono">mg-manager-3ab66</code>) and local cache.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-xl cursor-pointer shadow-sm"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3-DOT DETAIL MODAL 1: BOARD STOCK ITEM DETAIL */}
      {/* =================================================================== */}
      {detailStockItem && (() => {
        const item = detailStockItem;
        const isReceived = item.status === 'Received';
        const isUrgent = Boolean(item.isUrgent);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Board Stock Inventory Detail</h3>
                    <p className="text-xs text-slate-400">Spec details, receiving status & priority</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailStockItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto">
                {/* Status & Urgent Bar */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Receiving Status:</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
                      isReceived
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}>
                      {isReceived ? '✅ Received' : '⏳ Not Received'}
                    </span>
                  </div>

                  {isUrgent && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-rose-400" />
                      <span>URGENT</span>
                    </span>
                  )}
                </div>

                {/* Specs Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Stock / Paper Type:</span>
                    <span className="font-bold text-white text-sm">{item.stockType}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Board Size:</span>
                    <span className="font-mono font-bold text-amber-300">{item.jobSize || 'Standard'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Quantity:</span>
                    <span className="font-mono font-bold text-sky-400">{Number(item.quantity).toLocaleString()} units</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Supplier (From):</span>
                    <span className="font-semibold text-slate-200">{item.receivingFrom || 'Unspecified'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Linked Job:</span>
                    <span className="font-semibold text-amber-400">{item.jobName || 'Stock Buffer (Unlinked)'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Print Specification:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      item.isPrinted
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.isPrinted ? `Printed (${item.pressName || 'Press Assigned'})` : 'Non-Printed (Plain Kraft)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Order Date:</span>
                    <span className="font-mono text-slate-300">{item.orderedAt || '—'}</span>
                  </div>
                  {item.receivedAt && (
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Received Time:</span>
                      </span>
                      <span className="font-mono font-bold text-xs">{item.receivedAt}</span>
                    </div>
                  )}
                  {item.isExistingStock && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Fulfillment Type:</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        In-House Existing Stock
                      </span>
                    </div>
                  )}
                  {item.notes && (
                    <div className="pt-2 border-t border-slate-850">
                      <span className="text-slate-400 block mb-0.5">Notes:</span>
                      <p className="text-slate-300 italic">{item.notes}</p>
                    </div>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Quick Status Controls</span>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const nextStatus = isReceived ? 'Not Received' : 'Received';
                      const receivedAt = nextStatus === 'Received' ? formatReceivedTimestamp() : undefined;
                      await handleToggleStockReceived(item);
                      setDetailStockItem({ ...item, status: nextStatus, receivedAt });
                    }}
                    className={`w-full p-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border shadow-sm ${
                      isReceived
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600 hover:bg-emerald-900/60'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                    }`}
                  >
                    <span>{isReceived ? 'Status: Received ✅' : 'Status: Not Received ⏳'}</span>
                    <span className="underline font-mono text-[11px]">
                      {isReceived ? 'Click to Mark Not Received' : 'Click to Mark Received'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await handleToggleStockUrgent(item);
                      setDetailStockItem({ ...item, isUrgent: !isUrgent });
                    }}
                    className={`w-full p-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border shadow-sm ${
                      isUrgent
                        ? 'bg-rose-950/60 text-rose-300 border-rose-600 hover:bg-rose-900/60'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <span>{isUrgent ? 'Priority: Urgent 🔥' : 'Priority: Normal'}</span>
                    <span className="underline font-mono text-[11px]">
                      {isUrgent ? 'Click to Remove Urgent' : 'Click to Mark Urgent 🔥'}
                    </span>
                  </button>

                  <p className="text-[11px] text-slate-500 italic text-center">
                    Note: Marking stock received updates inventory and does not automatically complete the main factory job.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const it = detailStockItem;
                    setDetailStockItem(null);
                    handleOpenEditStock(it);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Specs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailStockItem(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =================================================================== */}
      {/* 3-DOT DETAIL MODAL 2: DIE TOOLING ORDER DETAIL */}
      {/* =================================================================== */}
      {detailDieItem && (() => {
        const item = detailDieItem;
        const isReceived = item.status === 'Received';
        const isUrgent = Boolean(item.isUrgent);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Die Tooling Order Detail</h3>
                    <p className="text-xs text-slate-400">Maker, punch specifications & receiving status</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailDieItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto">
                {/* Status Bar */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Receiving Status:</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
                      isReceived
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}>
                      {isReceived ? '✅ Received' : '⏳ Not Received'}
                    </span>
                  </div>

                  {isUrgent && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-rose-400" />
                      <span>URGENT</span>
                    </span>
                  )}
                </div>

                {/* Specs Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Job Name:</span>
                    <span className="font-bold text-white text-sm">{item.jobName || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Job Type:</span>
                    <span className="font-semibold text-amber-400">{item.jobType || 'General Corrugation'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Die Maker:</span>
                    <span className="font-semibold text-purple-300">{item.dieMaker || item.receivingFrom || 'Apex Laser Dies'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Punch Type:</span>
                    <span className="font-mono font-bold text-white">{item.punchType || item.jobSize || 'Rotary Die Punch'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Quantity:</span>
                    <span className="font-mono font-bold text-white">{item.quantity} tool(s)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Order Date:</span>
                    <span className="font-mono text-slate-300">{item.orderedAt || '—'}</span>
                  </div>
                  {item.receivedAt && (
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Received Time:</span>
                      </span>
                      <span className="font-mono font-bold text-xs">{item.receivedAt}</span>
                    </div>
                  )}
                  {item.notes && (
                    <div className="pt-2 border-t border-slate-850">
                      <span className="text-slate-400 block mb-0.5">Notes:</span>
                      <p className="text-slate-300 italic">{item.notes}</p>
                    </div>
                  )}
                </div>

                {/* Optional Die Tool Photo Card */}
                {item.photoUrl && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-300 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-purple-400" />
                        <span>Die Tool Photo / Proof</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: item.photoUrl!, title: `${item.dieMaker || 'Die Tool'} Proof` })}
                        className="text-[11px] text-purple-400 hover:text-purple-300 underline font-medium cursor-pointer"
                      >
                        View Full Size
                      </button>
                    </div>
                    <div 
                      onClick={() => setPreviewImage({ url: item.photoUrl!, title: `${item.dieMaker || 'Die Tool'} Proof` })}
                      className="cursor-pointer group relative overflow-hidden rounded-lg border border-slate-800"
                    >
                      <img
                        src={item.photoUrl}
                        alt="Die Tool Proof"
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
                        <span className="px-2.5 py-1 rounded-md bg-slate-950/80 text-[11px] text-purple-200 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                          Click to enlarge 🔍
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Action Buttons */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Quick Status Controls</span>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const nextStatus = isReceived ? 'Not Received' : 'Received';
                      const receivedAt = nextStatus === 'Received' ? formatReceivedTimestamp() : undefined;
                      await handleToggleDieReceived(item);
                      setDetailDieItem({ ...item, status: nextStatus, receivedAt });
                    }}
                    className={`w-full p-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border shadow-sm ${
                      isReceived
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600 hover:bg-emerald-900/60'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                    }`}
                  >
                    <span>{isReceived ? 'Status: Received ✅' : 'Status: Not Received ⏳'}</span>
                    <span className="underline font-mono text-[11px]">
                      {isReceived ? 'Click to Mark Not Received' : 'Click to Mark Received'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await handleToggleDieUrgent(item);
                      setDetailDieItem({ ...item, isUrgent: !isUrgent });
                    }}
                    className={`w-full p-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border shadow-sm ${
                      isUrgent
                        ? 'bg-rose-950/60 text-rose-300 border-rose-600 hover:bg-rose-900/60'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <span>{isUrgent ? 'Priority: Urgent 🔥' : 'Priority: Normal'}</span>
                    <span className="underline font-mono text-[11px]">
                      {isUrgent ? 'Click to Remove Urgent' : 'Click to Mark Urgent 🔥'}
                    </span>
                  </button>

                  <p className="text-[11px] text-slate-500 italic text-center">
                    Note: Receiving die tooling updates the tool inventory and does not complete the main factory job.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailDieItem(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =================================================================== */}
      {/* 3-DOT DETAIL MODAL 3: PRESS OPERATIONS DETAIL */}
      {/* =================================================================== */}
      {detailPressJob && (() => {
        const job = detailPressJob;
        const isCompleted = job.pressStatus === 'Completed';
        const isUrgent = Boolean(job.isUrgent);
        const linkedBoard = getLinkedBoardSize(job);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Press Production Detail</h3>
                    <p className="text-xs text-slate-400">Machine, dimensions & press run completion</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailPressJob(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto">
                {/* Press Status Bar */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Press Stage Status:</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
                      isCompleted
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}>
                      {isCompleted ? '✅ Press Completed' : '⏳ Press Pending'}
                    </span>
                  </div>

                  {isUrgent && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-rose-400" />
                      <span>URGENT</span>
                    </span>
                  )}
                </div>

                {/* Specs Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Job Name:</span>
                    <span className="font-bold text-white text-sm">{job.jobName}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Assigned Press:</span>
                    <span className="font-semibold text-amber-400">{job.pressName || 'Not Assigned'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Board Size:</span>
                    <span className="font-mono font-bold text-amber-300">{linkedBoard}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Job Size:</span>
                    <span className="font-mono font-bold text-sky-400">{job.jobSize || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Job Type:</span>
                    <span className="font-semibold text-slate-200">{job.jobType}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Line Placement:</span>
                    <span className="font-semibold text-slate-200">{job.jobPlacement} Line</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Job Created:</span>
                    <span className="font-mono text-slate-300">{job.createdAt || '—'}</span>
                  </div>
                  {job.pressCompletedAt && (
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Press Completed Time:</span>
                      </span>
                      <span className="font-mono font-bold text-xs">{job.pressCompletedAt}</span>
                    </div>
                  )}
                  {job.notes && (
                    <div className="pt-2 border-t border-slate-850">
                      <span className="text-slate-400 block mb-0.5">Notes:</span>
                      <p className="text-slate-300 italic">{job.notes}</p>
                    </div>
                  )}
                </div>

                {/* Optional Press Run / Proof Photo Card */}
                {job.pressPhotoUrl && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-amber-400" />
                        <span>Press Run / Print Proof Photo</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: job.pressPhotoUrl!, title: `${job.jobName} - Press Run Proof` })}
                        className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                      >
                        View Full Size
                      </button>
                    </div>
                    <div 
                      onClick={() => setPreviewImage({ url: job.pressPhotoUrl!, title: `${job.jobName} - Press Run Proof` })}
                      className="cursor-pointer group relative overflow-hidden rounded-lg border border-slate-800"
                    >
                      <img
                        src={job.pressPhotoUrl}
                        alt="Press Proof"
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
                        <span className="px-2.5 py-1 rounded-md bg-slate-950/80 text-[11px] text-amber-200 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                          Click to enlarge 🔍
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Action Buttons */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quick Press Run Controls</span>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const nextStatus = isCompleted ? 'Pending' : 'Completed';
                      const pressCompletedAt = nextStatus === 'Completed' ? formatReceivedTimestamp() : undefined;
                      await handleTogglePressStatus(job);
                      setDetailPressJob({ ...job, pressStatus: nextStatus, pressCompletedAt });
                    }}
                    className={`w-full p-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border shadow-sm ${
                      isCompleted
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600 hover:bg-emerald-900/60'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                    }`}
                  >
                    <span>{isCompleted ? 'Press Run: Completed ✅' : 'Press Run: Pending ⏳'}</span>
                    <span className="underline font-mono text-[11px]">
                      {isCompleted ? 'Click to Mark Pending' : 'Click to Mark Completed'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await handleTogglePressUrgent(job);
                      setDetailPressJob({ ...job, isUrgent: !isUrgent });
                    }}
                    className={`w-full p-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between border shadow-sm ${
                      isUrgent
                        ? 'bg-rose-950/60 text-rose-300 border-rose-600 hover:bg-rose-900/60'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <span>{isUrgent ? 'Priority: Urgent 🔥' : 'Priority: Normal'}</span>
                    <span className="underline font-mono text-[11px]">
                      {isUrgent ? 'Click to Remove Urgent' : 'Click to Mark Urgent 🔥'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setDetailPressJob(null);
                      // Mark as Non-Printed and remove from Press Data
                      await onUpdateJobDetails(job.id, { isPrinted: false, pressName: '' });
                    }}
                    className="w-full p-2.5 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-sky-400 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Convert to Non-Printed Job (Remove from Press Schedule)</span>
                  </button>

                  <p className="text-[11px] text-slate-500 italic text-center">
                    Press completion is independent and will never automatically mark the main factory job as completed.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const j = detailPressJob;
                    setDetailPressJob(null);
                    handleOpenEditPressJob(j);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Press Specs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailPressJob(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FULL-SIZE PHOTO PREVIEW LIGHTBOX */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-md">
                  {previewImage.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto bg-slate-950/60 max-h-[75vh]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl border border-slate-800 shadow-xl"
              />
            </div>
            <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">High-resolution tooling / proof capture</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
