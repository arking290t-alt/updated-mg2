import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Search, 
  Check, 
  ChevronDown, 
  Layers, 
  Printer, 
  FileText, 
  Truck, 
  Hash, 
  Maximize2,
  Tag,
  Trash2,
  PackagePlus,
  AlertCircle
} from 'lucide-react';
import { InventoryItem, CorrugationJob, StockItemEntry } from '../types/job';

interface OrderInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveInventoryOrders: (
    orders: Omit<InventoryItem, 'id' | 'orderedAt' | 'status'>[]
  ) => void;
  availableStockTypes: string[];
  onAddNewStockType: (newType: string) => void;
  onDeleteStockType?: (type: string) => void;
  availableSuppliers: string[];
  onAddNewSupplier: (newSupplier: string) => void;
  onDeleteSupplier?: (supplier: string) => void;
  availablePresses: string[];
  onAddNewPress: (newPress: string) => void;
  onDeletePress?: (press: string) => void;
  targetJob?: CorrugationJob | null;
}

export const OrderInventoryModal: React.FC<OrderInventoryModalProps> = ({
  isOpen,
  onClose,
  onSaveInventoryOrders,
  availableStockTypes,
  onAddNewStockType,
  onDeleteStockType,
  availableSuppliers,
  onAddNewSupplier,
  onDeleteSupplier,
  availablePresses,
  onAddNewPress,
  onDeletePress,
  targetJob,
}) => {
  // Current Stock Item Editor State
  const [stockType, setStockType] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);
  const [isAddingNewStockType, setIsAddingNewStockType] = useState(false);
  const [newStockTypeInput, setNewStockTypeInput] = useState('');

  const [jobSize, setJobSize] = useState('1200 x 850 mm');

  // Receiving From (Search & Save)
  const [receivingFrom, setReceivingFrom] = useState(availableSuppliers[0] || 'International Paper Mills');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);
  const [newSupplierInput, setNewSupplierInput] = useState('');

  // Printed or Non-Printed
  const [isPrinted, setIsPrinted] = useState(false);

  // Press Name (Search & Save)
  const [pressName, setPressName] = useState(availablePresses[0] || 'Flexo Press 1 (4-Color)');
  const [pressSearch, setPressSearch] = useState('');
  const [isPressDropdownOpen, setIsPressDropdownOpen] = useState(false);
  const [isAddingNewPress, setIsAddingNewPress] = useState(false);
  const [newPressInput, setNewPressInput] = useState('');

  // Quantity (no measurement unit)
  const [quantity, setQuantity] = useState<number>(2500);

  // Notes
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // MULTIPLE STOCKS QUEUE FOR JOB
  const [stockQueue, setStockQueue] = useState<StockItemEntry[]>([]);

  // Filtered Stock Types
  const filteredStockTypes = useMemo(() => {
    if (!stockSearch.trim()) return availableStockTypes;
    return availableStockTypes.filter((t) =>
      t.toLowerCase().includes(stockSearch.trim().toLowerCase())
    );
  }, [availableStockTypes, stockSearch]);

  // Filtered Suppliers (Receiving From)
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return availableSuppliers;
    return availableSuppliers.filter((s) =>
      s.toLowerCase().includes(supplierSearch.trim().toLowerCase())
    );
  }, [availableSuppliers, supplierSearch]);

  // Filtered Presses
  const filteredPresses = useMemo(() => {
    if (!pressSearch.trim()) return availablePresses;
    return availablePresses.filter((p) =>
      p.toLowerCase().includes(pressSearch.trim().toLowerCase())
    );
  }, [availablePresses, pressSearch]);

  if (!isOpen) return null;

  // Handlers for Stock Type
  const handleSelectStockType = (type: string) => {
    setStockType(type);
    setIsStockDropdownOpen(false);
    setStockSearch('');
    setErrorMessage('');
  };

  const handleSaveStockType = (typeToAdd?: string) => {
    const raw = (typeToAdd || newStockTypeInput).trim();
    if (!raw) return;
    onAddNewStockType(raw);
    setStockType(raw);
    setNewStockTypeInput('');
    setIsAddingNewStockType(false);
    setIsStockDropdownOpen(false);
    setStockSearch('');
    setErrorMessage('');
  };

  // Handlers for Receiving From (Supplier)
  const handleSelectSupplier = (supp: string) => {
    setReceivingFrom(supp);
    setIsSupplierDropdownOpen(false);
    setSupplierSearch('');
  };

  const handleSaveSupplier = (suppToAdd?: string) => {
    const raw = (suppToAdd || newSupplierInput).trim();
    if (!raw) return;
    onAddNewSupplier(raw);
    setReceivingFrom(raw);
    setNewSupplierInput('');
    setIsAddingNewSupplier(false);
    setIsSupplierDropdownOpen(false);
    setSupplierSearch('');
  };

  // Handlers for Press Name
  const handleSelectPress = (p: string) => {
    setPressName(p);
    setIsPressDropdownOpen(false);
    setPressSearch('');
  };

  const handleSavePress = (pressToAdd?: string) => {
    const raw = (pressToAdd || newPressInput).trim();
    if (!raw) return;
    onAddNewPress(raw);
    setPressName(raw);
    setNewPressInput('');
    setIsAddingNewPress(false);
    setIsPressDropdownOpen(false);
    setPressSearch('');
  };

  // Validate current single form inputs
  const validateCurrentItem = (): boolean => {
    if (!stockType.trim()) {
      setErrorMessage('Please select or add a Stock Type.');
      return false;
    }
    if (!jobSize.trim()) {
      setErrorMessage('Please enter the Job Size.');
      return false;
    }
    if (!receivingFrom.trim()) {
      setErrorMessage('Please select or enter Receiving From source.');
      return false;
    }
    if (quantity <= 0) {
      setErrorMessage('Please enter a valid Quantity.');
      return false;
    }
    if (isPrinted && !pressName.trim()) {
      setErrorMessage('Please select or add a Press Name for printed stock.');
      return false;
    }
    return true;
  };

  // Add current configured stock to the multi-stock queue
  const handleAddCurrentStockToQueue = () => {
    if (!validateCurrentItem()) return;

    const newEntry: StockItemEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      stockType: stockType.trim(),
      jobSize: jobSize.trim(),
      receivingFrom: receivingFrom.trim(),
      isPrinted,
      pressName: isPrinted ? pressName.trim() : undefined,
      quantity: Number(quantity),
      notes: notes.trim() || undefined,
    };

    setStockQueue((prev) => [...prev, newEntry]);

    // Reset fields for the next stock addition
    setStockType('');
    setNotes('');
    setErrorMessage('');
  };

  // Remove item from queue
  const handleRemoveQueueItem = (entryId: string) => {
    setStockQueue((prev) => prev.filter((i) => i.id !== entryId));
  };

  // Submit all items in queue (or current item if queue is empty)
  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();

    let allItemsToSubmit: StockItemEntry[] = [...stockQueue];

    // If queue is empty or user also has filled in current form fields, validate and include it
    if (stockType.trim()) {
      if (!validateCurrentItem()) return;
      allItemsToSubmit.push({
        id: `entry-${Date.now()}`,
        stockType: stockType.trim(),
        jobSize: jobSize.trim(),
        receivingFrom: receivingFrom.trim(),
        isPrinted,
        pressName: isPrinted ? pressName.trim() : undefined,
        quantity: Number(quantity),
        notes: notes.trim() || undefined,
      });
    }

    if (allItemsToSubmit.length === 0) {
      setErrorMessage('Please add at least one stock item to order.');
      return;
    }

    const payload = allItemsToSubmit.map((item) => ({
      stockType: item.stockType,
      jobSize: item.jobSize,
      receivingFrom: item.receivingFrom,
      isPrinted: item.isPrinted,
      pressName: item.pressName,
      quantity: item.quantity,
      jobId: targetJob ? targetJob.id : undefined,
      jobName: targetJob ? targetJob.jobName : undefined,
      notes: item.notes,
    }));

    onSaveInventoryOrders(payload);

    // Reset everything
    setStockQueue([]);
    setStockType('');
    setNotes('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>{targetJob ? 'Order Inventory for Job' : 'Order General Inventory'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {targetJob ? (
                <span>
                  Allocating material for: <strong className="text-amber-400 font-semibold">{targetJob.jobName}</strong>
                </span>
              ) : (
                'Order raw materials and board stock for plant warehouse buffer'
              )}
            </p>
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
          <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* MULTIPLE STOCK QUEUE SUMMARY (shows when items are added) */}
          {stockQueue.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <PackagePlus className="w-4 h-4" />
                  <span>Stock Items Added to this Job Order ({stockQueue.length})</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Total Qty: {stockQueue.reduce((acc, i) => acc + i.quantity, 0).toLocaleString()}
                </span>
              </div>

              <div className="space-y-2">
                {stockQueue.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-300 font-bold">#{idx + 1}</span>
                        <span className="font-semibold text-white truncate">{item.stockType}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                          {item.isPrinted ? `Printed (${item.pressName})` : 'Non-Printed'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Size: {item.jobSize} · From: {item.receivingFrom} · Qty: <strong className="text-white">{item.quantity.toLocaleString()}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQueueItem(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      title="Remove this stock item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Divider: Configure Stock Item */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase font-mono tracking-wide">
              {stockQueue.length > 0 ? '+ Configure Additional Stock Item' : 'Stock Details'}
            </span>
            <span className="text-[11px] text-slate-400">Fill details and add to order</span>
          </div>

          {/* 1. STOCK TYPE (Search, Select, and Type/Save) */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Stock Type <span className="text-amber-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewStockType(!isAddingNewStockType);
                  setIsStockDropdownOpen(false);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingNewStockType ? 'Select from list' : 'Type & save new stock type'}</span>
              </button>
            </div>

            {isAddingNewStockType && (
              <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2 mb-2">
                <span className="text-[11px] text-amber-400 font-medium">Type custom stock type name to save:</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStockTypeInput}
                    onChange={(e) => setNewStockTypeInput(e.target.value)}
                    placeholder="e.g. 230 GSM Semi-Chemical Kraft Liner..."
                    autoFocus
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveStockType();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveStockType()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Save & Select
                  </button>
                </div>
              </div>
            )}

            <div
              onClick={() => setIsStockDropdownOpen(!isStockDropdownOpen)}
              className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm flex items-center justify-between cursor-pointer transition-colors ${
                isStockDropdownOpen ? 'border-amber-500' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                <span className={stockType ? 'text-slate-100 font-medium' : 'text-slate-500'}>
                  {stockType || 'Search and select stock type...'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStockDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isStockDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-2">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Search stock types (e.g. Kraft, Fluting, White Top)..."
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1">
                  <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 mb-1">
                    <span>Saved Stock Types ({filteredStockTypes.length})</span>
                    {stockSearch && <span>Filter: "{stockSearch}"</span>}
                  </div>

                  {filteredStockTypes.length > 0 ? (
                    filteredStockTypes.map((type) => (
                      <div
                        key={type}
                        className={`px-3 py-2 text-xs rounded-lg flex items-center justify-between cursor-pointer transition-colors group ${
                          stockType === type
                            ? 'bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div 
                          onClick={() => handleSelectStockType(type)}
                          className="flex-1 flex items-center gap-2 truncate"
                        >
                          <span className="truncate">{type}</span>
                          {stockType === type && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>

                        {onDeleteStockType && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (stockType === type) setStockType('');
                              onDeleteStockType(type);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 rounded transition-colors opacity-70 group-hover:opacity-100 ml-2"
                            title={`Delete saved stock type "${type}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      <span>No saved stock types match "{stockSearch}".</span>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Only saved items are shown in search.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. JOB SIZE */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Job Size (Dimensions / Deckle Cut) <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <Maximize2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={jobSize}
                onChange={(e) => setJobSize(e.target.value)}
                placeholder="e.g. 1200 x 850 mm or Deckle 1600mm x Cut 950mm"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* 3. RECEIVING FROM (Search & Save as requested) */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Receiving From <span className="text-amber-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewSupplier(!isAddingNewSupplier);
                  setIsSupplierDropdownOpen(false);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingNewSupplier ? 'Select existing' : 'Type & save new receiving vendor'}</span>
              </button>
            </div>

            {isAddingNewSupplier && (
              <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2 mb-2">
                <span className="text-[11px] text-amber-400 font-medium">Type new vendor / receiving depot name to save:</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSupplierInput}
                    onChange={(e) => setNewSupplierInput(e.target.value)}
                    placeholder="e.g. Smurfit Kappa Mill Bay 4, Georgia-Pacific..."
                    autoFocus
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveSupplier();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveSupplier()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Save & Select
                  </button>
                </div>
              </div>
            )}

            <div
              onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
              className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm flex items-center justify-between cursor-pointer transition-colors ${
                isSupplierDropdownOpen ? 'border-amber-500' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                <span className={receivingFrom ? 'text-slate-100 font-medium' : 'text-slate-500'}>
                  {receivingFrom || 'Search and select receiving supplier...'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isSupplierDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {isSupplierDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-2">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    placeholder="Search receiving vendors..."
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1">
                  <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 mb-1">
                    <span>Saved Suppliers ({filteredSuppliers.length})</span>
                    {supplierSearch && <span>Filter: "{supplierSearch}"</span>}
                  </div>

                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((supp) => (
                      <div
                        key={supp}
                        className={`px-3 py-2 text-xs rounded-lg flex items-center justify-between cursor-pointer transition-colors group ${
                          receivingFrom === supp
                            ? 'bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div 
                          onClick={() => handleSelectSupplier(supp)}
                          className="flex-1 flex items-center gap-2 truncate"
                        >
                          <span className="truncate">{supp}</span>
                          {receivingFrom === supp && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>

                        {onDeleteSupplier && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (receivingFrom === supp) setReceivingFrom('');
                              onDeleteSupplier(supp);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 rounded transition-colors opacity-70 group-hover:opacity-100 ml-2"
                            title={`Delete saved supplier "${supp}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      <span>No saved suppliers match "{supplierSearch}".</span>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Only saved items are shown in search.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. PRINTED OR NON-PRINTED & 5. PRESS NAME (Search & Save) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <label className="block text-xs font-semibold text-slate-200">
              Print Specification <span className="text-amber-400">*</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPrinted(false)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  !isPrinted
                    ? 'bg-slate-900 border-amber-500 text-white shadow-xs'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  !isPrinted ? 'bg-slate-800 text-amber-400' : 'bg-slate-900 text-slate-500'
                }`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Non-Printed</div>
                  <div className="text-[10px] text-slate-400">Plain Kraft / Fluted board</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPrinted(true)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  isPrinted
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-xs'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isPrinted ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-500'
                }`}>
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Printed</div>
                  <div className="text-[10px] text-slate-400">Requires press allocation</div>
                </div>
              </button>
            </div>

            {/* 5. PRESS NAME with Search and Save as requested */}
            {isPrinted && (
              <div className="pt-2 relative animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-amber-300">
                    Press Name <span className="text-amber-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewPress(!isAddingNewPress);
                      setIsPressDropdownOpen(false);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isAddingNewPress ? 'Select existing press' : 'Type & save new press'}</span>
                  </button>
                </div>

                {isAddingNewPress && (
                  <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-xl space-y-2 mb-2">
                    <span className="text-[11px] text-amber-400 font-medium">Type custom press name to save:</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPressInput}
                        onChange={(e) => setNewPressInput(e.target.value)}
                        placeholder="e.g. Bobst Expertline 1.6, Heidelberg 4-Color..."
                        autoFocus
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSavePress();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSavePress()}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Save & Select
                      </button>
                    </div>
                  </div>
                )}

                <div
                  onClick={() => setIsPressDropdownOpen(!isPressDropdownOpen)}
                  className={`w-full px-3.5 py-2.5 bg-slate-900 border rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isPressDropdownOpen ? 'border-amber-400' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Printer className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className={pressName ? 'text-white font-medium' : 'text-slate-500'}>
                      {pressName || 'Search and select press name...'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isPressDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isPressDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-2">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={pressSearch}
                        onChange={(e) => setPressSearch(e.target.value)}
                        placeholder="Search press machines..."
                        autoFocus
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1">
                      <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 mb-1">
                        <span>Saved Presses ({filteredPresses.length})</span>
                        {pressSearch && <span>Filter: "{pressSearch}"</span>}
                      </div>

                      {filteredPresses.length > 0 ? (
                        filteredPresses.map((p) => (
                          <div
                            key={p}
                            className={`px-3 py-1.5 text-xs rounded-lg flex items-center justify-between cursor-pointer transition-colors group ${
                              pressName === p
                                ? 'bg-amber-500/10 text-amber-300 font-semibold'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div
                              onClick={() => handleSelectPress(p)}
                              className="flex-1 flex items-center gap-2 truncate"
                            >
                              <span className="truncate">{p}</span>
                              {pressName === p && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            </div>

                            {onDeletePress && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (pressName === p) setPressName('');
                                  onDeletePress(p);
                                }}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 rounded transition-colors opacity-70 group-hover:opacity-100 ml-2"
                                title={`Delete saved press "${p}"`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">
                          <span>No saved presses match "{pressSearch}".</span>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Only saved items are shown in search.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. QUANTITY (measurement unit removed as requested) */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Stock Quantity <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="Enter stock quantity..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Stock Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Moisture rating < 8%, top liner bundle #4..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* OPTION FOR ADDING MULTIPLE STOCK FOR JOBS */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddCurrentStockToQueue}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <PackagePlus className="w-4 h-4 text-amber-400" />
              <span>+ Add Another Stock Item for this Job</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {stockQueue.length > 0 ? (
              <span>Ready to submit <strong>{stockQueue.length + (stockType ? 1 : 0)}</strong> stock items</span>
            ) : (
              <span>1 stock item configured</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitAll}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Confirm & Order Inventory</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
