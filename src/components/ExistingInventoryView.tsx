import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Printer, 
  FileText, 
  Truck, 
  Maximize2, 
  Trash2, 
  Briefcase,
  Layers,
  CheckCircle2,
  Calendar,
  X,
  MoreVertical,
  Eye,
  Flame,
  Scissors,
  Clock,
  Camera,
  CheckSquare,
  RotateCcw,
  Archive,
  Info
} from 'lucide-react';
import { InventoryItem, CorrugationJob, formatReceivedTimestamp } from '../types/job';

interface ExistingInventoryViewProps {
  inventory: InventoryItem[];
  jobs?: CorrugationJob[];
  onOpenOrderModal: () => void;
  onDeleteInventory: (itemId: string) => void;
  onUpdateInventoryDetails?: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
}

export const ExistingInventoryView: React.FC<ExistingInventoryViewProps> = ({
  inventory,
  jobs = [],
  onOpenOrderModal,
  onDeleteInventory,
  onUpdateInventoryDetails,
}) => {
  // Tabs: Available Stock vs Used Stock
  const [inventoryTab, setInventoryTab] = useState<'available' | 'used'>('available');

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [printFilter, setPrintFilter] = useState<'All' | 'Printed' | 'Non-Printed'>('All');
  
  // Modals
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<InventoryItem | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Mark Stock As Used Modal State
  const [markUsedItem, setMarkUsedItem] = useState<InventoryItem | null>(null);
  const [jobSelectionMode, setJobSelectionMode] = useState<'existing_job' | 'custom'>('custom');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [usedJobName, setUsedJobName] = useState('');
  const [usedJobDescription, setUsedJobDescription] = useState('');
  const [usedQuantity, setUsedQuantity] = useState<number>(0);
  const [usedAtTimestamp, setUsedAtTimestamp] = useState('');

  // Revert Confirmation Modal State
  const [revertConfirmItem, setRevertConfirmItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const handleClose = () => setActiveDropdownId(null);
    if (activeDropdownId) {
      window.addEventListener('click', handleClose);
    }
    return () => window.removeEventListener('click', handleClose);
  }, [activeDropdownId]);

  const todayIso = new Date().toISOString().split('T')[0];
  const currentMonthIso = todayIso.slice(0, 7);

  // Separate inventory into Available vs Used
  const availableItems = inventory.filter((item) => !item.isUsed);
  const usedItems = inventory.filter((item) => Boolean(item.isUsed));

  // Filter Available Items
  const filteredAvailableItems = availableItems.filter((item) => {
    const matchesSearch =
      item.stockType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jobSize.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.receivingFrom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.pressName && item.pressName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.jobName && item.jobName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPrint =
      printFilter === 'All'
        ? true
        : printFilter === 'Printed'
        ? item.isPrinted
        : !item.isPrinted;

    if (dateFilter) {
      const itemDate = (item.orderedAt || '').split(' ')[0];
      if (itemDate !== dateFilter) return false;
    }

    if (monthFilter) {
      const itemMonth = (item.orderedAt || '').slice(0, 7);
      if (itemMonth !== monthFilter) return false;
    }

    return matchesSearch && matchesPrint;
  });

  // Filter Used Items
  const filteredUsedItems = usedItems.filter((item) => {
    const matchesSearch =
      item.stockType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jobSize.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.receivingFrom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.usedJobName && item.usedJobName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.usedJobDescription && item.usedJobDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.jobName && item.jobName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPrint =
      printFilter === 'All'
        ? true
        : printFilter === 'Printed'
        ? item.isPrinted
        : !item.isPrinted;

    if (dateFilter) {
      const dateSource = (item.usedAt || item.orderedAt || '').split(' ')[0];
      if (dateSource !== dateFilter) return false;
    }

    if (monthFilter) {
      const monthSource = (item.usedAt || item.orderedAt || '').slice(0, 7);
      if (monthSource !== monthFilter) return false;
    }

    return matchesSearch && matchesPrint;
  });

  // KPI metrics
  const totalAvailableQty = availableItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const printedAvailableCount = availableItems.filter((i) => i.isPrinted).length;
  const nonPrintedAvailableCount = availableItems.filter((i) => !i.isPrinted).length;

  const totalUsedQty = usedItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const usedForJobsCount = usedItems.filter((i) => Boolean(i.usedJobName || i.jobName)).length;

  // Open "Mark Stock As Used" Modal
  const handleOpenMarkUsed = (item: InventoryItem) => {
    setMarkUsedItem(item);
    setUsedQuantity(item.quantity);
    setUsedAtTimestamp(formatReceivedTimestamp());

    if (item.jobId && jobs.some((j) => j.id === item.jobId)) {
      setJobSelectionMode('existing_job');
      setSelectedJobId(item.jobId);
      const matchedJob = jobs.find((j) => j.id === item.jobId);
      setUsedJobName(matchedJob?.jobName || item.jobName || '');
      setUsedJobDescription(
        matchedJob
          ? `${matchedJob.jobType}${matchedJob.boardSize ? ' • ' + matchedJob.boardSize : ''}${matchedJob.notes ? ' • ' + matchedJob.notes : ''}`
          : item.notes || ''
      );
    } else if (jobs.length > 0) {
      setJobSelectionMode('existing_job');
      const firstJob = jobs[0];
      setSelectedJobId(firstJob.id);
      setUsedJobName(firstJob.jobName);
      setUsedJobDescription(
        `${firstJob.jobType}${firstJob.boardSize ? ' • ' + firstJob.boardSize : ''}${firstJob.notes ? ' • ' + firstJob.notes : ''}`
      );
    } else {
      setJobSelectionMode('custom');
      setUsedJobName(item.jobName || '');
      setUsedJobDescription(item.notes || '');
    }
  };

  const handleSelectJobChange = (jobId: string) => {
    setSelectedJobId(jobId);
    const j = jobs.find((job) => job.id === jobId);
    if (j) {
      setUsedJobName(j.jobName);
      setUsedJobDescription(
        `${j.jobType}${j.boardSize ? ' • ' + j.boardSize : ''}${j.notes ? ' • ' + j.notes : ''}`
      );
    }
  };

  const handleSubmitMarkUsed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markUsedItem || !onUpdateInventoryDetails) return;

    if (!usedJobName.trim()) {
      alert('Please specify a Job Name for this used stock.');
      return;
    }

    await onUpdateInventoryDetails(markUsedItem.id, {
      isUsed: true,
      status: 'Used',
      usedAt: usedAtTimestamp || formatReceivedTimestamp(),
      usedJobName: usedJobName.trim(),
      usedJobDescription: usedJobDescription.trim(),
      usedJobId: jobSelectionMode === 'existing_job' ? selectedJobId : undefined,
      quantity: usedQuantity > 0 ? usedQuantity : markUsedItem.quantity,
    });

    setMarkUsedItem(null);
    setInventoryTab('used'); // Automatically switch to Used Stock section
  };

  const handleConfirmRevert = async () => {
    if (!revertConfirmItem || !onUpdateInventoryDetails) return;
    await onUpdateInventoryDetails(revertConfirmItem.id, {
      isUsed: false,
      status: revertConfirmItem.receivedAt ? 'Received' : 'Not Received',
      usedAt: undefined,
      usedJobName: undefined,
      usedJobDescription: undefined,
      usedJobId: undefined,
    });
    setRevertConfirmItem(null);
  };

  return (
    <div className="space-y-5">
      
      {/* Header & Section Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Plant Inventory Registry</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage factory paper board lots, track consumption, and view completed used stock
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onOpenOrderModal}
            className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Order Stock / Tooling</span>
          </button>
        </div>
      </div>

      {/* Primary Section Switcher Tabs: Available Stock vs Used Stock */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setInventoryTab('available')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            inventoryTab === 'available'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Available Stock</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
            inventoryTab === 'available' ? 'bg-slate-950/30 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
          }`}>
            {availableItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setInventoryTab('used')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            inventoryTab === 'used'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Used Stock (Consumed)</span>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
            inventoryTab === 'used' ? 'bg-slate-950/30 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
          }`}>
            {usedItems.length}
          </span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* SECTION 1: AVAILABLE STOCK */}
      {/* =================================================================== */}
      {inventoryTab === 'available' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* KPI Cards for Available Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Available In-Stock Lots</span>
              <div className="text-2xl font-bold font-mono text-white tabular-nums">
                {availableItems.length}
              </div>
              <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                {totalAvailableQty.toLocaleString()} available units
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Printed Stock (Ready)</span>
              <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                {printedAvailableCount}
              </div>
              <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                Allocated to press printing
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Plain / Non-Printed Stock</span>
              <div className="text-2xl font-bold font-mono text-blue-400 tabular-nums">
                {nonPrintedAvailableCount}
              </div>
              <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                Standard raw board buffer
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-3xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search available stock type, board size, vendor, or job..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shrink-0">
                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium">Month:</span>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark] cursor-pointer"
                />
                {monthFilter ? (
                  <button
                    type="button"
                    onClick={() => setMonthFilter('')}
                    title="Clear month filter"
                    className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMonthFilter(currentMonthIso)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold px-1.5 py-0.5 rounded bg-blue-950/40 border border-blue-800/40 cursor-pointer"
                  >
                    This Month
                  </button>
                )}
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shrink-0">
                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium">Date:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark] cursor-pointer"
                />
                {dateFilter ? (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    title="Clear date filter"
                    className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDateFilter(todayIso)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>

            {/* Print Type Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['All', 'Printed', 'Non-Printed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPrintFilter(filter)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    printFilter === filter
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Available Items List */}
          {filteredAvailableItems.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">No Available Inventory Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                {availableItems.length === 0
                  ? 'All inventory items are currently marked as used, or your stock registry is empty.'
                  : 'No available items match your search, month, or date filter.'}
              </p>
              <button
                onClick={onOpenOrderModal}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Order Stock</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredAvailableItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold text-white">
                        {item.stockType}
                      </span>

                      {/* Print Status */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                          item.isPrinted
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-950 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {item.isPrinted ? <Printer className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        <span>{item.isPrinted ? `Printed (${item.pressName || 'Assigned'})` : 'Non-Printed'}</span>
                      </span>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.isExistingStock && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                            Existing Stock
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Received{item.receivedAt ? `: ${item.receivedAt}` : ''}</span>
                        </span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs font-mono text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Board Size: <strong className="text-white">{item.jobSize}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        <span>Vendor: <strong className="text-white">{item.receivingFrom}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                        <span>Job: <strong className="text-amber-400">{item.jobName || 'General Buffer (No Job)'}</strong></span>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-400 italic">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Quantity and Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-3.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">In Stock</span>
                      <span className="text-xl font-bold font-mono text-white tabular-nums">
                        {item.quantity.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 relative">
                      {/* PROMINENT MARK AS USED ACTION */}
                      <button
                        type="button"
                        onClick={() => handleOpenMarkUsed(item)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                        title="Mark this stock as used for a job"
                      >
                        <CheckSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Mark as Used</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        title="Show Detail"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Detail</span>
                      </button>

                      {/* 3-DOT BUTTON */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* DROPDOWN */}
                        {activeDropdownId === item.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 w-52 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownId(null);
                                handleOpenMarkUsed(item);
                              }}
                              className="w-full px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                              <span>Mark as Used...</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownId(null);
                                setDetailItem(item);
                              }}
                              className="w-full px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                              <span>Show Detail</span>
                            </button>

                            {onUpdateInventoryDetails && (
                              <button
                                type="button"
                                onClick={async () => {
                                  setActiveDropdownId(null);
                                  await onUpdateInventoryDetails(item.id, { isUrgent: !item.isUrgent });
                                }}
                                className="w-full px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Flame className={`w-3.5 h-3.5 ${item.isUrgent ? 'text-rose-400 fill-rose-400' : 'text-slate-400'}`} />
                                <span>{item.isUrgent ? 'Remove Urgent' : 'Mark Urgent 🔥'}</span>
                              </button>
                            )}

                            <div className="my-1 border-t border-slate-800" />

                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownId(null);
                                setDeleteConfirmItem(item);
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
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION 2: USED STOCK (CONSUMED) - DEDICATED SEPARATE SECTION */}
      {/* =================================================================== */}
      {inventoryTab === 'used' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          
          {/* Header Banner for Used Stock Section */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <CheckSquare className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Used Stock & Consumed Inventory</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {usedItems.length} Lots Consumed
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Audit trail of all board lots consumed by completed jobs, press runs, or custom factory allocations.
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right font-mono">
              <span className="text-[10px] text-slate-400 uppercase block">Total Consumed Units</span>
              <span className="text-xl font-bold text-emerald-400">{totalUsedQty.toLocaleString()} units</span>
            </div>
          </div>

          {/* KPI Cards for Used Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Total Consumed Lots</span>
              <div className="text-2xl font-bold font-mono text-white tabular-nums">
                {usedItems.length}
              </div>
              <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                {totalUsedQty.toLocaleString()} total units consumed
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Consumed for Specific Jobs</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                {usedForJobsCount}
              </div>
              <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                Linked to job numbers & descriptions
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">General Plant Allocations</span>
              <div className="text-2xl font-bold font-mono text-blue-400 tabular-nums">
                {usedItems.length - usedForJobsCount}
              </div>
              <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                Manual / factory maintenance runs
              </span>
            </div>
          </div>

          {/* Filter Bar for Used Stock */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-3xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search used stock by job name, description, board size, or vendor..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shrink-0">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium">Month:</span>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark] cursor-pointer"
                />
                {monthFilter ? (
                  <button
                    type="button"
                    onClick={() => setMonthFilter('')}
                    title="Clear month filter"
                    className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMonthFilter(currentMonthIso)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 cursor-pointer"
                  >
                    This Month
                  </button>
                )}
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shrink-0">
                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium">Date:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark] cursor-pointer"
                />
                {dateFilter ? (
                  <button
                    type="button"
                    onClick={() => setDateFilter('')}
                    title="Clear date filter"
                    className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDateFilter(todayIso)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>

            {/* Print Type Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['All', 'Printed', 'Non-Printed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPrintFilter(filter)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    printFilter === filter
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Used Items List */}
          {filteredUsedItems.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">No Used Stock Records Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                {usedItems.length === 0
                  ? 'No stock items have been marked as used yet. Complete a factory job or use the "Mark as Used" button on available stock.'
                  : 'No used inventory lots match your current search, date, or month criteria.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredUsedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-900/40 hover:border-emerald-700/60 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2.5 flex-1">
                    {/* Header Badges & Job Name */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold text-white">
                        {item.stockType}
                      </span>

                      {/* Job Badge */}
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                        <span>Job: {item.usedJobName || item.jobName || 'Factory Production'}</span>
                      </span>

                      {/* Used / Consumed Status */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Used / Consumed</span>
                      </span>

                      {/* Used Timestamp */}
                      {item.usedAt && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Used: {item.usedAt}</span>
                        </span>
                      )}
                    </div>

                    {/* Job Description / Usage Details Box */}
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
                      <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                          Job Usage & Notes
                        </span>
                        <p className="text-slate-200">
                          {item.usedJobDescription || item.notes || 'Consumed for job order manufacturing run.'}
                        </p>
                      </div>
                    </div>

                    {/* Specs Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3 text-xs font-mono text-slate-300 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Board Size: <strong className="text-white">{item.jobSize}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        <span>Vendor: <strong className="text-white">{item.receivingFrom}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.isPrinted ? <Printer className="w-3.5 h-3.5 text-amber-400" /> : <FileText className="w-3.5 h-3.5 text-slate-500" />}
                        <span>{item.isPrinted ? `Printed (${item.pressName || 'Assigned'})` : 'Non-Printed'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.receivedAt ? `Rec: ${item.receivedAt}` : `Order: ${item.orderedAt || '—'}`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Consumed & Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-3.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold block">Units Consumed</span>
                      <span className="text-xl font-bold font-mono text-emerald-300 tabular-nums">
                        {item.quantity.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 relative">
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        title="Show Detail"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Detail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRevertConfirmItem(item)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        title="Revert back to Available Stock"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                        <span>Revert</span>
                      </button>

                      {/* 3-DOT MENU */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeDropdownId === item.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1 w-52 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownId(null);
                                setDetailItem(item);
                              }}
                              className="w-full px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>Show Full Detail</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownId(null);
                                setRevertConfirmItem(item);
                              }}
                              className="w-full px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                              <span>Revert to Available Stock</span>
                            </button>

                            <div className="my-1 border-t border-slate-800" />

                            <button
                              type="button"
                              onClick={() => {
                                setActiveDropdownId(null);
                                setDeleteConfirmItem(item);
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
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: MARK STOCK AS USED (FOR EXISTING STOCK WITH OR WITHOUT JOB) */}
      {/* =================================================================== */}
      {markUsedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Mark Stock as Used</h3>
                  <p className="text-xs text-slate-400">Assign to a job and move to Used Stock history</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMarkUsedItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitMarkUsed} className="p-6 space-y-4 overflow-y-auto text-xs">
              
              {/* Stock Spec Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono">
                <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Target Inventory Item</div>
                <div className="text-sm font-bold text-white">{markUsedItem.stockType}</div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 text-xs pt-1">
                  <div>Board Size: <span className="text-amber-300 font-bold">{markUsedItem.jobSize}</span></div>
                  <div>Available Qty: <span className="text-sky-400 font-bold">{markUsedItem.quantity.toLocaleString()}</span></div>
                  <div>Vendor: <span className="text-slate-200">{markUsedItem.receivingFrom}</span></div>
                  <div>Print: <span className="text-slate-200">{markUsedItem.isPrinted ? `Printed (${markUsedItem.pressName || 'Press'})` : 'Non-Printed'}</span></div>
                </div>
              </div>

              {/* Job Allocation Mode (Active Jobs vs Custom) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Job Allocation Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setJobSelectionMode('existing_job');
                      if (jobs.length > 0 && !selectedJobId) {
                        handleSelectJobChange(jobs[0].id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      jobSelectionMode === 'existing_job'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold">Select Active Job</div>
                    <div className="text-[10px] text-slate-400 font-normal">Pick from current queue</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setJobSelectionMode('custom')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      jobSelectionMode === 'custom'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold">Enter Custom Job Details</div>
                    <div className="text-[10px] text-slate-400 font-normal">Type custom name & notes</div>
                  </button>
                </div>
              </div>

              {/* If Selecting Active Job */}
              {jobSelectionMode === 'existing_job' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Select Active Job</label>
                  {jobs.length === 0 ? (
                    <p className="text-xs text-amber-400 italic bg-amber-950/20 p-2.5 rounded-xl border border-amber-900/30">
                      No jobs currently in queue. Please select &quot;Enter Custom Job Details&quot; instead.
                    </p>
                  ) : (
                    <select
                      value={selectedJobId}
                      onChange={(e) => handleSelectJobChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.jobName} — {j.jobType} ({j.status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Job Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Job Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={usedJobName}
                  onChange={(e) => setUsedJobName(e.target.value)}
                  placeholder="e.g. Order #5092 - Heavy Duty Outer Box"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Job Description / Usage Details Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Job Description & Usage Details <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={usedJobDescription}
                  onChange={(e) => setUsedJobDescription(e.target.value)}
                  placeholder="Describe what this stock was used for (e.g. 5,000 sheets consumed on flexo printer for 3-ply carton run)..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Quantity Used & Timestamp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Quantity Consumed (Units)</label>
                  <input
                    type="number"
                    min={1}
                    value={usedQuantity}
                    onChange={(e) => setUsedQuantity(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Recorded Date & Time</label>
                  <input
                    type="text"
                    value={usedAtTimestamp}
                    onChange={(e) => setUsedAtTimestamp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMarkUsedItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirm & Mark as Used</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: CONFIRMATION FOR REVERTING USED STOCK TO AVAILABLE */}
      {/* =================================================================== */}
      {revertConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Revert to Available Stock?</h3>
                <p className="text-xs text-slate-400">Restore this lot back into active factory inventory</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to revert stock <strong>{revertConfirmItem.stockType}</strong> ({revertConfirmItem.quantity.toLocaleString()} units) back to active available inventory? It will be removed from the Used Stock section.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRevertConfirmItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevert}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors cursor-pointer"
              >
                Revert to Available
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: CONFIRMATION FOR DELETING INVENTORY */}
      {/* =================================================================== */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Inventory Record?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete stock <strong>{deleteConfirmItem.stockType}</strong> ({deleteConfirmItem.quantity.toLocaleString()} units)?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteInventory(deleteConfirmItem.id);
                  setDeleteConfirmItem(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: DETAIL MODAL FOR INVENTORY ITEM (SHOWS ALL SPECS) */}
      {/* =================================================================== */}
      {detailItem && (() => {
        const item = detailItem;
        const isDie = item.category === 'Die';
        const isUrgent = Boolean(item.isUrgent);
        const isUsed = Boolean(item.isUsed);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    isUsed
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : isDie
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {isUsed ? <CheckSquare className="w-5 h-5" /> : isDie ? <Scissors className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isUsed ? 'Used Stock Detailed Audit' : isDie ? 'Die Tooling Detail' : 'Inventory Stock Detail'}
                    </h3>
                    <p className="text-xs text-slate-400">Spec details, supplier & job allocation</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 overflow-y-auto text-xs">
                {/* Status Bar */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
                    isUsed
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-blue-950 text-blue-300 border-blue-800'
                  }`}>
                    {isUsed ? '✅ USED / CONSUMED' : `📦 ${item.status || 'Received'}`}
                  </span>
                  {isUrgent && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-rose-400" />
                      <span>URGENT</span>
                    </span>
                  )}
                </div>

                {/* Used Details Callout if Used */}
                {isUsed && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 space-y-2">
                    <div className="flex items-center justify-between text-emerald-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-emerald-400" />
                        <span>Job: {item.usedJobName || item.jobName || 'Factory Production'}</span>
                      </span>
                      {item.usedAt && (
                        <span className="text-[11px] font-mono text-emerald-400 font-normal">
                          {item.usedAt}
                        </span>
                      )}
                    </div>
                    {item.usedJobDescription && (
                      <div className="text-slate-300 pt-1 border-t border-emerald-800/30">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block font-bold">Consumption Details:</span>
                        <p className="italic text-slate-200 mt-0.5">{item.usedJobDescription}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Specs Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Stock / Tool Type:</span>
                    <span className="font-bold text-white text-sm">{item.stockType}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">{isDie ? 'Punch Spec:' : 'Board Size:'}</span>
                    <span className="font-mono font-bold text-amber-300">{item.jobSize}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Quantity {isUsed ? 'Consumed:' : 'in Registry:'}</span>
                    <span className={`font-mono font-bold ${isUsed ? 'text-emerald-300' : 'text-sky-400'}`}>
                      {Number(item.quantity).toLocaleString()} units
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">{isDie ? 'Die Maker:' : 'Supplier / Vendor:'}</span>
                    <span className="font-semibold text-slate-200">{item.receivingFrom}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Job:</span>
                    <span className="font-semibold text-amber-400">{item.usedJobName || item.jobName || 'General Plant Buffer'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Print Specification:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      item.isPrinted
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.isPrinted ? `Printed (${item.pressName || 'Assigned'})` : 'Non-Printed (Plain Kraft)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Recorded Date:</span>
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
                  {item.notes && !isUsed && (
                    <div className="pt-2 border-t border-slate-850">
                      <span className="text-slate-400 block mb-0.5">Notes:</span>
                      <p className="text-slate-300 italic">{item.notes}</p>
                    </div>
                  )}
                </div>

                {/* Optional Die Tooling Photo */}
                {item.category === 'Die' && item.photoUrl && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Die Tooling Photo</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: item.photoUrl!, title: `${item.dieMaker || 'Die'} Tooling Proof` })}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                      >
                        View Full Size
                      </button>
                    </div>
                    <div 
                      onClick={() => setPreviewImage({ url: item.photoUrl!, title: `${item.stockType} Proof` })}
                      className="cursor-pointer group relative overflow-hidden rounded-lg border border-slate-800"
                    >
                      <img
                        src={item.photoUrl}
                        alt="Item Proof"
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-transparent transition-colors flex items-center justify-center">
                        <span className="px-2.5 py-1 rounded-md bg-slate-950/80 text-[11px] text-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                          Click to enlarge 🔍
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <div>
                  {isUsed && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailItem(null);
                        setRevertConfirmItem(item);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/40 border border-blue-800/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Revert to Available</span>
                    </button>
                  )}
                  {!isUsed && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailItem(null);
                        handleOpenMarkUsed(item);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Mark as Used</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
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
      {/* FULL-SCREEN IMAGE LIGHTBOX MODAL */}
      {/* =================================================================== */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-70 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>{previewImage.title}</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/40 overflow-auto max-h-[80vh]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
