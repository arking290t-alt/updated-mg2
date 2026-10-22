import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  Edit3,
  Trash2,
  Download,
  Printer,
  Eye,
  Copy,
  Check,
  X,
  AlertCircle,
  Building2,
  MapPin,
  ChevronRight,
  Layers,
  Sparkles,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { Quotation, QuotationItem, DEFAULT_QUOTATION_NOTES } from '../types/quotation';
import {
  LETTERHEAD_HEADER_DATA_URL,
  LETTERHEAD_FOOTER_DATA_URL,
} from '../assets/letterheadAssets';
import {
  subscribeToQuotations,
  addQuotationToFirestore,
  updateQuotationInFirestore,
  deleteQuotationFromFirestore,
} from '../firebase/db';

function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  // If already formatted like DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD -> DD.MM.YYYY
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
  } catch {}
  return dateStr;
}

function formatMonthLabel(monthKey: string): string {
  // YYYY-MM -> Month Name YYYY (e.g. "October 2026")
  try {
    const [year, month] = monthKey.split('-');
    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return monthKey;
  }
}

export const QuotationView: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Modal / Form state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  // Form fields
  const [customerName, setCustomerName] = useState('kids world');
  const [cityState, setCityState] = useState('CHENNAI');
  const [quotationDate, setQuotationDate] = useState(getTodayIsoDate());
  const [refNo, setRefNo] = useState('');
  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: 'item-1',
      particular: 'BABY WASHCLOTH 6 PACK 250 GSM',
      quantity: '10000 Nos',
      rate: 'Rs. 3.00',
    },
    {
      id: 'item-2',
      particular: 'BABY WASHCLOTH 8 PACK 250 GSM',
      quantity: '10000 Nos',
      rate: 'Rs. 3.00',
    },
  ]);
  const [notes, setNotes] = useState<string[]>([...DEFAULT_QUOTATION_NOTES]);
  const [itemsPerPage, setItemsPerPage] = useState<number>(6); // Items that fit comfortably on page 1

  // Preview Modal state
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const letterheadRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time Quotations from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToQuotations((list) => {
      setQuotations(list);
    });
    return () => unsubscribe();
  }, []);

  // Compute available months for filter
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    quotations.forEach((q) => {
      if (q.date) {
        const monthKey = q.date.slice(0, 7); // YYYY-MM
        if (monthKey && monthKey.length === 7) {
          monthsSet.add(monthKey);
        }
      }
    });
    // Ensure current month is available
    monthsSet.add(getTodayIsoDate().slice(0, 7));
    return Array.from(monthsSet).sort().reverse();
  }, [quotations]);

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      // Month filter
      if (selectedMonth !== 'all') {
        const qMonth = (q.date || '').slice(0, 7);
        if (qMonth !== selectedMonth) return false;
      }

      // Search query filter (matches customer, city, ref, or particular items)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesCustomer = (q.customerName || '').toLowerCase().includes(query);
        const matchesCity = (q.cityState || '').toLowerCase().includes(query);
        const matchesRef = (q.refNo || '').toLowerCase().includes(query);
        const matchesParticular = (q.items || []).some((item) =>
          (item.particular || '').toLowerCase().includes(query)
        );
        if (!matchesCustomer && !matchesCity && !matchesRef && !matchesParticular) {
          return false;
        }
      }

      return true;
    });
  }, [quotations, selectedMonth, searchQuery]);

  // Open editor for a new quotation
  const handleOpenNew = () => {
    setEditingQuotationId(null);
    setCustomerName('');
    setCityState('CHENNAI');
    setQuotationDate(getTodayIsoDate());
    setRefNo('');
    setItems([
      {
        id: `item-${Date.now()}-1`,
        particular: '',
        quantity: '10000 Nos',
        rate: 'Rs. ',
      },
    ]);
    setNotes([...DEFAULT_QUOTATION_NOTES]);
    setFormError('');
    setIsEditorOpen(true);
  };

  // Open editor for an existing quotation
  const handleOpenEdit = (q: Quotation) => {
    setEditingQuotationId(q.id);
    setCustomerName(q.customerName || '');
    setCityState(q.cityState || '');
    setQuotationDate(q.date || getTodayIsoDate());
    setRefNo(q.refNo || '');
    setItems(
      q.items && q.items.length > 0
        ? q.items.map((it) => ({ ...it }))
        : [
            {
              id: `item-${Date.now()}-1`,
              particular: '',
              quantity: '',
              rate: '',
            },
          ]
    );
    setNotes(q.notes && q.notes.length > 0 ? [...q.notes] : [...DEFAULT_QUOTATION_NOTES]);
    setFormError('');
    setIsEditorOpen(true);
  };

  // Item management in form
  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        particular: '',
        quantity: '',
        rate: '',
      },
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof QuotationItem, val: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setItems([{ id: `item-${Date.now()}`, particular: '', quantity: '', rate: '' }]);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Notes management in form
  const handleAddNoteRow = () => {
    setNotes((prev) => [...prev, '']);
  };

  const handleUpdateNote = (idx: number, val: string) => {
    setNotes((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleRemoveNote = (idx: number) => {
    setNotes((prev) => prev.filter((_, i) => i !== idx));
  };

  // Save Quotation
  const handleSaveQuotation = async (andPreview = false) => {
    if (!customerName.trim()) {
      setFormError('Please enter Customer / First Name (e.g. kids world).');
      return;
    }
    if (!cityState.trim()) {
      setFormError('Please enter State / City (e.g. CHENNAI).');
      return;
    }

    const cleanItems = items
      .filter((it) => it.particular.trim() || it.quantity.trim() || it.rate.trim())
      .map((it, idx) => ({
        id: it.id || `item-${Date.now()}-${idx}`,
        particular: it.particular.trim(),
        quantity: it.quantity.trim(),
        rate: it.rate.trim(),
      }));

    if (cleanItems.length === 0) {
      setFormError('Please add at least one item / particular.');
      return;
    }

    const cleanNotes = notes.map((n) => n.trim()).filter(Boolean);

    try {
      if (editingQuotationId) {
        // Update existing
        const updates: Partial<Quotation> = {
          customerName: customerName.trim(),
          cityState: cityState.trim(),
          date: quotationDate,
          refNo: refNo.trim(),
          items: cleanItems,
          notes: cleanNotes,
        };
        await updateQuotationInFirestore(editingQuotationId, updates);
        const updatedQuote: Quotation = {
          id: editingQuotationId,
          createdAt:
            quotations.find((q) => q.id === editingQuotationId)?.createdAt ||
            new Date().toISOString(),
          ...updates,
        } as Quotation;
        setIsEditorOpen(false);
        if (andPreview) {
          setPreviewQuotation(updatedQuote);
        }
      } else {
        // Create new
        const newQuote: Quotation = {
          id: `quot-${Date.now()}`,
          customerName: customerName.trim(),
          cityState: cityState.trim(),
          date: quotationDate,
          refNo: refNo.trim(),
          items: cleanItems,
          notes: cleanNotes,
          createdAt: new Date().toISOString(),
        };
        await addQuotationToFirestore(newQuote);
        setIsEditorOpen(false);
        if (andPreview) {
          setPreviewQuotation(newQuote);
        }
      }
    } catch (err: any) {
      setFormError(`Failed to save: ${err.message || 'Unknown error'}`);
    }
  };

  // Delete Quotation
  const handleDeleteQuotation = async (id: string) => {
    try {
      await deleteQuotationFromFirestore(id);
      setDeleteConfirmId(null);
      if (previewQuotation?.id === id) {
        setPreviewQuotation(null);
      }
    } catch (err: any) {
      alert(`Failed to delete quotation: ${err.message}`);
    }
  };

  // Download high-resolution A4 PNG using html2canvas
  const handleDownloadQuotationPng = async (quotation: Quotation, pageIdx = 0) => {
    let el = document.getElementById(`letterhead-page-${quotation.id}-${pageIdx}`);
    
    // If not currently in DOM (e.g. clicked directly from cards list), open preview first then capture
    if (!el) {
      setPreviewQuotation(quotation);
      setIsCapturing(true);
      setTimeout(() => {
        handleDownloadQuotationPng(quotation, pageIdx);
      }, 350);
      return;
    }

    setIsCapturing(true);
    try {
      // Small pause to ensure all base64 images and layouts are fully painted
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(el, {
        scale: 2, // 794 x 2 = 1588px, 1123 x 2 = 2246px (High-res A4 standard)
        width: 794,
        height: 1123,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: false, // Not needed for embedded base64 data URLs
        allowTaint: false, // Prevents security errors on canvas.toBlob / toDataURL
      });

      const totalPages = Math.ceil((quotation.items?.length || 1) / itemsPerPage);
      const pageSuffix = totalPages > 1 ? `-Page${pageIdx + 1}` : '';
      const cleanCustomer = quotation.customerName.replace(/[^a-zA-Z0-9]/g, '_') || 'Quote';
      const filename = `Quotation-A4-${cleanCustomer}-${formatDisplayDate(quotation.date)}${pageSuffix}.png`;

      // Preferred Blob download with fallback
      canvas.toBlob((blob) => {
        if (!blob) {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = filename;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          setTimeout(() => document.body.removeChild(link), 100);
          setDownloadSuccessMessage(`Downloaded A4: ${filename}`);
          setTimeout(() => setDownloadSuccessMessage(null), 3500);
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 1500);

        setDownloadSuccessMessage(`Downloaded A4: ${filename}`);
        setTimeout(() => setDownloadSuccessMessage(null), 3500);
      }, 'image/png');
    } catch (e: any) {
      console.error('Screenshot capture error:', e);
      alert(`Download failed: ${e?.message || 'Please use Print / PDF option to save as A4.'}`);
    } finally {
      setIsCapturing(false);
    }
  };

  // Copy A4 screenshot to clipboard
  const handleCopyQuotationPng = async (quotation: Quotation, pageIdx = 0) => {
    let el = document.getElementById(`letterhead-page-${quotation.id}-${pageIdx}`);
    if (!el) {
      setPreviewQuotation(quotation);
      return;
    }

    setIsCapturing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));

      const canvas = await html2canvas(el, {
        scale: 2,
        width: 794,
        height: 1123,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: false,
        allowTaint: false,
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2500);
          } catch (clipErr) {
            console.warn('Clipboard write warning:', clipErr);
          }
        }
      }, 'image/png');
    } catch (e) {
      console.warn('Copy capture error:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  // Print quotation
  const handlePrint = () => {
    window.print();
  };

  // Split quotation items into pages if there are more than itemsPerPage
  const getPagesForQuotation = (quotation: Quotation) => {
    const quoteItems = quotation.items || [];
    if (quoteItems.length <= itemsPerPage) {
      return [{ pageNumber: 1, totalPages: 1, items: quoteItems, isFinalPage: true }];
    }

    const pages: {
      pageNumber: number;
      totalPages: number;
      items: QuotationItem[];
      isFinalPage: boolean;
    }[] = [];

    const totalPages = Math.ceil(quoteItems.length / itemsPerPage);
    for (let p = 0; p < totalPages; p++) {
      const start = p * itemsPerPage;
      const end = start + itemsPerPage;
      pages.push({
        pageNumber: p + 1,
        totalPages,
        items: quoteItems.slice(start, end),
        isFinalPage: p === totalPages - 1,
      });
    }
    return pages;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Quotation Billing</span>
                <span className="text-xs font-mono font-normal text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  Manoj Graphics
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate, edit, search and print customer quotations formatted on Manoj Graphics official letterhead
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: New Quotation */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotation by customer name, city, ref, or particulars..."
            className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-medium text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs font-mono text-slate-400 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl">
            {filteredQuotations.length} {filteredQuotations.length === 1 ? 'quote' : 'quotes'}
          </div>
        </div>
      </div>

      {/* QUOTATIONS LIST / CARDS */}
      {filteredQuotations.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Quotations Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || selectedMonth !== 'all'
                ? 'No saved quotations match your search or month filter.'
                : 'No quotations saved yet. Click "New Quotation" above to create your first official Manoj Graphics quote.'}
            </p>
          </div>
          {(searchQuery || selectedMonth !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedMonth('all');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotations.map((quote) => (
            <div
              key={quote.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-sm hover:shadow-md"
            >
              {/* Card Header: Customer & Date */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      To: Customer
                    </span>
                    <h3 className="text-base font-extrabold text-rose-400 tracking-tight">
                      {quote.customerName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 mt-0.5">
                      <MapPin className="w-3 h-3 text-sky-400" />
                      <span>{quote.cityState.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-200 block">
                      {formatDisplayDate(quote.date)}
                    </span>
                    {quote.refNo && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Ref: {quote.refNo}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items Summary */}
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Particulars ({quote.items?.length || 0})</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {quote.items?.[0]?.rate ? quote.items[0].rate : 'Quoted'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {(quote.items || []).slice(0, 2).map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="text-xs text-slate-200 flex items-center justify-between gap-2"
                      >
                        <span className="truncate font-medium">{item.particular || '—'}</span>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          {item.quantity}
                        </span>
                      </div>
                    ))}
                    {(quote.items || []).length > 2 && (
                      <div className="text-[10px] text-amber-400 font-mono pt-0.5">
                        + {(quote.items || []).length - 2} more item(s)...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Actions Toolbar */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewQuotation(quote)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="View formatted Manoj Graphics letterhead quotation"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Letterhead</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(quote)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edit quotation"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadQuotationPng(quote, 0)}
                    disabled={isCapturing}
                    className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    title="Download A4 Quotation PNG"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(quote.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Delete quotation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT QUOTATION */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingQuotationId ? 'Edit Quotation' : 'Create New Quotation'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Fill client details, item table and editable terms for official Manoj Graphics letterhead
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Customer Name, City/State, Date, Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    First Name / Customer <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kids world"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Printed in red on letterhead</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    City / State <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CHENNAI"
                    value={cityState}
                    onChange={(e) => setCityState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold uppercase"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">e.g. CHENNAI</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Date <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={quotationDate}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-mono">
                    Prints as {formatDisplayDate(quotationDate)}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Ref No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MG/QT/2026/01"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Optional reference tag</span>
                </div>
              </div>

              {/* Row 2: ITEMS / PARTICULARS TABLE */}
              <div className="space-y-2.5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div>
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Item Particulars & Rates ({items.length})</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Enter item name/description, quantity and rate as shown in the letterhead sample
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Row</span>
                  </button>
                </div>

                {/* Items Inputs */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-mono uppercase text-slate-500 px-1">
                    <div className="col-span-6">PARTICULAR / ITEM NAME</div>
                    <div className="col-span-3">QUANTITY</div>
                    <div className="col-span-2">RATE</div>
                    <div className="col-span-1 text-center">DEL</div>
                  </div>

                  {items.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          placeholder="e.g. BABY WASHCLOTH 6 PACK 250 GSM"
                          value={item.particular}
                          onChange={(e) => handleUpdateItem(item.id, 'particular', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 uppercase font-medium"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          required
                          placeholder="e.g. 10000 Nos"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-center font-mono font-medium"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rs. 3.00"
                          value={item.rate}
                          onChange={(e) => handleUpdateItem(item.id, 'rate', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 text-center font-mono font-bold text-amber-300"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Page Fitting Info */}
                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Items count: <strong className="text-white">{items.length}</strong>
                    {items.length <= itemsPerPage ? (
                      <span className="text-emerald-400 ml-2">✓ Fits comfortably on 1 Page</span>
                    ) : (
                      <span className="text-amber-400 ml-2">
                        ℹ Spans across {Math.ceil(items.length / itemsPerPage)} Pages automatically
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span>Items per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-800 text-white rounded px-1.5 py-0.5 text-xs font-mono"
                    >
                      <option value={5}>5 items</option>
                      <option value={6}>6 items (standard)</option>
                      <option value={7}>7 items</option>
                      <option value={8}>8 items</option>
                      <option value={10}>10 items</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: EDITABLE "PLEASE NOTE" DETAILS */}
              <div className="space-y-2.5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div>
                    <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                      <span>Please Note Terms (Editable Terms & Conditions)</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      These bullet points appear at the bottom of the quotation as requested. You can edit each point freely.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNotes([...DEFAULT_QUOTATION_NOTES])}
                      className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white rounded-lg hover:bg-slate-850 transition-colors cursor-pointer"
                      title="Reset to default terms from photo"
                    >
                      Reset Defaults
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNoteRow}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-amber-400" />
                      <span>Add Term</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {notes.map((noteText, nIdx) => (
                    <div key={nIdx} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${nIdx === 0 ? 'bg-rose-500' : 'bg-sky-400'}`} />
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => handleUpdateNote(nIdx, e.target.value)}
                        placeholder="Type quotation note / condition..."
                        className={`flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-amber-500 font-medium ${
                          nIdx === 0 ? 'text-rose-300 font-bold' : 'text-slate-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNote(nIdx)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Remove term"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-xs text-slate-500 italic p-2">No notes added. Click "Reset Defaults" or "Add Term".</p>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveQuotation(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Save Quotation
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuotation(true)}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4 stroke-[2.5]" />
                  <span>Save & Preview Letterhead</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: LETTERHEAD PREVIEW & DOWNLOAD / PRINT */}
      {previewQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl max-h-[96vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Preview Toolbar */}
            <div className="px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Quotation Letterhead Preview
                </h3>
                <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded font-semibold">
                  {previewQuotation.customerName} · {previewQuotation.cityState}
                </span>
              </div>

              {/* Toolbar Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(previewQuotation)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Edit details"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit Quote</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyQuotationPng(previewQuotation)}
                  disabled={isCapturing}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy screenshot to clipboard"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span>Copy Image</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print or Save as A4 PDF document"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print / Save PDF (A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadQuotationPng(previewQuotation, 0)}
                  disabled={isCapturing}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                  title="Download Quotation as A4 image (1588x2246 PNG)"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{isCapturing ? 'Generating A4...' : 'Download A4 PNG'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewQuotation(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Success Toast Notification */}
            {downloadSuccessMessage && (
              <div className="bg-emerald-950/90 border-b border-emerald-800/80 px-5 py-2 text-xs font-semibold text-emerald-300 flex items-center justify-between animate-in fade-in">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{downloadSuccessMessage}</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80">Standard A4 Size (1588 × 2246 px)</span>
              </div>
            )}

            {/* Preview Sheet Viewport (Rendered strictly as standard A4: 794px x 1123px) */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-slate-950/90 flex flex-col items-center gap-6 quotation-print-area">
              <style>{`
                @page {
                  size: A4 portrait;
                  margin: 0;
                }
                @media print {
                  html, body {
                    width: 210mm !important;
                    height: 297mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  body * {
                    visibility: hidden !important;
                  }
                  .quotation-print-area, .quotation-print-area * {
                    visibility: visible !important;
                  }
                  .quotation-print-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 210mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                  }
                  .letterhead-print-page {
                    width: 210mm !important;
                    height: 297mm !important;
                    min-height: 297mm !important;
                    max-height: 297mm !important;
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0 !important;
                    padding: 7mm !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    box-sizing: border-box !important;
                  }
                }
              `}</style>
              
              {getPagesForQuotation(previewQuotation).map((page, pageIdx) => (
                <div key={page.pageNumber} className="flex flex-col items-center gap-2">
                  {page.totalPages > 1 && (
                    <div className="flex items-center justify-between w-[794px] px-2 text-xs text-slate-400">
                      <span className="font-mono">Page {page.pageNumber} of {page.totalPages}</span>
                      <button
                        type="button"
                        onClick={() => handleDownloadQuotationPng(previewQuotation, pageIdx)}
                        disabled={isCapturing}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Page {page.pageNumber} (A4 PNG)</span>
                      </button>
                    </div>
                  )}

                  {/* Standard A4 Paper Sheet: 794px width x 1123px height */}
                  <div
                    id={`letterhead-page-${previewQuotation.id}-${pageIdx}`}
                    className="bg-white text-slate-900 shadow-2xl relative p-5 sm:p-6 letterhead-print-page shrink-0"
                    style={{
                      width: '794px',
                      minWidth: '794px',
                      maxWidth: '794px',
                      height: '1123px',
                      minHeight: '1123px',
                      maxHeight: '1123px',
                      boxSizing: 'border-box',
                      fontFamily: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                    }}
                  >
                    {/* INNER FRAMED BOX: Continuous side lines, top line and bottom line */}
                    <div
                      className="w-full h-full border-[1.5px] border-black bg-white flex flex-col justify-between relative overflow-hidden"
                      style={{
                        height: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* TOP HEADER: Manoj Graphics Logo, GST, Office & Factory with paint splatter */}
                      <div className="w-full border-b-[1.5px] border-black bg-white shrink-0">
                        <img
                          src={LETTERHEAD_HEADER_DATA_URL}
                          alt="Manoj Graphics Letterhead Banner"
                          className="w-full block select-none pointer-events-none"
                          style={{ width: '100%', height: 'auto' }}
                        />
                      </div>

                    {/* CONTENT BODY: Ref, To, Customer, City, Date, Particulars Table */}
                    <div className="px-6 sm:px-10 py-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Ref & Date Row */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs sm:text-sm font-extrabold text-[#002060]">
                              Ref. {previewQuotation.refNo || ''}
                            </div>
                            <div className="text-xs sm:text-sm font-extrabold text-[#002060] mt-1">To,</div>
                            {/* Customer Name in Bold Red */}
                            <div className="text-base sm:text-xl font-black text-[#dc2626] tracking-tight uppercase leading-snug mt-0.5">
                              {previewQuotation.customerName}
                            </div>
                            {/* City / State in Bold Navy */}
                            <div className="text-xs sm:text-sm font-black text-[#002060] tracking-wider uppercase mt-0.5">
                              {previewQuotation.cityState}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs sm:text-sm font-black text-[#002060]">
                              Date. {formatDisplayDate(previewQuotation.date)}
                            </div>
                            {page.totalPages > 1 && (
                              <div className="text-[11px] font-mono font-bold text-[#002060] mt-1">
                                Page {page.pageNumber} of {page.totalPages}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Enclosed Text & QUOTATION Title */}
                        <div className="text-center my-6">
                          <div className="text-xs sm:text-sm font-semibold text-[#002060]">
                            Please find enclosed here with
                          </div>
                          <div
                            className="text-xl sm:text-2xl font-black text-[#002060] tracking-widest mt-1 uppercase"
                            style={{ letterSpacing: '4px' }}
                          >
                            QUOTATION
                          </div>
                        </div>

                        {/* PARTICULARS TABLE */}
                        <table
                          className="w-full border-collapse border-[1.5px] border-black"
                          style={{ borderColor: '#000000' }}
                        >
                          <thead>
                            <tr className="border-b-[1.5px] border-black">
                              <th className="py-2.5 px-4 text-center font-black text-xs sm:text-sm text-[#002060] tracking-wider border-r-[1.5px] border-black uppercase">
                                PARTICULAR
                              </th>
                              <th className="py-2.5 px-3 text-center font-black text-xs sm:text-sm text-[#002060] tracking-wider border-r-[1.5px] border-black w-36 sm:w-44 uppercase">
                                QUANTITY
                              </th>
                              <th className="py-2.5 px-3 text-center font-black text-xs sm:text-sm text-[#002060] tracking-wider w-28 sm:w-36 uppercase">
                                RATE
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {page.items.map((it, itIdx) => (
                              <tr
                                key={it.id || itIdx}
                                className="border-b-[1.5px] border-black"
                                style={{ minHeight: '44px' }}
                              >
                                <td className="py-2.5 px-4 font-bold text-xs sm:text-sm text-[#002060] uppercase border-r-[1.5px] border-black">
                                  {it.particular}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-xs sm:text-sm text-[#002060] text-center uppercase border-r-[1.5px] border-black">
                                  {it.quantity}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-xs sm:text-sm text-[#002060] text-center uppercase">
                                  {it.rate}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Spacer ensuring tall pages look properly balanced */}
                      <div className="flex-1 min-h-[30px]" />
                    </div>

                    {/* BOTTOM SECTION: Please Note on left, and Uncut Splatter along the bottom */}
                    <div className="relative w-full mt-auto select-none shrink-0">
                      {/* Full-width bottom splatter image - UNCUT */}
                      <img
                        src={LETTERHEAD_FOOTER_DATA_URL}
                        alt="Manoj Graphics Footer Splatter"
                        className="w-full block pointer-events-none select-none"
                        style={{ width: '100%', height: 'auto' }}
                      />

                      {/* Please Note terms positioned over the clean white left area */}
                      {page.isFinalPage && previewQuotation.notes && previewQuotation.notes.length > 0 && (
                        <div
                          className="absolute bottom-3 left-6 sm:left-8 right-[44%] pointer-events-none select-none"
                          style={{ zIndex: 10 }}
                        >
                          <div className="text-xs sm:text-sm font-black text-[#002060] mb-1">
                            Please Note
                          </div>
                          <div className="space-y-0.5">
                            {previewQuotation.notes.map((noteText, idx) => (
                              <div
                                key={idx}
                                className={`text-[10px] sm:text-[11px] leading-tight font-bold flex items-start gap-1.5 ${
                                  idx === 0 ? 'text-[#dc2626]' : 'text-[#002060]'
                                }`}
                              >
                                <span className="select-none font-black">•</span>
                                <span>{noteText}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
              ))}

            </div>

            {/* Modal Footer Note */}
            <div className="px-6 py-2.5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 shrink-0">
              <span className="text-emerald-400 font-medium">✓ Letterhead layout verified with Manoj Graphics branding</span>
              <span>Click "Download PNG" to export image or "Print / PDF" to print clean A4 copy</span>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Delete Quotation?</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete this quotation? This action will remove it from Firestore.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteQuotation(deleteConfirmId)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
