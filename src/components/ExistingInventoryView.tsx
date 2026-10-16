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
  Camera
} from 'lucide-react';
import { InventoryItem } from '../types/job';

interface ExistingInventoryViewProps {
  inventory: InventoryItem[];
  onOpenOrderModal: () => void;
  onDeleteInventory: (itemId: string) => void;
  onUpdateInventoryDetails?: (itemId: string, updates: Partial<InventoryItem>) => Promise<void>;
}

export const ExistingInventoryView: React.FC<ExistingInventoryViewProps> = ({
  inventory,
  onOpenOrderModal,
  onDeleteInventory,
  onUpdateInventoryDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [printFilter, setPrintFilter] = useState<'All' | 'Printed' | 'Non-Printed'>('All');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<InventoryItem | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    const handleClose = () => setActiveDropdownId(null);
    if (activeDropdownId) {
      window.addEventListener('click', handleClose);
    }
    return () => window.removeEventListener('click', handleClose);
  }, [activeDropdownId]);

  const todayIso = new Date().toISOString().split('T')[0];

  const filteredItems = inventory.filter((item) => {
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

    return matchesSearch && matchesPrint;
  });

  const totalQuantity = inventory.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const printedCount = inventory.filter((i) => i.isPrinted).length;
  const nonPrintedCount = inventory.filter((i) => !i.isPrinted).length;

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Existing Inventory</h2>
          <span className="text-xs text-slate-400">Total lots in registry: {inventory.length}</span>
        </div>

        <button
          onClick={onOpenOrderModal}
          className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Order Inventory</span>
        </button>
      </div>

      {/* KPI Cards (Clean, no extra verbose descriptions) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Total Inventory Lots</span>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {inventory.length}
          </div>
          <span className="text-xs text-slate-400 font-mono mt-0.5 block">
            {totalQuantity.toLocaleString()} total units
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Printed Stock</span>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {printedCount}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Non-Printed Stock</span>
          <div className="text-2xl font-bold font-mono text-blue-400 tabular-nums">
            {nonPrintedCount}
          </div>
        </div>
      </div>

      {/* Search, Date Filter & Print Type Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stock, size, vendor, or job..."
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

      {/* Inventory Items List */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Inventory Lots Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {inventory.length === 0
              ? 'Your inventory registry is currently empty. Place an order with or without a job to record inventory.'
              : 'No inventory items match your current search and filter criteria.'}
          </p>
          <button
            onClick={onOpenOrderModal}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Order Inventory</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredItems.map((item) => (
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
                    <span>{item.isPrinted ? `Printed (${item.pressName})` : 'Non-Printed'}</span>
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
                    <span>Job: <strong className="text-amber-400">{item.jobName || 'General Buffer'}</strong></span>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-xs text-slate-400 italic">
                    Note: {item.notes}
                  </p>
                )}
              </div>

              {/* Quantity and Actions */}
              <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                <div className="text-left lg:text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">In Stock</span>
                  <span className="text-xl font-bold font-mono text-white tabular-nums">
                    {item.quantity.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 relative">
                  <button
                    type="button"
                    onClick={() => setDetailItem(item)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
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
                        className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl z-30 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDropdownId(null);
                            setDetailItem(item);
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
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

      {/* CONFIRMATION MODAL FOR DELETING INVENTORY */}
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

      {/* DETAIL MODAL FOR INVENTORY ITEM */}
      {detailItem && (() => {
        const item = detailItem;
        const isDie = item.category === 'Die';
        const isUrgent = Boolean(item.isUrgent);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    isDie
                      ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {isDie ? <Scissors className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isDie ? 'Die Tooling Detail' : 'Inventory Stock Detail'}
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
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                    ✅ {item.status || 'Received'}
                  </span>
                  {isUrgent && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-rose-400" />
                      <span>URGENT</span>
                    </span>
                  )}
                </div>

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
                    <span className="text-slate-400 font-medium">Quantity in Registry:</span>
                    <span className="font-mono font-bold text-sky-400">{Number(item.quantity).toLocaleString()} units</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">{isDie ? 'Die Maker:' : 'Supplier / Vendor:'}</span>
                    <span className="font-semibold text-slate-200">{item.receivingFrom}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-slate-400 font-medium">Linked Job:</span>
                    <span className="font-semibold text-amber-400">{item.jobName || 'General Plant Buffer'}</span>
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
                  {item.notes && (
                    <div className="pt-2 border-t border-slate-850">
                      <span className="text-slate-400 block mb-0.5">Notes:</span>
                      <p className="text-slate-300 italic">{item.notes}</p>
                    </div>
                  )}
                </div>

                {/* Optional Die Tooling Photo (Only for Die items, Board Stock has no photos) */}
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

                {onUpdateInventoryDetails && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await onUpdateInventoryDetails(item.id, { isUrgent: !isUrgent });
                        setDetailItem({ ...item, isUrgent: !isUrgent });
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
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
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

      {/* FULL-SCREEN IMAGE LIGHTBOX MODAL */}
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
