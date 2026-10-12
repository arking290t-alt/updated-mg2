import React, { useState, useRef } from 'react';
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
  Scissors
} from 'lucide-react';
import { 
  CorrugationJob, 
  InventoryItem, 
  JobStatus, 
  INITIAL_PRESS_NAMES, 
  INITIAL_STOCK_TYPES, 
  COMMON_SUPPLIERS,
  INITIAL_DIE_MAKERS,
  INITIAL_PUNCH_TYPES
} from '../types/job';

interface PlantDataViewProps {
  jobs: CorrugationJob[];
  inventory: InventoryItem[];
  availablePresses?: string[];
  availableStockTypes?: string[];
  availableSuppliers?: string[];
  onUpdateJobDetails: (jobId: string, updates: Partial<CorrugationJob>) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
  onAddJob?: (newJob: Omit<CorrugationJob, 'id' | 'createdAt' | 'status'> & { boardSize?: string; jobSize?: string; pressName?: string; isUrgent?: boolean; status?: JobStatus }) => Promise<void>;
  onUpdateInventoryDetails: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
  onDeleteInventory: (itemId: string) => Promise<void>;
  onAddInventoryItem?: (newItem: Omit<InventoryItem, 'id' | 'orderedAt'>) => Promise<void>;
}

export const PlantDataView: React.FC<PlantDataViewProps> = ({
  jobs,
  inventory,
  availablePresses = INITIAL_PRESS_NAMES,
  availableStockTypes = INITIAL_STOCK_TYPES,
  availableSuppliers = COMMON_SUPPLIERS,
  onUpdateJobDetails,
  onDeleteJob,
  onAddJob,
  onUpdateInventoryDetails,
  onDeleteInventory,
  onAddInventoryItem,
}) => {
  // Primary Tab: 'stock' (Ordered Stock Data) or 'press' (Press Operations Data)
  const [activeTab, setActiveTab] = useState<'stock' | 'press'>('stock');

  // Search & Filters for Stock
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'pending' | 'received' | 'urgent'>('all');
  const [stockDateFilter, setStockDateFilter] = useState('');

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

  const todayIso = new Date().toISOString().split('T')[0];

  // Form State for Adding / Editing Stock
  const [stockForm, setStockForm] = useState({
    stockType: availableStockTypes[0] || 'Kraft Liner 180 GSM',
    jobSize: '',
    quantity: 5000,
    receivingFrom: availableSuppliers[0] || 'Varun Board',
    status: 'Not Received' as 'Received' | 'Not Received',
    isUrgent: false,
    orderDate: todayIso,
    notes: '',
  });

  // Die Order specifics in Add Stock Modal
  const [stockAddCategory, setStockAddCategory] = useState<'Stock' | 'Die'>('Stock');
  const [dieJobName, setDieJobName] = useState<string>('');
  const [dieJobType, setDieJobType] = useState<string>('General Corrugation');
  const [dieMaker, setDieMaker] = useState<string>(INITIAL_DIE_MAKERS[0] || 'Apex Laser Dies');
  const [diePunchType, setDiePunchType] = useState<string>(INITIAL_PUNCH_TYPES[0] || 'Rotary Die Punch');
  const [dieQuantity, setDieQuantity] = useState<number>(1);

  // Form State for Adding / Editing Press Job
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
  });

  // Export Loading States
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // -----------------------------------------------------------------
  // HELPER: GET BOARD SIZE FROM ORDERED BOARD FOR JOB
  // -----------------------------------------------------------------
  const getLinkedBoardSize = (job: CorrugationJob): string => {
    const linked = inventory.find(
      (i) =>
        (i.jobId && i.jobId === job.id) ||
        (i.jobName && i.jobName.trim().toLowerCase() === job.jobName.trim().toLowerCase())
    );
    if (linked && linked.jobSize) {
      return linked.jobSize;
    }
    return job.boardSize || 'Not Ordered Yet';
  };

  // -----------------------------------------------------------------
  // FILTERED DATA
  // -----------------------------------------------------------------
  const filteredStock = inventory.filter((item) => {
    const matchesSearch =
      (item.stockType || '').toLowerCase().includes(stockSearch.toLowerCase()) ||
      (item.receivingFrom || '').toLowerCase().includes(stockSearch.toLowerCase()) ||
      (item.jobSize || '').toLowerCase().includes(stockSearch.toLowerCase()) ||
      (item.jobName || '').toLowerCase().includes(stockSearch.toLowerCase());

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

  const filteredPressJobs = jobs.filter((job) => {
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

    if (pressFilter === 'pending') return job.status === 'Pending' || job.status === 'Not Completed';
    if (pressFilter === 'completed') return job.status === 'Completed';
    if (pressFilter === 'urgent') return Boolean(job.isUrgent);
    return true;
  });

  // Metrics for Stock
  const totalStockLots = inventory.length;
  const receivedStockLots = inventory.filter((i) => i.status === 'Received').length;
  const pendingStockLots = inventory.filter((i) => i.status !== 'Received').length;
  const urgentStockLots = inventory.filter((i) => i.isUrgent).length;
  const totalStockQuantity = inventory.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  // Metrics for Press
  const totalPressJobs = jobs.length;
  const completedPressJobs = jobs.filter((j) => j.status === 'Completed').length;
  const pendingPressJobs = jobs.filter((j) => j.status !== 'Completed').length;
  const urgentPressJobs = jobs.filter((j) => j.isUrgent).length;

  // -----------------------------------------------------------------
  // TOGGLES
  // -----------------------------------------------------------------
  const handleToggleStockReceived = async (item: InventoryItem) => {
    const nextStatus = item.status === 'Received' ? 'Not Received' : 'Received';
    await onUpdateInventoryDetails(item.id, { status: nextStatus });
  };

  const handleToggleStockUrgent = async (item: InventoryItem) => {
    await onUpdateInventoryDetails(item.id, { isUrgent: !item.isUrgent });
  };

  const handleTogglePressStatus = async (job: CorrugationJob) => {
    const nextStatus: JobStatus = job.status === 'Completed' ? 'Pending' : 'Completed';
    await onUpdateJobDetails(job.id, { status: nextStatus });
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
    setDieJobType('General Corrugation');
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
    });
    setIsAddStockModalOpen(true);
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
          status: stockForm.status,
          isUrgent: stockForm.isUrgent,
          isPrinted: false,
          notes: stockForm.notes,
        } as any);
      } else {
        await onAddInventoryItem({
          category: 'Stock',
          stockType: stockForm.stockType,
          jobSize: stockForm.jobSize || 'Standard',
          receivingFrom: stockForm.receivingFrom,
          quantity: Number(stockForm.quantity) || 1000,
          status: stockForm.status,
          isUrgent: stockForm.isUrgent,
          isPrinted: false,
          notes: stockForm.notes,
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
        status: stockForm.status,
        isUrgent: stockForm.isUrgent,
        orderedAt: dateFormatted,
        jobName: stockAddCategory === 'Die' ? dieJobName : undefined,
        jobType: stockAddCategory === 'Die' ? dieJobType : undefined,
        dieMaker: stockAddCategory === 'Die' ? dieMaker : undefined,
        punchType: stockAddCategory === 'Die' ? diePunchType : undefined,
      });
    }
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
      } as any);
    }
    setIsAddPressJobModalOpen(false);
  };

  const handleOpenEditPressJob = (job: CorrugationJob) => {
    setEditingPressJob(job);
    setPressForm({
      jobName: job.jobName,
      jobType: job.jobType,
      boardSize: getLinkedBoardSize(job),
      jobSize: job.jobSize || '',
      pressName: job.pressName || availablePresses[0] || 'Flexo Press 1',
      jobPlacement: job.jobPlacement,
      status: job.status,
      isUrgent: Boolean(job.isUrgent),
      jobDate: (job.createdAt || '').split(' ')[0] || todayIso,
      notes: job.notes || '',
    });
  };

  const handleSaveEditPressJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPressJob) return;
    const linkedBoard = getLinkedBoardSize(editingPressJob);
    await onUpdateJobDetails(editingPressJob.id, {
      jobName: pressForm.jobName,
      jobType: pressForm.jobType,
      boardSize: linkedBoard,
      jobSize: pressForm.jobSize,
      pressName: pressForm.pressName,
      jobPlacement: pressForm.jobPlacement,
      status: pressForm.status,
      isUrgent: pressForm.isUrgent,
      notes: pressForm.notes,
    });
    setEditingPressJob(null);
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
          'Board / Sheet Size',
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
          j.status,
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
  // EXPORT 2: IMAGE (.png chart & table canvas snapshot)
  // -----------------------------------------------------------------
  const exportToImage = () => {
    setIsExportingImage(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isStock = activeTab === 'stock';
      const itemsToRender = isStock ? filteredStock : filteredPressJobs;

      // Canvas dimensions
      const width = 1200;
      const rowHeight = 44;
      const headerHeight = 160;
      const totalRows = Math.min(itemsToRender.length, 30); // Max 30 rows in image for clean layout
      const height = Math.max(500, headerHeight + totalRows * rowHeight + 80);

      // Retina 2x scale
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      // Background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Top Banner gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#1e293b');
      gradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, 120);

      // Accent border
      ctx.fillStyle = isStock ? '#3b82f6' : '#f59e0b';
      ctx.fillRect(0, 118, width, 3);

      // Title & Date
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        isStock ? 'Stock Chart' : 'Press Chart',
        30,
        45
      );

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText(`Generated: ${today}`, 30, 68);

      // KPI stat pills on top banner
      if (isStock) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(30, 82, 160, 26);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px system-ui';
        ctx.fillText(`Total Lots: ${totalStockLots}`, 40, 100);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(200, 82, 160, 26);
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`Received: ${receivedStockLots}`, 210, 100);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(370, 82, 160, 26);
        ctx.fillStyle = '#f87171';
        ctx.fillText(`Pending: ${pendingStockLots}`, 380, 100);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(540, 82, 160, 26);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`🔥 Urgent: ${urgentStockLots}`, 550, 100);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(30, 82, 160, 26);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px system-ui';
        ctx.fillText(`Total Runs: ${totalPressJobs}`, 40, 100);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(200, 82, 160, 26);
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`Completed: ${completedPressJobs}`, 210, 100);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(370, 82, 160, 26);
        ctx.fillStyle = '#fb923c';
        ctx.fillText(`Pending: ${pendingPressJobs}`, 380, 100);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(540, 82, 160, 26);
        ctx.fillStyle = '#f87171';
        ctx.fillText(`🔥 Urgent: ${urgentPressJobs}`, 550, 100);
      }

      // Table Header
      let y = headerHeight;
      ctx.fillStyle = '#111827';
      ctx.fillRect(30, y - 28, width - 60, 32);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 11px system-ui';

      if (isStock) {
        ctx.fillText('PRIORITY', 45, y - 8);
        ctx.fillText('STOCK / BOARD TYPE', 140, y - 8);
        ctx.fillText('BOARD SIZE', 410, y - 8);
        ctx.fillText('QTY (UNITS)', 530, y - 8);
        ctx.fillText('SUPPLIER (FROM)', 660, y - 8);
        ctx.fillText('STATUS', 890, y - 8);
        ctx.fillText('ORDER DATE', 1040, y - 8);
      } else {
        ctx.fillText('PRIORITY', 45, y - 8);
        ctx.fillText('JOB NAME', 140, y - 8);
        ctx.fillText('BOARD SIZE', 380, y - 8);
        ctx.fillText('JOB SIZE', 510, y - 8);
        ctx.fillText('ASSIGNED PRESS MACHINE', 640, y - 8);
        ctx.fillText('STATUS', 910, y - 8);
        ctx.fillText('CREATED', 1040, y - 8);
      }

      // Draw Rows
      itemsToRender.slice(0, 30).forEach((item: any, idx) => {
        y += rowHeight;

        // Alternating row background
        ctx.fillStyle = idx % 2 === 0 ? '#0b1120' : '#0f172a';
        ctx.fillRect(30, y - 28, width - 60, rowHeight);

        // Row border
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(30, y - 28, width - 60, rowHeight);

        const isUrgent = Boolean(item.isUrgent);

        // Priority Badge
        if (isUrgent) {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(45, y - 20, 68, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px system-ui';
          ctx.fillText('🔥 URGENT', 52, y - 6);
        } else {
          ctx.fillStyle = '#334155';
          ctx.fillRect(45, y - 20, 58, 20);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px system-ui';
          ctx.fillText('NORMAL', 53, y - 6);
        }

        ctx.font = '12px system-ui';

        if (isStock) {
          // Stock Type
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px system-ui';
          ctx.fillText((item.stockType || '').slice(0, 34), 140, y - 7);

          // Size
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px monospace';
          ctx.fillText(item.jobSize || 'Standard', 410, y - 7);

          // Quantity
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(Number(item.quantity || 0).toLocaleString(), 530, y - 7);

          // Supplier
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '11px system-ui';
          ctx.fillText((item.receivingFrom || '').slice(0, 24), 660, y - 7);

          // Status Badge
          const isRec = item.status === 'Received';
          ctx.fillStyle = isRec ? '#166534' : '#9a3412';
          ctx.fillRect(890, y - 20, 95, 20);
          ctx.fillStyle = isRec ? '#86efac' : '#fdba74';
          ctx.font = 'bold 10px system-ui';
          ctx.fillText(isRec ? '✅ RECEIVED' : '⏳ NOT RECEIVED', 896, y - 6);

          // Date
          ctx.fillStyle = '#64748b';
          ctx.font = '10px monospace';
          ctx.fillText((item.orderedAt || '').slice(0, 16), 1040, y - 7);
        } else {
          // Press Job Name
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px system-ui';
          ctx.fillText((item.jobName || '').slice(0, 28), 140, y - 7);

          // Board Size (same as board ordered for job)
          ctx.fillStyle = '#fbbf24';
          ctx.font = '11px monospace';
          ctx.fillText(getLinkedBoardSize(item as CorrugationJob), 380, y - 7);

          // Job Size
          ctx.fillStyle = '#38bdf8';
          ctx.font = '11px monospace';
          ctx.fillText(item.jobSize || '—', 510, y - 7);

          // Press Name
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '11px system-ui';
          ctx.fillText((item.pressName || 'Not Assigned').slice(0, 26), 640, y - 7);

          // Status Badge
          const isComp = item.status === 'Completed';
          ctx.fillStyle = isComp ? '#166534' : '#b45309';
          ctx.fillRect(910, y - 20, 88, 20);
          ctx.fillStyle = isComp ? '#86efac' : '#fde047';
          ctx.font = 'bold 10px system-ui';
          ctx.fillText(isComp ? '✅ COMPLETED' : '⏳ PENDING', 916, y - 6);

          // Created Date
          ctx.fillStyle = '#64748b';
          ctx.font = '10px monospace';
          ctx.fillText((item.createdAt || '').slice(0, 16), 1040, y - 7);
        }
      });

      // Footer
      ctx.fillStyle = '#475569';
      ctx.font = '10px monospace';
      ctx.fillText(
        isStock ? `Stock Chart · ${itemsToRender.length} Records` : `Press Chart · ${itemsToRender.length} Records`,
        30,
        height - 20
      );

      // Download PNG
      const link = document.createElement('a');
      link.download = isStock ? `Stock_Chart_${today}.png` : `Press_Chart_${today}.png`;
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
          ) : (
            <button
              onClick={handleOpenAddPressJob}
              className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Press Job</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Navigation Tabs: Stock Data vs Press Data */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'stock'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Ordered Stock Data ({inventory.length})</span>
          {urgentStockLots > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
              {urgentStockLots} Urgent
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('press')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'press'
              ? 'border-amber-500 text-amber-400 bg-amber-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>2. Press Operations Data ({jobs.length})</span>
          {urgentPressJobs > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
              {urgentPressJobs} Urgent
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
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Ordered Lots</span>
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{totalStockLots}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                {totalStockQuantity.toLocaleString()} total units
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Received at Factory</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{receivedStockLots}</div>
              <div className="text-[11px] text-emerald-500/80 mt-0.5 font-mono">
                {totalStockLots > 0 ? Math.round((receivedStockLots / totalStockLots) * 100) : 0}% received
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Pending / Not Received</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">{pendingStockLots}</div>
              <div className="text-[11px] text-amber-500/80 mt-0.5 font-mono">Awaiting delivery</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Urgent Stock</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">{urgentStockLots}</div>
              <div className="text-[11px] text-rose-500/80 mt-0.5 font-mono">High line priority</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-4 lg:col-span-1">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Suppliers Linked</span>
                <Database className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-purple-300">
                {new Set(inventory.map((i) => i.receivingFrom).filter(Boolean)).size}
              </div>
              <div className="text-[11px] text-purple-400/80 mt-0.5">Active mill vendors</div>
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
                    <th className="py-3 px-4">Board / Job Size</th>
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
                          </td>

                          {/* 8. Actions (Edit / Delete) */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditStock(item)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Edit Stock Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirmTarget({
                                    type: 'inventory',
                                    id: item.id,
                                    name: `${item.stockType} (${item.quantity} units)`,
                                  })
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                title="Delete Stock Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
                Showing <strong>{filteredStock.length}</strong> of <strong>{inventory.length}</strong> stock items
              </div>
              <div className="text-[11px] text-slate-500">
                Click any <strong>Received</strong> or <strong>Urgent</strong> button to instantly update live database
              </div>
            </div>
          </div>

        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: PRESS OPERATIONS DATA */}
      {/* =================================================================== */}
      {activeTab === 'press' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Press KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Press Jobs</span>
                <Printer className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white">{totalPressJobs}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono">Production runs registered</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Completed Runs</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{completedPressJobs}</div>
              <div className="text-[11px] text-emerald-500/80 mt-0.5 font-mono">
                {totalPressJobs > 0 ? Math.round((completedPressJobs / totalPressJobs) * 100) : 0}% completed
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Pending / In Press</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">{pendingPressJobs}</div>
              <div className="text-[11px] text-amber-500/80 mt-0.5 font-mono">Queued or running</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Urgent Press Runs</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">{urgentPressJobs}</div>
              <div className="text-[11px] text-rose-500/80 mt-0.5 font-mono">Immediate machine turn</div>
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
                      const isCompleted = job.status === 'Completed';
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
                          </td>

                          {/* 8. Actions (Fill / Edit details, Delete) */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditPressJob(job)}
                                className="px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Edit details: Board Size, Job Size, Press Name"
                              >
                                <Edit3 className="w-3 h-3 text-amber-400" />
                                <span>Fill / Edit</span>
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirmTarget({
                                    type: 'job',
                                    id: job.id,
                                    name: job.jobName,
                                  })
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                title="Delete Press Job"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
                  {/* 1. Job Name (Adding and Selection) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Job Name <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      list="plant-die-jobs-list"
                      value={dieJobName}
                      onChange={(e) => setDieJobName(e.target.value)}
                      placeholder="Select existing job or type new job name..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                    <datalist id="plant-die-jobs-list">
                      {jobs.map((j) => (
                        <option key={j.id} value={j.jobName}>
                          {j.jobType}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  {/* 2. Job Type (Adding and Selection) */}
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
                      placeholder="Select or enter job type..."
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
                        Board / Sheet Size
                      </label>
                      <input
                        type="text"
                        value={stockForm.jobSize}
                        onChange={(e) => setStockForm({ ...stockForm, jobSize: e.target.value })}
                        placeholder="e.g. 36 x 52 in"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
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

              {/* Status and Urgent Marking for Both Stock & Die */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Receiving Status
                  </label>
                  <select
                    value={stockForm.status}
                    onChange={(e) => setStockForm({ ...stockForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Not Received">⏳ Not Received (Pending)</option>
                    <option value="Received">✅ Received at Factory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Urgent Priority
                  </label>
                  <button
                    type="button"
                    onClick={() => setStockForm({ ...stockForm, isUrgent: !stockForm.isUrgent })}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      stockForm.isUrgent
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${stockForm.isUrgent ? 'text-rose-400' : 'text-slate-500'}`} />
                    <span>{stockForm.isUrgent ? '🔥 Mark Urgent' : 'Normal Priority'}</span>
                  </button>
                </div>
              </div>

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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Board / Sheet Size</label>
                  <input
                    type="text"
                    value={stockForm.jobSize}
                    onChange={(e) => setStockForm({ ...stockForm, jobSize: e.target.value })}
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

              {/* BOARD SIZE: Same as Board Ordered for Job */}
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1">
                  Board Size (Same as Board Ordered for Job)
                </label>
                <div className="w-full px-3 py-2 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-mono font-bold flex items-center justify-between">
                  <span>{getLinkedBoardSize(editingPressJob)}</span>
                  <span className="text-[10px] text-slate-500 font-sans">Locked</span>
                </div>
              </div>

              {/* JOB SIZE: Only give option for Job Size */}
              <div>
                <label className="block text-xs font-semibold text-sky-300 mb-1">
                  Job Size (e.g. 30 x 45 in) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pressForm.jobSize}
                  onChange={(e) => setPressForm({ ...pressForm, jobSize: e.target.value })}
                  placeholder="Enter final job size..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* PRESS NAME TO BE FILLED */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Press Name
                </label>
                <input
                  type="text"
                  required
                  list="press-edit-datalist"
                  value={pressForm.pressName}
                  onChange={(e) => setPressForm({ ...pressForm, pressName: e.target.value })}
                  placeholder="e.g. Flexo Press 1 (4-Color), Heidelberg..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
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

    </div>
  );
};
