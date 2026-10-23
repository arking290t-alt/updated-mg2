import React, { useState, useMemo, useEffect } from 'react';
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
  AlertCircle,
  Scissors,
  Calendar,
  Flame,
  CheckCircle2,
  Clock,
  Camera,
  Image as ImageIcon,
  Sparkles,
  PackageCheck,
  Disc
} from 'lucide-react';
import { 
  InventoryItem, 
  CorrugationJob, 
  StockItemEntry, 
  INITIAL_STOCK_TYPES,
  COMMON_SUPPLIERS,
  INITIAL_PRESS_NAMES,
  INITIAL_DIE_MAKERS, 
  INITIAL_PUNCH_TYPES, 
  INITIAL_PRINT_TYPES,
  formatReceivedTimestamp 
} from '../types/job';
import { PhotoDropzone } from './PhotoDropzone';

interface OrderInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveInventoryOrders: (
    orders: (Omit<InventoryItem, 'id'>)[]
  ) => void;
  availableStockTypes?: string[];
  onAddNewStockType: (newType: string) => void;
  onDeleteStockType?: (type: string) => void;
  availableSuppliers?: string[];
  onAddNewSupplier: (newSupplier: string) => void;
  onDeleteSupplier?: (supplier: string) => void;
  availablePresses?: string[];
  onAddNewPress: (newPress: string) => void;
  onDeletePress?: (press: string) => void;
  availablePrintTypes?: string[];
  onAddNewPrintType?: (newPrintType: string) => void;
  onDeletePrintType?: (printType: string) => void;
  targetJob?: CorrugationJob | null;
  existingInventory?: InventoryItem[];
  // Die & Job options
  availableJobs?: CorrugationJob[];
  availableJobTypes?: string[];
  onAddNewJobType?: (newType: string) => void;
  availableDieMakers?: string[];
  onAddNewDieMaker?: (newMaker: string) => void;
  availablePunchTypes?: string[];
  onAddNewPunchType?: (newPunch: string) => void;
}

