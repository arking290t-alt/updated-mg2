import React, { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { InventoryItem } from '../types/job';

interface ExistingInventoryViewProps {
  inventory: InventoryItem[];
  onOpenOrderModal: () => void;
  onDeleteInventory: (itemId: string) => void;
}

export const ExistingInventoryView: React.FC<ExistingInventoryViewProps> = ({
  inventory,
  onOpenOrderModal,
  onDeleteInventory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [printFilter, setPrintFilter] = useState<'All' | 'Printed' | 'Non-Printed'>('All');

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

    return matchesSearch && matchesPrint;
  });

  const totalQuantity = inventory.reduce((acc, i) => acc + i.quantity, 0);
  const printedCount = inventory.filter((i) => i.isPrinted).length;
  const nonPrintedCount = inventory.filter((i) => !i.isPrinted).length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wide">Warehouse Registry</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Existing Inventory</h2>
          <p className="text-xs text-slate-400 mt-1">
            Tracked corrugation stock types, job sheet dimensions, printing specifications, and quantities
          </p>
        </div>

        <button
          onClick={onOpenOrderModal}
          className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Order More Inventory</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block">Total Inventory Lots</span>
          <div className="mt-1 text-2xl font-bold font-mono text-white tabular-nums">
            {inventory.length} Stock Batches
          </div>
          <span className="text-xs text-slate-400 mt-1 block font-mono">
            Total Qty: {totalQuantity.toLocaleString()}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block">Printed Stock Orders</span>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {printedCount} Lots
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Allocated to Flexo / Die presses</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block">Non-Printed Stock</span>
          <div className="mt-1 text-2xl font-bold font-mono text-blue-400 tabular-nums">
            {nonPrintedCount} Lots
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Plain fluting and raw Kraft liners</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stock type, job size, receiving vendor, press, or job..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="md:col-span-6 flex items-center justify-start md:justify-end gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit md:ml-auto">
          {(['All', 'Printed', 'Non-Printed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setPrintFilter(filter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                printFilter === filter
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
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

                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    Received
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Size: <strong className="text-white">{item.jobSize}</strong></span>
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

                <button
                  onClick={() => onDeleteInventory(item.id)}
                  title="Remove inventory record"
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