export const OrderInventoryModal: React.FC<OrderInventoryModalProps> = ({
  isOpen,
  onClose,
  onSaveInventoryOrders,
  availableStockTypes = INITIAL_STOCK_TYPES,
  onAddNewStockType,
  onDeleteStockType,
  availableSuppliers = COMMON_SUPPLIERS,
  onAddNewSupplier,
  onDeleteSupplier,
  availablePresses = INITIAL_PRESS_NAMES,
  onAddNewPress,
  onDeletePress,
  availablePrintTypes = INITIAL_PRINT_TYPES,
  onAddNewPrintType,
  onDeletePrintType,
  targetJob,
  existingInventory = [],
  availableJobs = [],
  availableJobTypes = [],
  onAddNewJobType,
  availableDieMakers = INITIAL_DIE_MAKERS,
  onAddNewDieMaker,
  availablePunchTypes = INITIAL_PUNCH_TYPES,
  onAddNewPunchType,
}) => {
  const todayIso = new Date().toISOString().split('T')[0];

  // Defensive safe defaults for all lists
  const safeStockTypes = Array.isArray(availableStockTypes) && availableStockTypes.length > 0 ? availableStockTypes : INITIAL_STOCK_TYPES;
  const safeSuppliers = Array.isArray(availableSuppliers) && availableSuppliers.length > 0 ? availableSuppliers : COMMON_SUPPLIERS;
  const safePresses = Array.isArray(availablePresses) && availablePresses.length > 0 ? availablePresses : INITIAL_PRESS_NAMES;
  const safePrintTypes = Array.isArray(availablePrintTypes) && availablePrintTypes.length > 0 ? availablePrintTypes : INITIAL_PRINT_TYPES;
  const safeDieMakers = Array.isArray(availableDieMakers) && availableDieMakers.length > 0 ? availableDieMakers : INITIAL_DIE_MAKERS;
  const safePunchTypes = Array.isArray(availablePunchTypes) && availablePunchTypes.length > 0 ? availablePunchTypes : INITIAL_PUNCH_TYPES;
  const safeJobTypes = Array.isArray(availableJobTypes) && availableJobTypes.length > 0 ? availableJobTypes : ['General Corrugation'];
  const safeJobs = Array.isArray(availableJobs) ? availableJobs.filter(Boolean) : [];
  const safeInventory = Array.isArray(existingInventory) ? existingInventory.filter(Boolean) : [];

  // Primary Order Category: Stock vs Die vs Reel
  const [activeCategory, setActiveCategory] = useState<'Stock' | 'Die' | 'Reel'>('Stock');

  // Urgent order priority toggle
  const [isUrgentOrder, setIsUrgentOrder] = useState<boolean>(false);

  // Common Order Date
  const [orderDate, setOrderDate] = useState<string>(todayIso);

  // DIE & JOB SPECIFIC STATE
  const [selectedJobId, setSelectedJobId] = useState<string>(targetJob ? targetJob.id : '');
  const [dieJobName, setDieJobName] = useState<string>(targetJob ? (targetJob.jobName || '') : '');
  const [dieJobType, setDieJobType] = useState<string>(targetJob?.jobType || safeJobTypes[0] || 'General Corrugation');
  const [isAddingNewJobType, setIsAddingNewJobType] = useState(false);
  const [newJobTypeInput, setNewJobTypeInput] = useState('');

  // Sync state when targetJob changes or modal opens
  useEffect(() => {
    if (targetJob) {
      setSelectedJobId(targetJob.id);
      setDieJobName(targetJob.jobName || '');
      setDieJobType(targetJob.jobType || safeJobTypes[0] || 'General Corrugation');
      if (targetJob.jobSize) {
        setJobSize(targetJob.jobSize);
      } else if (targetJob.boardSize) {
        setJobSize(targetJob.boardSize);
      }
    } else {
      setSelectedJobId('');
      setDieJobName('');
      setDieJobType(safeJobTypes[0] || 'General Corrugation');
    }
  }, [targetJob, isOpen, safeJobTypes]);

  const handleSelectExistingJob = (jobId: string) => {
    setSelectedJobId(jobId);
    if (!jobId || jobId === 'custom') {
      setDieJobName('');
      return;
    }
    const found = safeJobs.find((j) => j && j.id === jobId);
    if (found) {
      setDieJobName(found.jobName || '');
      setDieJobType(found.jobType || safeJobTypes[0] || 'General Corrugation');
      if (found.jobSize) {
        setJobSize(found.jobSize);
      } else if (found.boardSize) {
        setJobSize(found.boardSize);
      }
    }
  };

  const [dieMaker, setDieMaker] = useState<string>(safeDieMakers[0] || 'Apex Laser Dies');
  const [isAddingNewDieMaker, setIsAddingNewDieMaker] = useState(false);
  const [newDieMakerInput, setNewDieMakerInput] = useState('');

  const [punchType, setPunchType] = useState<string>(safePunchTypes[0] || 'Rotary Die Punch');
  const [isAddingNewPunchType, setIsAddingNewPunchType] = useState(false);
  const [newPunchTypeInput, setNewPunchTypeInput] = useState('');

  const [dieQuantity, setDieQuantity] = useState<number>(1);
  const [dieNotes, setDieNotes] = useState<string>('');
  const [diePhotoUrl, setDiePhotoUrl] = useState<string>('');

  const handleDiePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        setDiePhotoUrl(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Current Stock Item Editor State
  const [stockType, setStockType] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);
  const [isAddingNewStockType, setIsAddingNewStockType] = useState(false);
  const [newStockTypeInput, setNewStockTypeInput] = useState('');

  const [jobSize, setJobSize] = useState('1200 x 850 mm');

  // Receiving From (Search & Save)
  const [receivingFrom, setReceivingFrom] = useState(safeSuppliers[0] || 'Varun Board');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);
  const [newSupplierInput, setNewSupplierInput] = useState('');

  // Printed or Non-Printed
  const [isPrinted, setIsPrinted] = useState(false);

  // Press Name (Search & Save)
  const [pressName, setPressName] = useState(safePresses[0] || 'Flexo Press 1 (4-Color)');
  const [pressSearch, setPressSearch] = useState('');
  const [isPressDropdownOpen, setIsPressDropdownOpen] = useState(false);
  const [isAddingNewPress, setIsAddingNewPress] = useState(false);
  const [newPressInput, setNewPressInput] = useState('');

  // Print Type (Search & Save) - Configurable print types when stock has print enabled
  const [printType, setPrintType] = useState(safePrintTypes[0] || 'Flexo Printing');
  const [printTypeSearch, setPrintTypeSearch] = useState('');
  const [isPrintTypeDropdownOpen, setIsPrintTypeDropdownOpen] = useState(false);
  const [isAddingNewPrintType, setIsAddingNewPrintType] = useState(false);
  const [newPrintTypeInput, setNewPrintTypeInput] = useState('');

  // Quantity (no measurement unit)
  const [quantity, setQuantity] = useState<number>(2500);

  // Notes
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Use Existing Stock option
  const [isExistingStock, setIsExistingStock] = useState<boolean>(false);

  // Press photo upload option
  const [pressPhotoUrl, setPressPhotoUrl] = useState<string>('');

  // MULTIPLE STOCKS QUEUE FOR JOB
  const [stockQueue, setStockQueue] = useState<StockItemEntry[]>([]);

  // Deletion confirmation state for all items (staged stock, saved stock types, suppliers, presses, print types)
  interface DeleteTarget {
    category: 'stock_item' | 'stock_type' | 'supplier' | 'press' | 'print_type';
    idOrName: string;
    label: string;
  }
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<DeleteTarget | null>(null);

  // Filtered Stock Types
  const filteredStockTypes = useMemo(() => {
    const list = Array.isArray(safeStockTypes) ? safeStockTypes.filter(Boolean) : [];
    if (!stockSearch.trim()) return list;
    return list.filter((t) =>
      typeof t === 'string' && t.toLowerCase().includes(stockSearch.trim().toLowerCase())
    );
  }, [safeStockTypes, stockSearch]);

  // Filtered Suppliers (Receiving From)
  const filteredSuppliers = useMemo(() => {
    const list = Array.isArray(safeSuppliers) ? safeSuppliers.filter(Boolean) : [];
    if (!supplierSearch.trim()) return list;
    return list.filter((s) =>
      typeof s === 'string' && s.toLowerCase().includes(supplierSearch.trim().toLowerCase())
    );
  }, [safeSuppliers, supplierSearch]);

  // Filtered Presses
  const filteredPresses = useMemo(() => {
    const list = Array.isArray(safePresses) ? safePresses.filter(Boolean) : [];
    if (!pressSearch.trim()) return list;
    return list.filter((p) =>
      typeof p === 'string' && p.toLowerCase().includes(pressSearch.trim().toLowerCase())
    );
  }, [safePresses, pressSearch]);

  // Filtered Print Types
  const filteredPrintTypes = useMemo(() => {
    const list = Array.isArray(safePrintTypes) ? safePrintTypes.filter(Boolean) : [];
    if (!printTypeSearch.trim()) return list;
    return list.filter((p) =>
      typeof p === 'string' && p.toLowerCase().includes(printTypeSearch.trim().toLowerCase())
    );
  }, [safePrintTypes, printTypeSearch]);

  // Filter existing inventory for available in-house stock items (MUST BE CALLED UNCONDITIONALLY BEFORE RETURN)
  const availableExistingStock = useMemo(() => {
    if (!Array.isArray(safeInventory) || safeInventory.length === 0) return [];
    return safeInventory.filter(
      (item) => Boolean(item && item.category !== 'Die' && item.stockType && !item.isUsed)
    );
  }, [safeInventory]);

  // Distinct stock types available in existing warehouse stock
  const inStockStockTypes = useMemo(() => {
    const types = new Set<string>();
    availableExistingStock.forEach((item) => {
      if (item.stockType && item.stockType.trim()) {
        types.add(item.stockType.trim());
      }
    });
    return Array.from(types);
  }, [availableExistingStock]);

  // Distinct sizes available for the currently selected stockType in warehouse inventory
  const availableSizesForSelectedStockType = useMemo(() => {
    if (!stockType) return [];
    const sizes = new Set<string>();
    availableExistingStock.forEach((it) => {
      if (
        (it.stockType || '').trim().toLowerCase() === stockType.trim().toLowerCase() &&
        Boolean(it.jobSize && it.jobSize.trim())
      ) {
        sizes.add(it.jobSize.trim());
      }
    });
    return Array.from(sizes);
  }, [availableExistingStock, stockType]);

  // Handler: When user selects an existing size option
  const handleSelectExistingSize = (size: string) => {
    setJobSize(size);
    setErrorMessage('');
    if (!size) {
      setReceivingFrom('');
      return;
    }

    const matchingLot = availableExistingStock.find(
      (it) =>
        (it.stockType || '').trim().toLowerCase() === stockType.trim().toLowerCase() &&
        (it.jobSize || '').trim() === size.trim()
    );

    if (matchingLot) {
      setReceivingFrom(matchingLot.receivingFrom || 'Plant Warehouse (In-House Stock)');
      if (matchingLot.quantity && matchingLot.quantity > 0) {
        setQuantity(matchingLot.quantity);
      }
      if (matchingLot.isPrinted !== undefined) {
        setIsPrinted(matchingLot.isPrinted);
      }
      if (matchingLot.pressName) {
        setPressName(matchingLot.pressName);
      }
    } else {
      setReceivingFrom('Plant Warehouse (In-House Stock)');
    }
  };

  // Handler: When user selects a stock type in existing stock mode
  const handleSelectExistingStockType = (type: string) => {
    setStockType(type);
    setIsStockDropdownOpen(false);
    setStockSearch('');
    setErrorMessage('');

    // Do NOT auto-select size or receiving from; user selects size next
    setJobSize('');
    setReceivingFrom('');
  };

  // Handlers for Standard Stock Type (when ordering new stock)
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

  // Handlers for Print Type
  const handleSelectPrintType = (pt: string) => {
    setPrintType(pt);
    setIsPrintTypeDropdownOpen(false);
    setPrintTypeSearch('');
  };

  const handleSavePrintType = (printTypeToAdd?: string) => {
    const raw = (printTypeToAdd || newPrintTypeInput).trim();
    if (!raw) return;
    onAddNewPrintType?.(raw);
    setPrintType(raw);
    setNewPrintTypeInput('');
    setIsAddingNewPrintType(false);
    setIsPrintTypeDropdownOpen(false);
    setPrintTypeSearch('');
  };

  // Validate current single form inputs
  const validateCurrentItem = (): boolean => {
    if (!stockType.trim()) {
      setErrorMessage(isExistingStock ? 'Please select an In-House Stock Type.' : 'Please select or add a Stock Type.');
      return false;
    }
    if (!jobSize.trim()) {
      setErrorMessage(isExistingStock ? 'Please select an Available Size for this stock type.' : (activeCategory === 'Reel' ? 'Please enter the Reel Width / Size.' : 'Please enter the Board Size.'));
      return false;
    }
    if (!receivingFrom.trim()) {
      if (isExistingStock) {
        setReceivingFrom('Plant Warehouse (In-House Stock)');
      } else {
        setErrorMessage('Please select or enter Receiving From source.');
        return false;
      }
    }
    if (quantity <= 0) {
      setErrorMessage(activeCategory === 'Reel' ? 'Please enter a valid Reel Quantity in KGs.' : 'Please enter a valid Quantity.');
      return false;
    }
    if (activeCategory === 'Stock' && isPrinted) {
      if (!printType.trim()) {
        setErrorMessage('Please select or add a Print Type for printed stock.');
        return false;
      }
      if (!pressName.trim()) {
        setErrorMessage('Please select or add a Press Name for printed stock.');
        return false;
      }
    }
    return true;
  };

  // Handlers for Die Type, Die Maker, Punch Type
  const handleSaveDieMaker = () => {
    const raw = newDieMakerInput.trim();
    if (!raw) return;
    onAddNewDieMaker?.(raw);
    setDieMaker(raw);
    setNewDieMakerInput('');
    setIsAddingNewDieMaker(false);
  };

  const handleSavePunchType = () => {
    const raw = newPunchTypeInput.trim();
    if (!raw) return;
    onAddNewPunchType?.(raw);
    setPunchType(raw);
    setNewPunchTypeInput('');
    setIsAddingNewPunchType(false);
  };

  const handleSaveJobType = () => {
    const raw = newJobTypeInput.trim();
    if (!raw) return;
    onAddNewJobType?.(raw);
    setDieJobType(raw);
    setNewJobTypeInput('');
    setIsAddingNewJobType(false);
  };

  // Add current configured stock or reel to the multi-stock queue
  const handleAddCurrentStockToQueue = () => {
    if (!validateCurrentItem()) return;

    const activeJob = targetJob || (selectedJobId && selectedJobId !== 'custom' && selectedJobId !== 'without_job' ? availableJobs.find((j) => j.id === selectedJobId) : undefined);
    const nowTime = formatReceivedTimestamp();
    const isReel = activeCategory === 'Reel';

    const newEntry: StockItemEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: isReel ? 'Reel' : 'Stock',
      stockType: stockType.trim(),
      jobSize: jobSize.trim(),
      receivingFrom: receivingFrom.trim(),
      isPrinted: isReel ? false : isPrinted,
      printType: isReel ? undefined : (isPrinted ? printType.trim() : undefined),
      pressName: isReel ? undefined : (isPrinted ? pressName.trim() : undefined),
      quantity: Number(quantity),
      unit: isReel ? 'KGs' : 'Units',
      notes: notes.trim() || undefined,
      orderedAt: `${orderDate} 12:00`,
      status: isExistingStock ? 'Received' : 'Not Received',
      receivedAt: isExistingStock ? nowTime : undefined,
      isExistingStock,
      photoUrl: undefined,
      pressPhotoUrl: !isReel && isPrinted && pressPhotoUrl ? pressPhotoUrl : undefined,
      isUrgent: activeJob ? Boolean(activeJob.isUrgent) : isUrgentOrder,
      jobId: activeJob ? activeJob.id : undefined,
      jobName: activeJob ? activeJob.jobName : undefined,
    };

    setStockQueue((prev) => [...prev, newEntry]);

    // Reset fields for the next stock addition
    setStockType('');
    setNotes('');
    setPressPhotoUrl('');
    setIsExistingStock(false);
    setErrorMessage('');
  };

  // Add current configured DIE item to the queue
  const handleAddDieToQueue = () => {
    if (!dieJobName.trim()) {
      setErrorMessage('Please select or enter the Job Name for this Die order.');
      return;
    }
    if (!dieMaker.trim()) {
      setErrorMessage('Please select or add a Die Maker.');
      return;
    }
    if (!punchType.trim()) {
      setErrorMessage('Please select or add a Punch Type.');
      return;
    }

    const activeJob = targetJob || (selectedJobId && selectedJobId !== 'custom' ? availableJobs.find((j) => j.id === selectedJobId) : undefined);

    const newEntry: StockItemEntry = {
      id: `die-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category: 'Die',
      stockType: `Die: ${punchType.trim()} (${dieMaker.trim()})`,
      jobSize: punchType.trim(),
      receivingFrom: dieMaker.trim(),
      dieMaker: dieMaker.trim(),
      punchType: punchType.trim(),
      jobId: activeJob ? activeJob.id : undefined,
      jobName: dieJobName.trim(),
      jobType: dieJobType.trim(),
      isPrinted: false,
      quantity: Number(dieQuantity) || 1,
      orderedAt: `${orderDate} 12:00`,
      status: 'Not Received',
      isUrgent: activeJob ? Boolean(activeJob.isUrgent) : isUrgentOrder,
      notes: dieNotes.trim() || undefined,
      photoUrl: diePhotoUrl || undefined,
    };

    setStockQueue((prev) => [...prev, newEntry]);
    setDieNotes('');
    setDiePhotoUrl('');
    setErrorMessage('');
  };

  // Remove item from queue
  const handleRemoveQueueItem = (entryId: string) => {
    setStockQueue((prev) => prev.filter((i) => i.id !== entryId));
  };

  // Central deletion confirmation handler
  const handleConfirmDelete = () => {
    if (!deleteConfirmTarget) return;

    switch (deleteConfirmTarget.category) {
      case 'stock_item':
        handleRemoveQueueItem(deleteConfirmTarget.idOrName);
        break;
      case 'stock_type':
        if (stockType === deleteConfirmTarget.idOrName) setStockType('');
        onDeleteStockType?.(deleteConfirmTarget.idOrName);
        break;
      case 'supplier':
        if (receivingFrom === deleteConfirmTarget.idOrName) setReceivingFrom('');
        onDeleteSupplier?.(deleteConfirmTarget.idOrName);
        break;
      case 'press':
        if (pressName === deleteConfirmTarget.idOrName) setPressName('');
        onDeletePress?.(deleteConfirmTarget.idOrName);
        break;
      case 'print_type':
        if (printType === deleteConfirmTarget.idOrName) setPrintType('');
        onDeletePrintType?.(deleteConfirmTarget.idOrName);
        break;
    }

    setDeleteConfirmTarget(null);
  };

  // Submit all items in queue (or current item if queue is empty)
  const handleSubmitAll = (e: React.FormEvent) => {
    e.preventDefault();

    let allItemsToSubmit: StockItemEntry[] = [...stockQueue];

    const activeJob = targetJob || (selectedJobId && selectedJobId !== 'custom' && selectedJobId !== 'without_job' ? availableJobs.find((j) => j.id === selectedJobId) : undefined);

    // If on Stock or Reel tab and has filled in current form fields, validate and include it
    if ((activeCategory === 'Stock' || activeCategory === 'Reel') && stockType.trim()) {
      if (!validateCurrentItem()) return;
      const nowTime = formatReceivedTimestamp();
      const isReel = activeCategory === 'Reel';
      allItemsToSubmit.push({
        id: `entry-${Date.now()}`,
        category: isReel ? 'Reel' : 'Stock',
        stockType: stockType.trim(),
        jobSize: jobSize.trim(),
        receivingFrom: receivingFrom.trim(),
        isPrinted: isReel ? false : isPrinted,
        printType: isReel ? undefined : (isPrinted ? printType.trim() : undefined),
        pressName: isReel ? undefined : (isPrinted ? pressName.trim() : undefined),
        quantity: Number(quantity),
        unit: isReel ? 'KGs' : 'Units',
        notes: notes.trim() || undefined,
        orderedAt: `${orderDate} 12:00`,
        status: isExistingStock ? 'Received' : 'Not Received',
        receivedAt: isExistingStock ? nowTime : undefined,
        isExistingStock,
        photoUrl: undefined,
        pressPhotoUrl: !isReel && isPrinted && pressPhotoUrl ? pressPhotoUrl : undefined,
        isUrgent: activeJob ? Boolean(activeJob.isUrgent) : isUrgentOrder,
        jobId: activeJob ? activeJob.id : undefined,
        jobName: activeJob ? activeJob.jobName : undefined,
      });
    } else if (activeCategory === 'Die' && dieJobName.trim()) {
      allItemsToSubmit.push({
        id: `die-${Date.now()}`,
        category: 'Die',
        stockType: `Die: ${punchType.trim()} (${dieMaker.trim()})`,
        jobSize: punchType.trim(),
        receivingFrom: dieMaker.trim(),
        dieMaker: dieMaker.trim(),
        punchType: punchType.trim(),
        jobId: activeJob ? activeJob.id : undefined,
        jobName: dieJobName.trim(),
        jobType: dieJobType.trim(),
        isPrinted: false,
        quantity: Number(dieQuantity) || 1,
        orderedAt: `${orderDate} 12:00`,
        status: 'Not Received',
        isUrgent: activeJob ? Boolean(activeJob.isUrgent) : isUrgentOrder,
        notes: dieNotes.trim() || undefined,
        photoUrl: diePhotoUrl || undefined,
      });
    }

    if (allItemsToSubmit.length === 0) {
      setErrorMessage(
        activeCategory === 'Die'
          ? 'Please enter the Job Name, Die Maker, and Punch Type to order a Die.'
          : activeCategory === 'Reel'
          ? 'Please select or add at least one paper reel to order.'
          : 'Please select or add at least one stock item to order.'
      );
      return;
    }

    const isTargetJobCompleted = activeJob?.status === 'Completed';

    const payload = allItemsToSubmit.map((item) => {
      const isItemJobCompleted = Boolean(item.isUsed) || isTargetJobCompleted;
      const linkedJobId = item.jobId || (activeJob ? activeJob.id : undefined);
      const linkedJobName = item.jobName || (activeJob ? activeJob.jobName : undefined);
      const linkedJobDesc = activeJob ? (activeJob.notes || activeJob.jobType || 'Completed with Job') : 'Completed with Job';

      return {
        category: item.category || 'Stock',
        stockType: item.stockType,
        jobSize: item.jobSize,
        receivingFrom: item.receivingFrom,
        dieMaker: item.dieMaker,
        punchType: item.punchType,
        isPrinted: item.category === 'Reel' ? false : Boolean(item.isPrinted),
        printType: item.category === 'Reel' ? undefined : (item.isPrinted ? item.printType : undefined),
        pressName: item.category === 'Reel' ? undefined : item.pressName,
        quantity: item.quantity,
        unit: item.unit || (item.category === 'Reel' ? 'KGs' : 'Units'),
        jobId: linkedJobId,
        jobName: linkedJobName,
        jobType: item.jobType,
        notes: item.notes,
        orderedAt: item.orderedAt || `${orderDate} 12:00`,
        status: isItemJobCompleted ? 'Used' : (item.status || 'Not Received'),
        receivedAt: item.receivedAt,
        isExistingStock: Boolean(item.isExistingStock),
        isUrgent: item.isUrgent !== undefined ? item.isUrgent : (activeJob ? Boolean(activeJob.isUrgent) : isUrgentOrder),
        photoUrl: item.category === 'Die' ? (item.photoUrl || undefined) : undefined,
        pressPhotoUrl: item.pressPhotoUrl || undefined,
        isUsed: isItemJobCompleted,
        usedAt: isItemJobCompleted ? (activeJob?.completedAt || formatReceivedTimestamp()) : item.usedAt,
        usedJobId: isItemJobCompleted ? linkedJobId : item.usedJobId,
        usedJobName: isItemJobCompleted ? linkedJobName : item.usedJobName,
        usedJobDescription: isItemJobCompleted ? linkedJobDesc : item.usedJobDescription,
      };
    });

    onSaveInventoryOrders(payload as any);

    // Reset everything
    setStockQueue([]);
    setStockType('');
    setNotes('');
    setPressPhotoUrl('');
    setIsExistingStock(false);
    setDieNotes('');
    setDiePhotoUrl('');
    setErrorMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header (Clean, no extra description) */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">
              {targetJob ? `Order Inventory: ${targetJob.jobName}` : 'Order Inventory'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Switcher Tabs: 1. Paper / Board Stock, 2. Die Tooling, 3. Paper Reel */}
        <div className="px-6 pt-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('Stock');
                setErrorMessage('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeCategory === 'Stock'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1. Board Stock</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('Die');
                setErrorMessage('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeCategory === 'Die'
                  ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>2. Die Tooling</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('Reel');
                setErrorMessage('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeCategory === 'Reel'
                  ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>3. Paper Reel (in KGs)</span>
            </button>
          </div>

          {/* Urgent Priority Order Toggle */}
          <button
            type="button"
            onClick={() => setIsUrgentOrder(!isUrgentOrder)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              isUrgentOrder
                ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-slate-700'
            }`}
            title="Mark this entire order as Urgent"
          >
            <Flame className={`w-3.5 h-3.5 ${isUrgentOrder ? 'text-rose-400 fill-rose-400' : 'text-slate-500'}`} />
            <span>{isUrgentOrder ? '🔥 Order is Urgent' : 'Mark as Urgent'}</span>
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
          
          {/* ORDER DATE */}
          <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Order Date:</span>
            </label>
            <input
              type="date"
              required
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white [color-scheme:dark] focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* MULTIPLE STOCK & DIE QUEUE SUMMARY (shows when items are added) */}
          {stockQueue.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <PackagePlus className="w-4 h-4" />
                  <span>Items Added to this Order Queue ({stockQueue.length})</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Total Items: {stockQueue.length}
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
                        {item.category === 'Die' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Die Tool
                          </span>
                        ) : item.category === 'Reel' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold flex items-center gap-1">
                            <Disc className="w-3 h-3 text-sky-400" />
                            Paper Reel
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                            {item.isPrinted
                              ? `Printed (${[item.printType, item.pressName].filter(Boolean).join(' • ') || 'Press'})`
                              : 'Non-Printed'}
                          </span>
                        )}
                        {item.isUrgent && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                            URGENT
                          </span>
                        )}
                        {item.isExistingStock && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                            Existing Stock
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                          item.status === 'Received' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {item.status || 'Not Received'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {item.category === 'Die'
                          ? `Job: ${item.jobName || 'Unassigned'} · Maker: ${item.dieMaker || 'N/A'} · Punch: ${item.punchType || 'N/A'} · Qty: ${item.quantity || 1}`
                          : item.category === 'Reel'
                          ? `Reel Width: ${item.jobSize || 'Standard'} · Mill: ${item.receivingFrom || 'Warehouse'} · Weight: ${Number(item.quantity || 0).toLocaleString()} KGs`
                          : `Board Size: ${item.jobSize || 'Standard'} · From: ${item.receivingFrom || 'Warehouse'} · Qty: ${Number(item.quantity || 0).toLocaleString()} Units`}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmTarget({
                          category: 'stock_item',
                          idOrName: item.id,
                          label: `${item.stockType} (${item.quantity} units)`,
                        })
                      }
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                      title="Remove this item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: DIE TOOLING ORDER FORM */}
          {/* ========================================================= */}
          {activeCategory === 'Die' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-purple-400 uppercase font-mono tracking-wide flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Die Details</span>
                </span>
              </div>

              {/* Job Association & Auto-Fill Details */}
              <div className="space-y-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                {targetJob ? (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Job for Die Order:</span>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {targetJob.jobName || 'Selected Job'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Auto-filled for Job
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      Select Existing Job (Auto-fills Details)
                    </label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => handleSelectExistingJob(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="">-- Select Existing Job --</option>
                      {safeJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.jobName || 'Unnamed'} ({j.jobType || 'General'})
                        </option>
                      ))}
                      <option value="custom">+ Custom / New Job Name</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Job Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={dieJobName}
                    onChange={(e) => setDieJobName(e.target.value)}
                    placeholder="Job Name..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-200">
                      Job Type <span className="text-amber-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewJobType(!isAddingNewJobType)}
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                    >
                      {isAddingNewJobType ? 'Select from list' : '+ Add Job Type'}
                    </button>
                  </div>

                  {isAddingNewJobType ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newJobTypeInput}
                        onChange={(e) => setNewJobTypeInput(e.target.value)}
                        placeholder="Type custom Job Type..."
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveJobType();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveJobType}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={dieJobType}
                      onChange={(e) => setDieJobType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      {safeJobTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      {dieJobType && !safeJobTypes.includes(dieJobType) && (
                        <option value={dieJobType}>{dieJobType}</option>
                      )}
                    </select>
                  )}
                </div>
              </div>

              {/* 3. Die Maker (Adding and Selection) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Die Maker <span className="text-amber-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewDieMaker(!isAddingNewDieMaker)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isAddingNewDieMaker ? 'Select from list' : '+ Add New Die Maker'}</span>
                  </button>
                </div>

                {isAddingNewDieMaker && (
                  <div className="p-3 bg-slate-950 border border-purple-500/40 rounded-xl space-y-2 mb-2">
                    <span className="text-[11px] text-purple-300 font-medium">Type custom Die Maker vendor name:</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDieMakerInput}
                        onChange={(e) => setNewDieMakerInput(e.target.value)}
                        placeholder="e.g. Apex Laser Dies, Modern Tooling..."
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveDieMaker();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveDieMaker}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Add & Select
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={dieMaker}
                  onChange={(e) => setDieMaker(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {safeDieMakers.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  {dieMaker && !safeDieMakers.includes(dieMaker) && (
                    <option value={dieMaker}>{dieMaker}</option>
                  )}
                </select>
              </div>

              {/* 4. Punch Type (Adding and Selection) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Punch Type <span className="text-amber-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewPunchType(!isAddingNewPunchType)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isAddingNewPunchType ? 'Select from list' : '+ Add New Punch Type'}</span>
                  </button>
                </div>

                {isAddingNewPunchType && (
                  <div className="p-3 bg-slate-950 border border-purple-500/40 rounded-xl space-y-2 mb-2">
                    <span className="text-[11px] text-purple-300 font-medium">Type custom Punch Type:</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPunchTypeInput}
                        onChange={(e) => setNewPunchTypeInput(e.target.value)}
                        placeholder="e.g. Rotary Die Punch, Flatbed Stripping..."
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSavePunchType();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSavePunchType}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Add & Select
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={punchType}
                  onChange={(e) => setPunchType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {safePunchTypes.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  {punchType && !safePunchTypes.includes(punchType) && (
                    <option value={punchType}>{punchType}</option>
                  )}
                </select>
              </div>

              {/* Quantity & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Quantity (Dies)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={dieQuantity}
                    onChange={(e) => setDieQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Die Tool Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={dieNotes}
                    onChange={(e) => setDieNotes(e.target.value)}
                    placeholder="e.g. 23.8 mm rule height, serrated cut..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Optional Die Tool Photo Upload with Drag and Drop */}
              <PhotoDropzone
                value={diePhotoUrl}
                onChange={(url) => setDiePhotoUrl(url)}
                onClear={() => setDiePhotoUrl('')}
                label="Die Tool Photo / Proof (Optional)"
                placeholder="Drag & drop die photo or layout drawing or click to browse"
                accentColor="purple"
              />

              {/* Add to Queue Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddDieToQueue}
                  className="w-full py-2.5 px-4 bg-purple-950/60 hover:bg-purple-900/60 active:bg-purple-900 text-purple-300 border border-purple-800/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <PackagePlus className="w-4 h-4 text-purple-400" />
                  <span>+ Add Die Order to Queue</span>
                </button>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: RAW PAPER / BOARD STOCK OR PAPER REEL FORM */}
          {/* ========================================================= */}
          {(activeCategory === 'Stock' || activeCategory === 'Reel') && (
            <div className="space-y-4 animate-in fade-in duration-150">

              {/* Section Divider: Configure Stock / Reel Item */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase font-mono tracking-wide flex items-center gap-1.5">
                  {activeCategory === 'Reel' ? (
                    <>
                      <Disc className="w-3.5 h-3.5 text-sky-400" />
                      <span>{stockQueue.length > 0 ? '+ Configure Additional Paper Reel' : 'Paper Reel Details (Measured in KGs)'}</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>{stockQueue.length > 0 ? '+ Configure Additional Stock Item' : 'Board Stock Details'}</span>
                    </>
                  )}
                </span>
              </div>

              {/* Job Assignment: Attach to Job OR Order without Job (Buffer Stock) */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                {targetJob ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Ordering for Job:</span>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {targetJob.jobName || 'Selected Job'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Attached to Job
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-200">
                        Job Allocation / Assignment
                      </label>
                      <span className="text-[10px] font-mono text-sky-400 font-semibold">
                        {!selectedJobId || selectedJobId === 'without_job'
                          ? '📦 "Inventory without Jobs"'
                          : '🔗 Attached to Job'}
                      </span>
                    </div>

                    <select
                      value={selectedJobId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedJobId(val);
                        if (!val || val === 'without_job') {
                          setDieJobName('');
                        } else if (val === 'custom') {
                          // custom
                        } else {
                          const found = safeJobs.find((j) => j && j.id === val);
                          if (found) {
                            setDieJobName(found.jobName || '');
                            if (found.jobSize || found.boardSize) {
                              setJobSize(found.jobSize || found.boardSize || '');
                            }
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="">📦 Order without Job (Goes to &quot;Inventory without Jobs&quot;)</option>
                      {safeJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          🔗 {j.jobName || 'Unnamed'} ({j.jobType || 'General'})
                        </option>
                      ))}
                    </select>

                    {(!selectedJobId || selectedJobId === 'without_job') && (
                      <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>
                          Ordered without attaching to a job. This item will appear in <strong>&quot;Inventory without Jobs&quot;</strong>, where you can later mark it as Used for any Job Name and Job Type.
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Option: Use Existing Stock for Job */}
              <div className={`p-3 rounded-xl border transition-all ${
                isExistingStock 
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm shadow-emerald-500/10' 
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isExistingStock
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}>
                      {activeCategory === 'Reel' ? <Disc className="w-4 h-4 text-sky-400" /> : <Layers className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{activeCategory === 'Reel' ? 'Use Existing Warehouse Reel for Job' : 'Use Existing Stock for Job'}</span>
                        {isExistingStock && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            In-House / Received
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {isExistingStock 
                          ? 'Item will be fulfilled from plant in-house stock and immediately marked as Received with current timestamp.' 
                          : 'Check this option if using existing warehouse inventory rather than ordering new supplier stock.'}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isExistingStock}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsExistingStock(checked);
                        setErrorMessage('');
                        if (checked) {
                          // Clear so user can select stock type first
                          setStockType('');
                          setJobSize('');
                          setReceivingFrom('');
                        } else {
                          // Revert to new order standard defaults
                          setStockType(safeStockTypes[0] || '');
                          setJobSize(targetJob?.jobSize || targetJob?.boardSize || '1200 x 850 mm');
                          setReceivingFrom(safeSuppliers[0] || 'Varun Board');
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* 1. STOCK TYPE */}
              {isExistingStock ? (
                /* EXISTING STOCK MODE: Select Stock Type from warehouse stock */
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-200">
                      Select Stock Type <span className="text-emerald-400">*</span>
                    </label>
                  </div>

                  {inStockStockTypes.length > 0 ? (
                    <select
                      value={stockType}
                      onChange={(e) => handleSelectExistingStockType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-emerald-500/50 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer font-medium"
                    >
                      <option value="">-- Select Stock Type --</option>
                      {inStockStockTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                      <p className="text-amber-400 font-semibold">No stock types found in warehouse.</p>
                      <p className="text-[11px] text-slate-500">
                        Uncheck "Use Existing Stock for Job" above to order new stock from suppliers.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* NEW ORDER MODE: Search, Select, and Type/Save Stock Type */
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
                      <span>{isAddingNewStockType ? 'Select from list' : '+ Add Stock Type'}</span>
                    </button>
                  </div>

                  {isAddingNewStockType && (
                    <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2 mb-2">
                      <span className="text-[11px] text-amber-400 font-medium">New Stock Type:</span>
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
                                    setDeleteConfirmTarget({
                                      category: 'stock_type',
                                      idOrName: type,
                                      label: type,
                                    });
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
              )}

              {/* 2. BOARD SIZE (Select from available sizes, NOT typed, when using existing stock) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    {isExistingStock ? 'Available Board Size' : 'Board Size'} <span className={isExistingStock ? 'text-emerald-400' : 'text-amber-400'}>*</span>
                  </label>
                  {isExistingStock && (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-semibold bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/60">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Select Size (No typing)</span>
                    </span>
                  )}
                </div>

                {isExistingStock ? (
                  !stockType ? (
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Please select a Stock Type above first to choose an available size.</span>
                    </div>
                  ) : availableSizesForSelectedStockType.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={jobSize}
                        onChange={(e) => handleSelectExistingSize(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 font-mono font-bold focus:outline-none focus:border-emerald-400 cursor-pointer"
                      >
                        <option value="">-- Select Available Size --</option>
                        {availableSizesForSelectedStockType.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>

                      {/* Selectable size buttons (No typing) */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {availableSizesForSelectedStockType.map((size) => {
                          const isSelected = (jobSize || '').trim() === size.trim();
                          return (
                            <button
                              type="button"
                              key={size}
                              onClick={() => handleSelectExistingSize(size)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-white'
                              }`}
                            >
                              <span>{size}</span>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-950 border border-amber-900/40 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>No recorded board sizes for "{stockType}" in warehouse.</span>
                    </div>
                  )
                ) : (
                  /* Standard New Order Board Size Input */
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
                )}
              </div>

              {/* 3. RECEIVING FROM (Auto-filled as size is selected when using existing stock) */}
              {isExistingStock ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Receiving From <span className="text-emerald-400">*</span>
                  </label>
                  <div className={`p-3.5 bg-slate-950 border rounded-xl flex items-center justify-between gap-3 ${
                    receivingFrom ? 'border-emerald-500/40' : 'border-slate-800'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        receivingFrom
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-900 border border-slate-800 text-slate-500'
                      }`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
                          Receiving Source:
                        </span>
                        <div className="text-xs font-bold text-white truncate mt-0.5">
                          {receivingFrom || (jobSize ? 'Plant Warehouse (In-House Stock)' : 'Will auto-fill once size is selected')}
                        </div>
                      </div>
                    </div>
                    {receivingFrom && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-700/60 font-semibold flex items-center gap-1.5 shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Auto-filled</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Standard New Order Supplier Selection */
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
                      <span>{isAddingNewSupplier ? 'Select existing' : '+ Add Supplier'}</span>
                    </button>
                  </div>

                  {isAddingNewSupplier && (
                    <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2 mb-2">
                      <span className="text-[11px] text-amber-400 font-medium">New Supplier:</span>
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
                                    setDeleteConfirmTarget({
                                      category: 'supplier',
                                      idOrName: supp,
                                      label: supp,
                                    });
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
              )}

          {/* 4. PRINTED OR NON-PRINTED & 5. PRESS NAME - ONLY FOR BOARD STOCK (REEL IS RAW PAPER, NOT PRINTED) */}
          {activeCategory === 'Stock' && (
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

              {/* 5. PRINT TYPE & PRESS NAME with Search and Save as requested */}
              {isPrinted && (
                <div className="pt-2 space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    {/* OPTION: PRINT TYPE (SEARCH & SAVE AS REQUESTED) */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-amber-300">
                          Print Type <span className="text-amber-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewPrintType(!isAddingNewPrintType);
                            setIsPrintTypeDropdownOpen(false);
                          }}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isAddingNewPrintType ? 'Select existing' : '+ Add Print Type'}</span>
                        </button>
                      </div>

                      {isAddingNewPrintType && (
                        <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-xl space-y-2 mb-2">
                          <span className="text-[11px] text-amber-400 font-medium">New Print Type:</span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newPrintTypeInput}
                              onChange={(e) => setNewPrintTypeInput(e.target.value)}
                              placeholder="e.g. Offset, Flexo, Screen, UV, Digital..."
                              autoFocus
                              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSavePrintType();
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSavePrintType()}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            >
                              Save & Select
                            </button>
                          </div>
                        </div>
                      )}

                      <div
                        onClick={() => setIsPrintTypeDropdownOpen(!isPrintTypeDropdownOpen)}
                        className={`w-full px-3.5 py-2.5 bg-slate-900 border rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isPrintTypeDropdownOpen ? 'border-amber-400' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Tag className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className={printType ? 'text-white font-medium' : 'text-slate-500'}>
                            {printType || 'Search and select print type...'}
                          </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isPrintTypeDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      {isPrintTypeDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-2">
                          <div className="relative mb-2">
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={printTypeSearch}
                              onChange={(e) => setPrintTypeSearch(e.target.value)}
                              placeholder="Search print types..."
                              autoFocus
                              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="max-h-40 overflow-y-auto space-y-1">
                            <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 mb-1">
                              <span>Saved Print Types ({filteredPrintTypes.length})</span>
                              {printTypeSearch && <span>Filter: "{printTypeSearch}"</span>}
                            </div>

                            {filteredPrintTypes.length > 0 ? (
                              filteredPrintTypes.map((pt) => (
                                <div
                                  key={pt}
                                  className={`px-3 py-1.5 text-xs rounded-lg flex items-center justify-between cursor-pointer transition-colors group ${
                                    printType === pt
                                      ? 'bg-amber-500/10 text-amber-300 font-semibold'
                                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                  }`}
                                >
                                  <div
                                    onClick={() => handleSelectPrintType(pt)}
                                    className="flex-1 flex items-center gap-2 truncate"
                                  >
                                    <span className="truncate">{pt}</span>
                                    {printType === pt && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                  </div>

                                  {onDeletePrintType && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmTarget({
                                          category: 'print_type',
                                          idOrName: pt,
                                          label: pt,
                                        });
                                      }}
                                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 rounded transition-colors opacity-70 group-hover:opacity-100 ml-2"
                                      title={`Delete saved print type "${pt}"`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-400">
                                <span>No saved print types match "{printTypeSearch}".</span>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  Type above and click "+ Add Print Type" to save.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PRESS NAME */}
                    <div className="relative">
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
                          <span>{isAddingNewPress ? 'Select existing' : '+ Add Press'}</span>
                        </button>
                      </div>

                      {isAddingNewPress && (
                        <div className="p-3 bg-slate-900 border border-amber-500/40 rounded-xl space-y-2 mb-2">
                          <span className="text-[11px] text-amber-400 font-medium">New Press Name:</span>
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
                                        setDeleteConfirmTarget({
                                          category: 'press',
                                          idOrName: p,
                                          label: p,
                                        });
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
                  </div>

                  {/* Press Run Proof / Plate Photo Upload with Drag and Drop */}
                  <div className="pt-2">
                    <PhotoDropzone
                      value={pressPhotoUrl}
                      onChange={(url) => setPressPhotoUrl(url)}
                      onClear={() => setPressPhotoUrl('')}
                      label="Press Proof / Artwork Photo (Optional)"
                      placeholder="Drag & drop press proof or artwork photo or click to browse"
                      accentColor="amber"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. QUANTITY (measurement unit is KGs for Reel, Units for Board Stock) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                {activeCategory === 'Reel' ? 'Reel Weight / Quantity (KGs)' : 'Stock Quantity'}{' '}
                <span className="text-amber-400">*</span>
              </label>
              {activeCategory === 'Reel' && (
                <span className="text-[10px] font-mono text-sky-400 bg-sky-950/70 border border-sky-800/60 px-2 py-0.5 rounded font-bold">
                  Weight in KGs (Kilograms)
                </span>
              )}
            </div>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder={activeCategory === 'Reel' ? 'Enter reel weight in KGs (e.g. 1500)...' : 'Enter stock quantity...'}
                className="w-full pl-9 pr-14 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
              {activeCategory === 'Reel' && (
                <span className="absolute right-3.5 top-2 text-xs font-mono font-bold text-sky-400">
                  KGs
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {activeCategory === 'Reel' ? 'Paper Reel Notes (Optional)' : 'Stock Notes (Optional)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={activeCategory === 'Reel' ? 'e.g. Reel #12, core diameter 76mm, moisture < 7%...' : 'e.g. Moisture rating < 8%, top liner bundle #4...'}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* OPTION FOR ADDING MULTIPLE STOCK / REELS FOR JOBS */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddCurrentStockToQueue}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border ${
                activeCategory === 'Reel'
                  ? 'bg-sky-950/60 hover:bg-sky-900/60 active:bg-sky-900 text-sky-300 border-sky-800/80'
                  : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-amber-300 border-amber-500/30'
              }`}
            >
              <PackagePlus className="w-4 h-4" />
              <span>{activeCategory === 'Reel' ? '+ Add Another Paper Reel to Queue' : '+ Add Another Stock Item for this Job'}</span>
            </button>
          </div>

        </div>
      )}

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

      {/* CONFIRMATION MODAL FOR DELETING ANY ITEM */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {deleteConfirmTarget.category === 'stock_item' && 'Remove Stock Item?'}
                  {deleteConfirmTarget.category === 'stock_type' && 'Delete Stock Type?'}
                  {deleteConfirmTarget.category === 'supplier' && 'Delete Supplier?'}
                  {deleteConfirmTarget.category === 'press' && 'Delete Press Machine?'}
                </h3>
                <p className="text-xs text-slate-400">
                  {deleteConfirmTarget.category === 'stock_item' 
                    ? 'Removes item from current order draft' 
                    : 'Permanently removes from saved list'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to {deleteConfirmTarget.category === 'stock_item' ? 'remove' : 'delete'} <strong>"{deleteConfirmTarget.label}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                {deleteConfirmTarget.category === 'stock_item' ? 'Remove Item' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
