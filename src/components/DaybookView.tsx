import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  subscribeToDaybookPurposes,
  addDaybookPurposeToFirestore,
  deleteDaybookPurposeFromFirestore,
} from '../firebase/db';
import { toPng, toBlob } from 'html-to-image';
import {
  BookOpen,
  Wallet,
  ArrowRightLeft,
  Plus,
  Trash2,
  Edit3,
  Camera,
  Eye,
  EyeOff,
  Calendar,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  AlertCircle,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  PieChart,
  Tag,
  Filter,
  Download,
  Search,
  Bookmark,
  Copy,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

export interface DaybookAccount {
  id: string;
  name: string;
  balance: number;
}

export interface DaybookEntry {
  id: string;
  name?: string;
  purpose?: string;
  description?: string;
  amount: number;
  accountName: string;
  type: 'Dr' | 'Cr';
  date: string;
  note?: string;
  transferGroup?: string | null;
  transferPair?: string;
}

export interface DeletedDaybookEntry {
  id?: string;
  name?: string;
  purpose?: string;
  description?: string;
  amount: number;
  accountName?: string;
  type: 'Dr' | 'Cr';
  date: string;
  note?: string;
  transferGroup?: string | null;
  transferPair?: string;
  deletedAt?: string;
}

export interface EditedDaybookEntry {
  id?: string;
  name?: string;
  purpose?: string;
  description?: string;
  before: number;
  after: number;
  date: string;
  accountName?: string;
  editedAt?: string;
}

const PASSWORD = 'BNPRATHAM@8056079200';
const BALANCE_PIN = '816400';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const DaybookView: React.FC = () => {
  const [accounts, setAccounts] = useState<DaybookAccount[]>([]);
  const [entries, setEntries] = useState<DaybookEntry[]>([]);
  const [deletedEntries, setDeletedEntries] = useState<DeletedDaybookEntry[]>([]);
  const [editedEntries, setEditedEntries] = useState<EditedDaybookEntry[]>([]);

  // Navigation / View modes
  const [viewMode, setViewMode] = useState<'entries' | 'deleted' | 'edited'>('entries');
  const [filterDate, setFilterDate] = useState<string>(getTodayString());
  const [balancesVisible, setBalancesVisible] = useState<boolean>(false);

  // Form: Add Account
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountAmount, setNewAccountAmount] = useState('');

  // Form: Add Entry
  const [entryMode, setEntryMode] = useState<'normal' | 'transfer'>('normal');
  const [entryName, setEntryName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [savedPurposes, setSavedPurposes] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState<string>(getTodayString());
  const [selectedAccount, setSelectedAccount] = useState('');
  const [entryType, setEntryType] = useState<'Dr' | 'Cr'>('Dr');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturingSS, setIsCapturingSS] = useState(false);

  // DATA Modal State (beside date selection at the top)
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [dataSelectedMonth, setDataSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [dataViewFilter, setDataViewFilter] = useState<'month' | 'all'>('month');
  const [dataSearchQuery, setDataSearchQuery] = useState('');

  // Modal Dialogs (PIN / Password / Prompts)
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    isPassword?: boolean;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });
  const [promptInputValue, setPromptInputValue] = useState('');
  const [promptError, setPromptError] = useState('');

  // Searchable Purpose State
  const [isPurposeDropdownOpen, setIsPurposeDropdownOpen] = useState(false);
  const purposeDropdownRef = useRef<HTMLDivElement>(null);

  // Filter saved purposes based on typed purpose input
  const filteredPurposes = useMemo(() => {
    if (!purpose.trim()) return savedPurposes;
    return savedPurposes.filter((p) =>
      p.toLowerCase().includes(purpose.trim().toLowerCase())
    );
  }, [savedPurposes, purpose]);

  // Click outside listener for purpose dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (purposeDropdownRef.current && !purposeDropdownRef.current.contains(e.target as Node)) {
        setIsPurposeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Screenshot Preview Modal State
  const [ssTheme, setSsTheme] = useState<'light' | 'dark'>('light');
  const [screenshotPreview, setScreenshotPreview] = useState<{
    url: string;
    blob: Blob | null;
    date: string;
    theme: 'light' | 'dark';
  } | null>(null);
  const [isCopiedToClipboard, setIsCopiedToClipboard] = useState(false);
  const [ssErrorMessage, setSsErrorMessage] = useState<string | null>(null);

  // Offscreen container ref for html2canvas
  const screenshotContainerRef = useRef<HTMLDivElement>(null);

  // Firebase Real-time listeners
  useEffect(() => {
    const accountsCol = collection(db, 'accounts');
    const unsubAccounts = onSnapshot(accountsCol, (snap) => {
      const list: DaybookAccount[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || '',
          balance: Number(data.balance) || 0,
        });
      });
      setAccounts(list);
    });

    const entriesCol = collection(db, 'entries');
    const unsubEntries = onSnapshot(entriesCol, (snap) => {
      const list: DaybookEntry[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || '',
          purpose: data.purpose || '',
          description: data.description || '',
          amount: Number(data.amount) || 0,
          accountName: data.accountName || '',
          type: data.type === 'Cr' ? 'Cr' : 'Dr',
          date: data.date || '',
          note: data.note || '',
          transferGroup: data.transferGroup || null,
          transferPair: data.transferPair || undefined,
        });
      });
      setEntries(list);
    });

    const unsubPurposes = subscribeToDaybookPurposes((list) => {
      setSavedPurposes(list);
    });

    const deletedCol = collection(db, 'deletedEntries');
    const unsubDeleted = onSnapshot(deletedCol, (snap) => {
      const list: DeletedDaybookEntry[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as DeletedDaybookEntry);
      });
      setDeletedEntries(list);
    });

    const editedCol = collection(db, 'editedEntries');
    const unsubEdited = onSnapshot(editedCol, (snap) => {
      const list: EditedDaybookEntry[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as EditedDaybookEntry);
      });
      setEditedEntries(list);
    });

    return () => {
      unsubAccounts();
      unsubEntries();
      unsubPurposes();
      unsubDeleted();
      unsubEdited();
    };
  }, []);

  // Set default account selections when accounts list updates
  useEffect(() => {
    if (accounts.length > 0) {
      if (!selectedAccount || !accounts.some((a) => a.name === selectedAccount)) {
        setSelectedAccount(accounts[0].name);
      }
      if (!fromAccount || !accounts.some((a) => a.name === fromAccount)) {
        setFromAccount(accounts[0].name);
      }
      if (!toAccount || !accounts.some((a) => a.name === toAccount)) {
        setToAccount(accounts[1]?.name || accounts[0].name);
      }
    }
  }, [accounts]);

  // Historical balance calculations
  const getHistoricalBalanceForAccount = (accName: string, targetDate: string): number => {
    const acc = accounts.find((a) => a.name === accName);
    if (!acc) return 0;
    let bal = Number(acc.balance) || 0;
    entries.forEach((e) => {
      if (e.accountName === accName && e.date > targetDate) {
        if (e.type === 'Dr') bal += Number(e.amount); // undo debit
        if (e.type === 'Cr') bal -= Number(e.amount); // undo credit
      }
    });
    return bal;
  };

  const totalHistoricalClosingBalance = useMemo(() => {
    return accounts.reduce((sum, a) => {
      return sum + getHistoricalBalanceForAccount(a.name, filterDate);
    }, 0);
  }, [accounts, entries, filterDate]);

  const netChangeOnFilterDate = useMemo(() => {
    let net = 0;
    entries.forEach((e) => {
      if (e.date === filterDate) {
        if (e.type === 'Cr') net += Number(e.amount);
        if (e.type === 'Dr') net -= Number(e.amount);
      }
    });
    return net;
  }, [entries, filterDate]);

  const openingBalance = totalHistoricalClosingBalance - netChangeOnFilterDate;
  const closingBalance = totalHistoricalClosingBalance;

  // Filtered day entries
  const currentDayEntries = useMemo(() => {
    return entries.filter((e) => e.date === filterDate);
  }, [entries, filterDate]);

  const currentDayDeleted = useMemo(() => {
    return deletedEntries.filter((d) => d.date === filterDate);
  }, [deletedEntries, filterDate]);

  const currentDayEdited = useMemo(() => {
    return editedEntries.filter((e) => e.date === filterDate);
  }, [editedEntries, filterDate]);

  const dayTotals = useMemo(() => {
    let totalDr = 0;
    let totalCr = 0;
    currentDayEntries.forEach((e) => {
      if (e.type === 'Dr') totalDr += Number(e.amount || 0);
      if (e.type === 'Cr') totalCr += Number(e.amount || 0);
    });
    return { totalDr, totalCr };
  }, [currentDayEntries]);

  // Exclude automated stock, paper reel, and die tooling records from the DATA view
  const isStockOrDieEntry = (e: DaybookEntry) => {
    const p = (e.purpose || '').toLowerCase().trim();
    const n = (e.name || '').toLowerCase().trim();
    const d = (e.description || '').toLowerCase().trim();
    const not = (e.note || '').toLowerCase().trim();
    const combined = `${p} ${n} ${d} ${not}`;
    const keywords = ['stock', 'die', 'dies', 'reel', 'paper reel', 'kraft', 'fluting', 'inventory'];
    return keywords.some((k) => combined.includes(k));
  };

  // Purpose-wise financial data aggregation for the DATA option
  const purposeWiseData = useMemo(() => {
    const nonStockEntries = entries.filter((e) => {
      // Exclude stock or die or inventory entries
      if (isStockOrDieEntry(e)) return false;

      // Filter by selected month if month filter active
      if (dataViewFilter === 'month' && dataSelectedMonth) {
        const entryMonth = (e.date || '').slice(0, 7);
        if (entryMonth !== dataSelectedMonth) return false;
      }
      return true;
    });

    // Group by purpose
    const map = new Map<string, { purpose: string; totalDr: number; totalCr: number; count: number }>();

    nonStockEntries.forEach((e) => {
      const p = (e.purpose || '').trim() || 'General / Unspecified';
      const existing = map.get(p) || { purpose: p, totalDr: 0, totalCr: 0, count: 0 };
      if (e.type === 'Dr') {
        existing.totalDr += Number(e.amount) || 0;
      } else {
        existing.totalCr += Number(e.amount) || 0;
      }
      existing.count += 1;
      map.set(p, existing);
    });

    const allRows = Array.from(map.values());

    // Filter by search query if any
    const filteredRows = dataSearchQuery.trim()
      ? allRows.filter((r) => r.purpose.toLowerCase().includes(dataSearchQuery.trim().toLowerCase()))
      : allRows;

    // Sort descending by highest activity (totalDr + totalCr)
    filteredRows.sort((a, b) => (b.totalDr + b.totalCr) - (a.totalDr + a.totalCr));

    const totalDr = filteredRows.reduce((sum, r) => sum + r.totalDr, 0);
    const totalCr = filteredRows.reduce((sum, r) => sum + r.totalCr, 0);
    const netTotal = totalCr - totalDr;
    const totalTransactions = filteredRows.reduce((sum, r) => sum + r.count, 0);

    return {
      rows: filteredRows,
      totalDr,
      totalCr,
      netTotal,
      totalTransactions,
      totalPurposes: filteredRows.length,
    };
  }, [entries, dataViewFilter, dataSelectedMonth, dataSearchQuery]);

  // Update real account balance in Firestore
  const updateAccountBalanceInDb = async (
    accName: string,
    actionType: 'Dr' | 'Cr',
    actionAmount: number
  ) => {
    const acc = accounts.find((a) => a.name === accName);
    if (!acc) return;
    const current = Number(acc.balance) || 0;
    const change = Number(actionAmount) || 0;
    const finalBal = actionType === 'Dr' ? current - change : current + change;
    await updateDoc(doc(db, 'accounts', acc.id), { balance: finalBal });
  };

  // Open sleek prompt modal
  const openPrompt = (options: {
    title: string;
    description: string;
    isPassword?: boolean;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (val: string) => void;
  }) => {
    setPromptInputValue(options.defaultValue || '');
    setPromptError('');
    setPromptModal({
      isOpen: true,
      title: options.title,
      description: options.description,
      isPassword: options.isPassword,
      placeholder: options.placeholder,
      defaultValue: options.defaultValue,
      onConfirm: options.onConfirm,
    });
  };

  const closePrompt = () => {
    setPromptModal((prev) => ({ ...prev, isOpen: false }));
    setPromptInputValue('');
    setPromptError('');
  };

  // Balance Toggle with PIN check
  const handleToggleBalance = () => {
    if (!balancesVisible) {
      openPrompt({
        title: 'Security PIN Required',
        description: 'Enter your 6-digit Daybook security PIN to reveal balances:',
        isPassword: true,
        placeholder: 'Enter 6-digit PIN',
        onConfirm: (val) => {
          if (val === BALANCE_PIN) {
            setBalancesVisible(true);
            closePrompt();
          } else {
            setPromptError('Incorrect PIN entered. Access denied.');
          }
        },
      });
    } else {
      setBalancesVisible(false);
    }
  };

  // Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newAccountName.trim();
    const amt = Number(newAccountAmount);
    if (!name) {
      setFormError('Please enter an account name.');
      return;
    }
    if (isNaN(amt)) {
      setFormError('Please enter a valid opening balance amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');
      await addDoc(collection(db, 'accounts'), {
        name,
        balance: amt,
      });
      setNewAccountName('');
      setNewAccountAmount('');
    } catch (err: any) {
      setFormError(err.message || 'Error creating account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Account Balance
  const handleEditAccount = (acc: DaybookAccount) => {
    openPrompt({
      title: 'Administrator Password Required',
      description: `Enter administrator master password to edit account balance for "${acc.name}":`,
      isPassword: true,
      placeholder: 'Enter Master Password',
      onConfirm: (pass) => {
        if (pass !== PASSWORD) {
          setPromptError('Wrong Password. Access denied.');
          return;
        }
        closePrompt();

        // Second step: Prompt for new balance
        setTimeout(() => {
          openPrompt({
            title: `Update Balance: ${acc.name}`,
            description: `Current balance is ${acc.balance}. Enter new balance amount:`,
            placeholder: 'New Balance Amount',
            defaultValue: String(acc.balance),
            onConfirm: async (newBalStr) => {
              const newBal = Number(newBalStr);
              if (isNaN(newBal)) {
                setPromptError('Invalid amount entered.');
                return;
              }
              await updateDoc(doc(db, 'accounts', acc.id), { balance: newBal });
              closePrompt();
            },
          });
        }, 150);
      },
    });
  };

  // Delete Account
  const handleDeleteAccount = (acc: DaybookAccount) => {
    openPrompt({
      title: 'Delete Account Confirmation',
      description: `Enter administrator password to delete account "${acc.name}":`,
      isPassword: true,
      placeholder: 'Enter Master Password',
      onConfirm: async (pass) => {
        if (pass !== PASSWORD) {
          setPromptError('Wrong Password. Action aborted.');
          return;
        }
        if (confirm(`Are you sure you want to permanently delete account "${acc.name}"?`)) {
          await deleteDoc(doc(db, 'accounts', acc.id));
          closePrompt();
        }
      },
    });
  };

  // Add Entry
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      if (entryMode === 'normal') {
        if (!selectedAccount) {
          setFormError('Please select an account.');
          setIsSubmitting(false);
          return;
        }

        await addDoc(collection(db, 'entries'), {
          name: entryName.trim(),
          purpose: purpose.trim(),
          description: entryDescription.trim(),
          amount: amt,
          accountName: selectedAccount,
          type: entryType,
          date: entryDate,
          note: note.trim(),
          transferGroup: null,
          createdAt: new Date().toISOString(),
        });

        // Automatically save purpose to saved list if non-empty
        if (purpose.trim()) {
          addDaybookPurposeToFirestore(purpose.trim());
        }

        await updateAccountBalanceInDb(selectedAccount, entryType, amt);
      } else {
        // Inter Account Transfer
        if (!fromAccount || !toAccount) {
          setFormError('Please select both From and To accounts.');
          setIsSubmitting(false);
          return;
        }
        if (fromAccount === toAccount) {
          setFormError('Source and Destination accounts cannot be the same.');
          setIsSubmitting(false);
          return;
        }

        const groupId = Date.now().toString();

        await addDoc(collection(db, 'entries'), {
          name: entryName.trim(),
          purpose: `Transfer to ${toAccount}`,
          description: entryDescription.trim(),
          amount: amt,
          accountName: fromAccount,
          type: 'Dr',
          date: entryDate,
          note: note.trim(),
          transferGroup: groupId,
          transferPair: toAccount,
          createdAt: new Date().toISOString(),
        });

        await addDoc(collection(db, 'entries'), {
          name: entryName.trim(),
          purpose: `Transfer from ${fromAccount}`,
          description: entryDescription.trim(),
          amount: amt,
          accountName: toAccount,
          type: 'Cr',
          date: entryDate,
          note: note.trim(),
          transferGroup: groupId,
          transferPair: fromAccount,
          createdAt: new Date().toISOString(),
        });

        await updateAccountBalanceInDb(fromAccount, 'Dr', amt);
        await updateAccountBalanceInDb(toAccount, 'Cr', amt);
      }

      // Reset entry inputs
      setEntryName('');
      setPurpose('');
      setEntryDescription('');
      setAmount('');
      setNote('');
    } catch (err: any) {
      setFormError(err.message || 'Error adding entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCurrentPurpose = async () => {
    const trimmed = purpose.trim();
    if (!trimmed) {
      setFormError('Please type a purpose name first.');
      return;
    }
    await addDaybookPurposeToFirestore(trimmed);
    setFormError('');
  };

  const handleDeleteSavedPurpose = async (pToDelete: string) => {
    await deleteDaybookPurposeFromFirestore(pToDelete);
    if (purpose.toLowerCase() === pToDelete.toLowerCase()) {
      setPurpose('');
    }
  };

  // Delete Entry
  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Warning: Are you sure you want to delete this daybook entry?')) return;

    try {
      const ref = doc(db, 'entries', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();

      if (data.transferGroup) {
        // Find partner leg
        const partnerEntries = entries.filter(
          (e) => e.transferGroup === data.transferGroup && e.id !== id
        );

        // Archive current
        await addDoc(collection(db, 'deletedEntries'), {
          ...data,
          deletedAt: new Date().toISOString(),
        });

        // Reverse balance
        const reverseType = data.type === 'Dr' ? 'Cr' : 'Dr';
        await updateAccountBalanceInDb(data.accountName, reverseType, data.amount);
        await deleteDoc(ref);

        // Archive & reverse partner leg
        for (const partner of partnerEntries) {
          await addDoc(collection(db, 'deletedEntries'), {
            name: partner.name || '',
            purpose: partner.purpose || '',
            amount: partner.amount,
            accountName: partner.accountName,
            type: partner.type,
            date: partner.date,
            note: partner.note || '',
            transferGroup: partner.transferGroup,
            transferPair: partner.transferPair,
            deletedAt: new Date().toISOString(),
          });

          const partnerReverseType = partner.type === 'Dr' ? 'Cr' : 'Dr';
          await updateAccountBalanceInDb(
            partner.accountName,
            partnerReverseType,
            partner.amount
          );
          await deleteDoc(doc(db, 'entries', partner.id));
        }
      } else {
        await addDoc(collection(db, 'deletedEntries'), {
          ...data,
          deletedAt: new Date().toISOString(),
        });

        const reverseType = data.type === 'Dr' ? 'Cr' : 'Dr';
        await updateAccountBalanceInDb(data.accountName, reverseType, data.amount);
        await deleteDoc(ref);
      }
    } catch (err: any) {
      alert(`Error deleting entry: ${err.message}`);
    }
  };

  // Edit Entry Amount
  const handleEditEntry = (entry: DaybookEntry) => {
    openPrompt({
      title: 'Edit Entry Amount',
      description: `Edit recorded transaction amount for "${entry.name || entry.purpose || 'Entry'}":`,
      placeholder: 'New Amount',
      defaultValue: String(entry.amount),
      onConfirm: async (val) => {
        const newAmt = Number(val);
        if (isNaN(newAmt) || newAmt <= 0) {
          setPromptError('Please enter a valid positive number.');
          return;
        }

        try {
          // Reverse old amount
          await updateAccountBalanceInDb(
            entry.accountName,
            entry.type === 'Dr' ? 'Cr' : 'Dr',
            entry.amount
          );
          // Apply new amount
          await updateAccountBalanceInDb(entry.accountName, entry.type, newAmt);

          // Log in editedEntries
          await addDoc(collection(db, 'editedEntries'), {
            name: entry.name || '',
            before: entry.amount,
            after: newAmt,
            date: entry.date,
            accountName: entry.accountName,
            editedAt: new Date().toISOString(),
          });

          // Update entry doc
          await updateDoc(doc(db, 'entries', entry.id), { amount: newAmt });
          closePrompt();
        } catch (err: any) {
          setPromptError(`Failed to update: ${err.message}`);
        }
      },
    });
  };

  // Screenshot Capture using html-to-image with robust offscreen wrapper & crisp rendering
  const handleCaptureSS = async (themeToUse: 'light' | 'dark' = ssTheme) => {
    setIsCapturingSS(true);
    setSsErrorMessage(null);
    let wrapper: HTMLDivElement | null = null;
    try {
      const hide = !balancesVisible;
      const isDark = themeToUse === 'dark';

      // Construct clean offscreen wrapper attached outside the viewport
      // The wrapper is placed offscreen at -10000px so user sees NO flicker/glitch.
      wrapper = document.createElement('div');
      wrapper.style.cssText = 'position: fixed; left: -10000px; top: 0; width: 920px; z-index: -9999; pointer-events: none; overflow: visible;';

      // Inner report container has position: relative, left: 0, and FULL opacity (opacity: 1)
      // This is crucial: toPng captures the node with its computed styles.
      // Setting opacity: 1 ensures zero black/transparent output!
      const reportDiv = document.createElement('div');
      reportDiv.id = 'daybook-capture-sheet';
      reportDiv.style.cssText = `
        position: relative;
        left: 0;
        top: 0;
        width: 920px;
        opacity: 1;
        background: ${isDark ? '#0f172a' : '#ffffff'};
        color: ${isDark ? '#f8fafc' : '#0f172a'};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        padding: 36px 40px;
        box-sizing: border-box;
        border-radius: 8px;
      `;

      reportDiv.innerHTML = isDark
        ? `
        <!-- DARK THEME REPORT -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 16px; margin-bottom: 22px;">
          <div>
            <div style="font-size: 24px; font-weight: 800; color: #f59e0b; letter-spacing: 0.5px;">OFFICE DAYBOOK</div>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 3px;">Corrugation Plant Financial Record · Manoj Graphics</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Statement Date</div>
            <div style="font-size: 18px; font-weight: 800; font-family: monospace; color: #ffffff;">${filterDate}</div>
          </div>
        </div>

        <!-- 4 KPI SUMMARY CARDS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px;">
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Opening Balance</div>
            <div style="font-size: 17px; font-weight: 800; font-family: monospace; color: #38bdf8; margin-top: 4px;">
              ${hide ? '********' : '₹' + openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style="background: #450a0a; border: 1px solid #7f1d1d; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #fca5a5; text-transform: uppercase;">Total Debit (Dr)</div>
            <div style="font-size: 17px; font-weight: 800; font-family: monospace; color: #f87171; margin-top: 4px;">
              ₹${dayTotals.totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style="background: #064e3b; border: 1px solid #065f46; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #86efac; text-transform: uppercase;">Total Credit (Cr)</div>
            <div style="font-size: 17px; font-weight: 800; font-family: monospace; color: #4ade80; margin-top: 4px;">
              ₹${dayTotals.totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Closing Balance</div>
            <div style="font-size: 17px; font-weight: 800; font-family: monospace; color: #34d399; margin-top: 4px;">
              ${hide ? '********' : '₹' + closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <!-- ACCOUNT BALANCES -->
        <div style="font-size: 13px; font-weight: 700; color: #f59e0b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Account Balances</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px;">
          <thead>
            <tr style="background: #1e293b; color: #cbd5e1;">
              <th style="padding: 8px 12px; border: 1px solid #334155; text-align: left; font-weight: 700;">Account Name</th>
              <th style="padding: 8px 12px; border: 1px solid #334155; text-align: right; font-weight: 700;">Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            ${accounts.map((a, idx) => {
              const bal = getHistoricalBalanceForAccount(a.name, filterDate);
              const bg = idx % 2 === 0 ? '#0f172a' : '#182235';
              return `<tr style="background: ${bg};">
                <td style="padding: 8px 12px; border: 1px solid #334155; font-weight: 600; color: #f8fafc;">${a.name}</td>
                <td style="padding: 8px 12px; border: 1px solid #334155; text-align: right; font-family: monospace; font-weight: 700; color: ${bal >= 0 ? '#34d399' : '#f87171'};">
                  ${hide ? '********' : (bal < 0 ? '-' : '') + '₹' + Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>

        <!-- TRANSACTIONS TABLE -->
        <div style="font-size: 13px; font-weight: 700; color: #f59e0b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Transactions for ${filterDate} (${currentDayEntries.length})
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #1e293b; color: #cbd5e1;">
              <th style="padding: 8px 10px; border: 1px solid #334155; text-align: left; font-weight: 700;">Name</th>
              <th style="padding: 8px 10px; border: 1px solid #334155; text-align: left; font-weight: 700;">Purpose</th>
              <th style="padding: 8px 10px; border: 1px solid #334155; text-align: left; font-weight: 700;">Account</th>
              <th style="padding: 8px 10px; border: 1px solid #334155; text-align: right; font-weight: 700; color: #f87171;">Debit (Dr)</th>
              <th style="padding: 8px 10px; border: 1px solid #334155; text-align: right; font-weight: 700; color: #4ade80;">Credit (Cr)</th>
              <th style="padding: 8px 10px; border: 1px solid #334155; text-align: left; font-weight: 700;">Note</th>
            </tr>
          </thead>
          <tbody>
            ${currentDayEntries.map((e, idx) => {
              const bg = idx % 2 === 0 ? '#0f172a' : '#182235';
              return `
              <tr style="background: ${bg};">
                <td style="padding: 8px 10px; border: 1px solid #334155; color: #f8fafc; font-weight: 600;">${e.name || '—'}</td>
                <td style="padding: 8px 10px; border: 1px solid #334155; color: #cbd5e1;">${e.purpose || '—'}</td>
                <td style="padding: 8px 10px; border: 1px solid #334155; color: #94a3b8; font-family: monospace;">${e.accountName || '—'}</td>
                <td style="padding: 8px 10px; border: 1px solid #334155; text-align: right; font-family: monospace; font-weight: 700; color: #f87171;">
                  ${e.type === 'Dr' ? '₹' + Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                </td>
                <td style="padding: 8px 10px; border: 1px solid #334155; text-align: right; font-family: monospace; font-weight: 700; color: #4ade80;">
                  ${e.type === 'Cr' ? '₹' + Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                </td>
                <td style="padding: 8px 10px; border: 1px solid #334155; color: #64748b; font-size: 11px;">${e.note || ''}</td>
              </tr>
            `}).join('')}
            ${currentDayEntries.length === 0 ? `
              <tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b; border: 1px solid #334155; font-style: italic;">No transactions recorded for this date</td></tr>
            ` : ''}
          </tbody>
          ${currentDayEntries.length > 0 ? `
          <tfoot>
            <tr style="background: #1e293b; font-weight: 800; border-top: 2px solid #334155;">
              <td colspan="3" style="padding: 9px 10px; border: 1px solid #334155; text-align: left; text-transform: uppercase; color: #f59e0b;">Total Day Transactions</td>
              <td style="padding: 9px 10px; border: 1px solid #334155; text-align: right; font-family: monospace; color: #f87171; font-size: 13px;">
                ₹${dayTotals.totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td style="padding: 9px 10px; border: 1px solid #334155; text-align: right; font-family: monospace; color: #4ade80; font-size: 13px;">
                ₹${dayTotals.totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td style="padding: 9px 10px; border: 1px solid #334155;"></td>
            </tr>
          </tfoot>
          ` : ''}
        </table>

        <div style="margin-top: 22px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155; padding-top: 12px;">
          <span>Generated by Corrugation Plant Daybook · Manoj Graphics</span>
          <span>Timestamp: ${new Date().toLocaleString()}</span>
        </div>
        `
        : `
        <!-- LIGHT THEME (WHITE PAPER STATEMENT) -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 22px;">
          <div>
            <div style="font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">OFFICE DAYBOOK</div>
            <div style="font-size: 13px; color: #64748b; margin-top: 3px;">Corrugation Plant Financial Record · Manoj Graphics</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Statement Date</div>
            <div style="font-size: 18px; font-weight: 800; font-family: monospace; color: #d97706;">${filterDate}</div>
          </div>
        </div>

        <!-- 4 KPI SUMMARY CARDS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 24px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Opening Balance</div>
            <div style="font-size: 17px; font-weight: 800; font-family: monospace; color: #0284c7; margin-top: 4px;">
              ${hide ? '********' : '₹' + openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #991b1b; text-transform: uppercase;">Total Debit (Dr)</div>
            <div style="font-size: 17px; font-weight: 800; font-family: monospace; color: #dc2626; margin-top: 4px;">
              ₹${dayTotals.totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #166534; text-transform: uppercase;">Total Credit (Cr)</div>
            <div style="font-size: 17px; font-weight: 800; font-family: monospace; color: #16a34a; margin-top: 4px;">
              ₹${dayTotals.totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Closing Balance</div>
            <div style="font-size: 17px; font-weight: 800; font-family: monospace; color: #059669; margin-top: 4px;">
              ${hide ? '********' : '₹' + closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <!-- ACCOUNT BALANCES -->
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Account Balances</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155;">
              <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: left; font-weight: 700;">Account Name</th>
              <th style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700;">Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            ${accounts.map((a, idx) => {
              const bal = getHistoricalBalanceForAccount(a.name, filterDate);
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              return `<tr style="background: ${bg};">
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${a.name}</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 700; color: ${bal >= 0 ? '#059669' : '#dc2626'};">
                  ${hide ? '********' : (bal < 0 ? '-' : '') + '₹' + Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>

        <!-- TRANSACTIONS TABLE -->
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Transactions for ${filterDate} (${currentDayEntries.length})
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff;">
              <th style="padding: 8px 10px; border: 1px solid #0f172a; text-align: left; font-weight: 700;">Name</th>
              <th style="padding: 8px 10px; border: 1px solid #0f172a; text-align: left; font-weight: 700;">Purpose</th>
              <th style="padding: 8px 10px; border: 1px solid #0f172a; text-align: left; font-weight: 700;">Account</th>
              <th style="padding: 8px 10px; border: 1px solid #0f172a; text-align: right; font-weight: 700; color: #fca5a5;">Debit (Dr)</th>
              <th style="padding: 8px 10px; border: 1px solid #0f172a; text-align: right; font-weight: 700; color: #86efac;">Credit (Cr)</th>
              <th style="padding: 8px 10px; border: 1px solid #0f172a; text-align: left; font-weight: 700;">Note</th>
            </tr>
          </thead>
          <tbody>
            ${currentDayEntries.map((e, idx) => {
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              return `
              <tr style="background: ${bg};">
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${e.name || '—'}</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #334155;">${e.purpose || '—'}</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #475569; font-family: monospace;">${e.accountName || '—'}</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 700; color: #dc2626;">
                  ${e.type === 'Dr' ? '₹' + Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                </td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 700; color: #16a34a;">
                  ${e.type === 'Cr' ? '₹' + Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                </td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #64748b; font-size: 11px;">${e.note || ''}</td>
              </tr>
            `}).join('')}
            ${currentDayEntries.length === 0 ? `
              <tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8; border: 1px solid #e2e8f0; font-style: italic;">No transactions recorded for this date</td></tr>
            ` : ''}
          </tbody>
          ${currentDayEntries.length > 0 ? `
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #0f172a;">
              <td colspan="3" style="padding: 9px 10px; border: 1px solid #cbd5e1; text-align: left; text-transform: uppercase; color: #0f172a;">Total Day Transactions</td>
              <td style="padding: 9px 10px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: #dc2626; font-size: 13px;">
                ₹${dayTotals.totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td style="padding: 9px 10px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: #16a34a; font-size: 13px;">
                ₹${dayTotals.totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td style="padding: 9px 10px; border: 1px solid #cbd5e1;"></td>
            </tr>
          </tfoot>
          ` : ''}
        </table>

        <div style="margin-top: 22px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          <span>Generated by Corrugation Plant Daybook · Manoj Graphics</span>
          <span>Timestamp: ${new Date().toLocaleString()}</span>
        </div>
        `;

      wrapper.appendChild(reportDiv);
      document.body.appendChild(wrapper);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await toPng(reportDiv, {
        pixelRatio: 2,
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        cacheBust: true,
      });

      let blob: Blob | null = null;
      try {
        blob = await toBlob(reportDiv, {
          pixelRatio: 2,
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
        });
      } catch (be) {
        console.warn('Blob generation error:', be);
      }

      // Trigger automatic direct download
      try {
        const link = document.createElement('a');
        link.download = `Daybook-${filterDate}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
        }, 200);
      } catch (dlErr) {
        console.warn('Auto download blocked:', dlErr);
      }

      // Always show preview modal with copy and direct download options
      setSsTheme(themeToUse);
      setScreenshotPreview({
        url: dataUrl,
        blob,
        date: filterDate,
        theme: themeToUse,
      });
    } catch (err: any) {
      console.error('Daybook screenshot error:', err);
      setSsErrorMessage(`Screenshot capture failed: ${err.message || 'Unknown error'}`);
    } finally {
      if (wrapper && document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
      setIsCapturingSS(false);
    }
  };

  const handleCopyScreenshot = async () => {
    if (!screenshotPreview?.blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': screenshotPreview.blob }),
      ]);
      setIsCopiedToClipboard(true);
      setTimeout(() => setIsCopiedToClipboard(false), 2500);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Offscreen element placeholder */}
      <div ref={screenshotContainerRef} className="hidden" />

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Office Daybook</span>
                <span className="text-xs font-mono font-normal text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  Financial Records
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Track plant cash flows, bank ledger balances, inter-account transfers, and daily closing sheets.
              </p>
            </div>
          </div>
        </div>

        {/* Date Filter & Control Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
            />
          </div>

          {/* DATA OPTION BUTTON (BESIDE DATE SELECTION) */}
          <button
            type="button"
            onClick={() => setIsDataModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-sm cursor-pointer"
            title="Open purpose-wise Debit and Credit DATA summary"
          >
            <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>DATA</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterDate(getTodayString());
              setViewMode('entries');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              filterDate === getTodayString() && viewMode === 'entries'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Today
          </button>

          {/* View Mode Switchers */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('entries')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                viewMode === 'entries'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entries ({currentDayEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('deleted')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                viewMode === 'deleted'
                  ? 'bg-rose-500 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              Deleted ({currentDayDeleted.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('edited')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                viewMode === 'edited'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-sky-300'
              }`}
            >
              Edited ({currentDayEdited.length})
            </button>
          </div>

          {/* Direct Download PNG Button */}
          <button
            type="button"
            onClick={() => handleCaptureSS()}
            disabled={isCapturingSS}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Download Daybook Financial Report as PNG Image"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isCapturingSS ? 'Exporting...' : 'Download PNG'}</span>
          </button>

          {/* SS Preview Button */}
          <button
            type="button"
            onClick={() => handleCaptureSS()}
            disabled={isCapturingSS}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Preview Screenshot Image of Daybook (SS)"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>SS</span>
          </button>

          {/* Balance Visibility Toggle */}
          <button
            type="button"
            onClick={handleToggleBalance}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
              balancesVisible
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {balancesVisible ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hide Balance</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>Show Balance</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Screenshot Error Notice (if any) */}
      {ssErrorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{ssErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSsErrorMessage(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* BALANCE KPI ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Opening Balance Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Opening Balance (Start of Day)
            </span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400">
            {balancesVisible ? `₹ ${openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '********'}
          </div>
          <p className="text-[11px] text-slate-500">Net account holdings at start of {filterDate}</p>
        </div>

        {/* Day's Activity Summary */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Day's Cash Activity
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-emerald-400 font-bold">+{currentDayEntries.filter((e) => e.type === 'Cr').length} Cr</span>
              <span className="text-slate-600">/</span>
              <span className="text-rose-400 font-bold">-{currentDayEntries.filter((e) => e.type === 'Dr').length} Dr</span>
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-sm font-mono text-emerald-400 font-bold flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>+{balancesVisible ? dayTotals.totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '****'}</span>
            </div>
            <div className="text-sm font-mono text-rose-400 font-bold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
              <span>-{balancesVisible ? dayTotals.totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '****'}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Net Change on {filterDate}:{' '}
            <span className={`font-mono font-semibold ${netChangeOnFilterDate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {balancesVisible ? (netChangeOnFilterDate >= 0 ? `+${netChangeOnFilterDate.toFixed(2)}` : netChangeOnFilterDate.toFixed(2)) : '****'}
            </span>
          </p>
        </div>

        {/* Closing Balance Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Closing Balance (End of Day)
            </span>
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {balancesVisible ? `₹ ${closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '********'}
          </div>
          <p className="text-[11px] text-slate-500">Combined account closing balances at end of day</p>
        </div>
      </div>

      {/* TOP TWO-COLUMN GRID: Left = Accounts Management, Right = Add Entry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: ACCOUNTS MANAGEMENT (1 Col) */}
        <div className="space-y-6">
          {/* Add Account Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                <span>Add Account</span>
              </h3>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cash In Hand, HDFC Bank, Office Petty Cash..."
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Opening Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 50000"
                  value={newAccountAmount}
                  onChange={(e) => setNewAccountAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isSubmitting ? 'Adding...' : 'Add Account'}</span>
              </button>
            </form>
          </div>

          {/* Accounts List Table Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Ledger Accounts ({accounts.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Balances on {filterDate}
              </span>
            </div>

            {accounts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No accounts created yet. Add an account above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-mono uppercase">
                      <th className="py-2 text-left font-semibold">Account</th>
                      <th className="py-2 text-right font-semibold">Balance</th>
                      <th className="py-2 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {accounts.map((acc) => {
                      const histBal = getHistoricalBalanceForAccount(acc.name, filterDate);
                      return (
                        <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="py-2.5 font-medium text-white truncate max-w-[120px]">
                            {acc.name}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                            {balancesVisible ? `₹${histBal.toFixed(2)}` : '********'}
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditAccount(acc)}
                                className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Edit Balance (Admin Password)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(acc)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Delete Account (Admin Password)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ADD ENTRY FORM (2 Cols) */}
        <div className="lg:col-span-2">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Add Daybook Entry</span>
              </h3>

              {/* Mode Switcher: Normal Entry vs Inter Account Transfer */}
              <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setEntryMode('normal')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    entryMode === 'normal'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Normal Entry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('transfer')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    entryMode === 'transfer'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Inter Account Transfer</span>
                </button>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddEntry} className="space-y-4">
              {/* Row 1: Name, Purpose (Save & Select), Amount, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Party / Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Paper Mill, Electric Bill..."
                    value={entryName}
                    onChange={(e) => setEntryName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Purpose: Searchable Combobox with Type & Save */}
                <div className="relative" ref={purposeDropdownRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Purpose
                    </label>
                    {purpose.trim() && !savedPurposes.some((p) => p.toLowerCase() === purpose.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={handleSaveCurrentPurpose}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 transition-colors"
                        title="Save typed purpose to your reusable list"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Save Purpose</span>
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search or type purpose..."
                      value={purpose}
                      onFocus={() => setIsPurposeDropdownOpen(true)}
                      onChange={(e) => {
                        setPurpose(e.target.value);
                        setIsPurposeDropdownOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && purpose.trim()) {
                          if (!savedPurposes.some((p) => p.toLowerCase() === purpose.trim().toLowerCase())) {
                            e.preventDefault();
                            handleSaveCurrentPurpose();
                            setIsPurposeDropdownOpen(false);
                          }
                        }
                      }}
                      className="w-full pl-8 pr-14 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-1">
                      {purpose && (
                        <button
                          type="button"
                          onClick={() => {
                            setPurpose('');
                            setIsPurposeDropdownOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
                          title="Clear purpose"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsPurposeDropdownOpen(!isPurposeDropdownOpen)}
                        className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Toggle saved purposes list"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isPurposeDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Menu for Purpose Search & Selection */}
                  {isPurposeDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-2">
                      <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 mb-1">
                        <span>Saved Purposes ({savedPurposes.length})</span>
                        {purpose.trim() && <span>Filter: "{purpose.trim()}"</span>}
                      </div>

                      {/* Quick Save Option when typing something new */}
                      {purpose.trim() && !savedPurposes.some((p) => p.toLowerCase() === purpose.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => {
                            handleSaveCurrentPurpose();
                            setIsPurposeDropdownOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 mb-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">Save "+ {purpose.trim()}" to purposes</span>
                        </button>
                      )}

                      <div className="max-h-44 overflow-y-auto space-y-0.5">
                        {filteredPurposes.length > 0 ? (
                          filteredPurposes.map((p) => {
                            const isSelected = purpose.toLowerCase() === p.toLowerCase();
                            return (
                              <div
                                key={p}
                                className={`px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between cursor-pointer transition-colors group ${
                                  isSelected
                                    ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <div
                                  onClick={() => {
                                    setPurpose(p);
                                    setIsPurposeDropdownOpen(false);
                                  }}
                                  className="flex-1 flex items-center gap-2 truncate"
                                >
                                  <span className="truncate">{p}</span>
                                  {isSelected && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSavedPurpose(p);
                                  }}
                                  className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700/60 rounded transition-colors opacity-70 group-hover:opacity-100 cursor-pointer ml-1"
                                  title={`Delete "${p}" from saved purposes`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400">
                            {savedPurposes.length === 0 ? (
                              <span>No purposes saved yet. Type above to add your first purpose.</span>
                            ) : (
                              <span>No saved purposes match "{purpose}".</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Amount (₹) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 15000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Date <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Description Option for Normal Entry */}
              {entryMode === 'normal' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Description <span className="text-slate-500 text-[10px] lowercase font-normal">(Details, invoice #, or breakdown)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500 pcs printed cartons, canteen tea for shift, motor bearing replacement..."
                    value={entryDescription}
                    onChange={(e) => setEntryDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Mode Dependent Fields */}
              {entryMode === 'normal' ? (
                /* Normal Mode: Account Select & Dr/Cr */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Account <span className="text-amber-400">*</span>
                    </label>
                    {accounts.length > 0 ? (
                      <select
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.name}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-amber-400">Please add an account first on the left.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Transaction Type <span className="text-amber-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEntryType('Dr')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          entryType === 'Dr'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-xs'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                        <span>Debit (Dr) - Expense</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEntryType('Cr')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          entryType === 'Cr'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Credit (Cr) - Receipt</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Transfer Mode: From Account & To Account */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-950/70 border border-amber-500/30 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-rose-400" />
                      <span>From Account (Debited - Outflow)</span>
                    </label>
                    <select
                      value={fromAccount}
                      onChange={(e) => setFromAccount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                      <span>To Account (Credited - Inflow)</span>
                    </label>
                    <select
                      value={toAccount}
                      onChange={(e) => setToAccount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Note and Submit Button */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Additional transaction note or reference number..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex-1 w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />

                <button
                  type="submit"
                  disabled={isSubmitting || accounts.length === 0}
                  className="w-full sm:w-auto px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSubmitting ? 'Recording...' : 'Add Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: ENTRIES TABLE */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>
                {viewMode === 'entries' && `Entries for ${filterDate}`}
                {viewMode === 'deleted' && `Deleted Entries History (${filterDate})`}
                {viewMode === 'edited' && `Edited Entries History (${filterDate})`}
              </span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {viewMode === 'entries' && `${currentDayEntries.length} records`}
              {viewMode === 'deleted' && `${currentDayDeleted.length} records`}
              {viewMode === 'edited' && `${currentDayEdited.length} records`}
            </span>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Day Closing: <strong className="text-emerald-400">{balancesVisible ? `₹${closingBalance.toFixed(2)}` : '********'}</strong>
          </div>
        </div>

        {/* VIEW 1: ACTIVE ENTRIES */}
        {viewMode === 'entries' && (
          currentDayEntries.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-400">No daybook entries recorded for {filterDate}.</p>
              <p className="text-[11px] text-slate-600">Use the form above to add a new debit, credit, or transfer entry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-mono uppercase bg-slate-950/60">
                    <th className="py-2.5 px-3 text-left font-semibold">Name</th>
                    <th className="py-2.5 px-3 text-left font-semibold">Purpose</th>
                    <th className="py-2.5 px-3 text-left font-semibold">Description</th>
                    <th className="py-2.5 px-3 text-left font-semibold">Account</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-rose-400">Debit (Dr)</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-emerald-400">Credit (Cr)</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Date</th>
                    <th className="py-2.5 px-3 text-left font-semibold">Note</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {currentDayEntries.map((e) => {
                    const isTransfer = Boolean(e.transferGroup);
                    return (
                      <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            {isTransfer && <ArrowRightLeft className="w-3 h-3 text-amber-400 shrink-0" />}
                            <span className="truncate max-w-[140px]">{e.name || '—'}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="truncate max-w-[150px] inline-block font-medium">{e.purpose || '—'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          <span className="truncate max-w-[180px] inline-block">{e.description || '—'}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                            {e.accountName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                          {e.type === 'Dr' ? `₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          {e.type === 'Cr' ? `₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {e.date}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-[180px]">
                          {e.note || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditEntry(e)}
                              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(e.id)}
                              className="px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer text-[11px] font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* VIEW 2: DELETED ENTRIES */}
        {viewMode === 'deleted' && (
          currentDayDeleted.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              No deleted entries recorded for {filterDate}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-mono uppercase bg-slate-950/60">
                    <th className="py-2.5 px-3 text-left font-semibold">Name</th>
                    <th className="py-2.5 px-3 text-left font-semibold">Purpose</th>
                    <th className="py-2.5 px-3 text-left font-semibold">Description</th>
                    <th className="py-2.5 px-3 text-left font-semibold">Account</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-rose-400">Debit (Dr)</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-emerald-400">Credit (Cr)</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Date</th>
                    <th className="py-2.5 px-3 text-left font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {currentDayDeleted.map((d, idx) => (
                    <tr key={d.id || idx} className="hover:bg-slate-800/40 transition-colors text-slate-400">
                      <td className="py-2.5 px-3 text-slate-300 font-medium">{d.name || '—'}</td>
                      <td className="py-2.5 px-3">{d.purpose || '—'}</td>
                      <td className="py-2.5 px-3">{d.description || '—'}</td>
                      <td className="py-2.5 px-3 font-mono">{d.accountName || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-400/80">
                        {d.type === 'Dr' ? `₹${Number(d.amount).toFixed(2)}` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400/80">
                        {d.type === 'Cr' ? `₹${Number(d.amount).toFixed(2)}` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{d.date}</td>
                      <td className="py-2.5 px-3 text-[11px]">{d.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* VIEW 3: EDITED ENTRIES */}
        {viewMode === 'edited' && (
          currentDayEdited.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              No edited entry adjustments recorded for {filterDate}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-mono uppercase bg-slate-950/60">
                    <th className="py-2.5 px-3 text-left font-semibold">Name</th>
                    <th className="py-2.5 px-3 text-left font-semibold">Account</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-rose-400">Before Amount</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-emerald-400">After Amount</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {currentDayEdited.map((ed, idx) => (
                    <tr key={ed.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">{ed.name || '—'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{ed.accountName || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-400">
                        ₹{Number(ed.before).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">
                        ₹{Number(ed.after).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">{ed.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* End of Day Closing Summary Bar */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
          <span>Closing Balance (End of Day):</span>
          <span className="font-mono text-sm font-bold text-emerald-400">
            {balancesVisible ? `₹ ${closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '********'}
          </span>
        </div>
      </div>

      {/* SLEEK MODAL PROMPT DIALOG */}
      {promptModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs" onClick={closePrompt} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>{promptModal.title}</span>
              </h3>
              <button
                type="button"
                onClick={closePrompt}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {promptModal.description}
            </p>

            {promptError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{promptError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                promptModal.onConfirm(promptInputValue);
              }}
              className="space-y-4"
            >
              <input
                type={promptModal.isPassword ? 'password' : 'text'}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                placeholder={promptModal.placeholder || 'Enter value...'}
                value={promptInputValue}
                onChange={(e) => {
                  setPromptInputValue(e.target.value);
                  setPromptError('');
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePrompt}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Confirm & Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* DATA OPTION MODAL: PURPOSE-WISE DEBIT & CREDIT CONSOLIDATION */}
      {/* =================================================================== */}
      {isDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Purpose Financial DATA</span>
                    <span className="text-[10px] font-mono font-normal text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                      Non-Stock Purposes
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Consolidated Debit (Dr) and Credit (Cr) totals categorized by Purpose
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDataModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Toolbar (Month Selection + Search) */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Left: Month Selection */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setDataViewFilter('month')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      dataViewFilter === 'month'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Selected Month</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDataViewFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      dataViewFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>All Time</span>
                  </button>
                </div>

                {dataViewFilter === 'month' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Month:</span>
                    <input
                      type="month"
                      value={dataSelectedMonth}
                      onChange={(e) => setDataSelectedMonth(e.target.value)}
                      className="bg-transparent text-amber-400 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Right: Search Filter */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by purpose name..."
                  value={dataSearchQuery}
                  onChange={(e) => setDataSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Quick KPI Overview Cards */}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/40 border-b border-slate-800 shrink-0">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Total Purposes</span>
                <div className="text-lg font-bold text-white font-mono">{purposeWiseData.totalPurposes}</div>
                <span className="text-[10px] text-slate-500">{purposeWiseData.totalTransactions} transactions</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-0.5">
                <span className="text-[10px] font-mono text-rose-300 uppercase font-semibold">Total Debit (Dr)</span>
                <div className="text-lg font-bold text-rose-400 font-mono">
                  ₹{purposeWiseData.totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-rose-400/70">Total Expenses</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-0.5">
                <span className="text-[10px] font-mono text-emerald-300 uppercase font-semibold">Total Credit (Cr)</span>
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  ₹{purposeWiseData.totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-emerald-400/70">Total Receipts</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Net Total</span>
                <div className={`text-lg font-bold font-mono ${purposeWiseData.netTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {purposeWiseData.netTotal >= 0 ? '+' : ''}₹{purposeWiseData.netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-500">{purposeWiseData.netTotal >= 0 ? 'Surplus' : 'Deficit'}</span>
              </div>
            </div>

            {/* Purpose Table View */}
            <div className="flex-1 overflow-y-auto p-4">
              {purposeWiseData.rows.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl space-y-2">
                  <BarChart3 className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-semibold text-slate-300">No purpose data recorded for {dataViewFilter === 'month' ? dataSelectedMonth : 'all time'}.</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Note: Automated stock, paper reel, and die tooling records are excluded from this operational summary.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-mono uppercase bg-slate-950/80">
                        <th className="py-2.5 px-3 text-center font-semibold w-12">#</th>
                        <th className="py-2.5 px-3 text-left font-semibold">Purpose Name</th>
                        <th className="py-2.5 px-3 text-center font-semibold w-24">Txns</th>
                        <th className="py-2.5 px-3 text-right font-semibold text-rose-400">Debit (Dr)</th>
                        <th className="py-2.5 px-3 text-right font-semibold text-emerald-400">Credit (Cr)</th>
                        <th className="py-2.5 px-3 text-right font-semibold text-slate-300">Net Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {purposeWiseData.rows.map((row, idx) => {
                        const rowNet = row.totalCr - row.totalDr;
                        return (
                          <tr key={row.purpose} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-white">
                              <span className="flex items-center gap-1.5">
                                <Tag className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>{row.purpose}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                              <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                                {row.count}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                              {row.totalDr > 0
                                ? `₹${row.totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                              {row.totalCr > 0
                                ? `₹${row.totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">
                              <span className={rowNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {rowNet >= 0 ? '+' : ''}₹{rowNet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* TOTAL AMOUNT AT BOTTOM */}
                    <tfoot>
                      <tr className="border-t-2 border-amber-500/40 bg-slate-950/90 font-bold text-white text-xs">
                        <td colSpan={2} className="py-3 px-4 text-left font-mono uppercase tracking-wider text-amber-400">
                          TOTAL AMOUNT (All Purposes)
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-amber-300">
                          {purposeWiseData.totalTransactions}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-400 text-sm">
                          ₹{purposeWiseData.totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400 text-sm">
                          ₹{purposeWiseData.totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm">
                          <span className={purposeWiseData.netTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {purposeWiseData.netTotal >= 0 ? '+' : ''}₹{purposeWiseData.netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer Note */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Automated inventory stock & die records are excluded from this report.</span>
              </span>
              <button
                type="button"
                onClick={() => setIsDataModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREENSHOT PREVIEW MODAL */}
      {screenshotPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Daybook Statement Preview
                </h3>
                <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded">
                  {screenshotPreview.date}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Theme Selector (White Paper vs Dark Slate) */}
                <div className="flex items-center p-0.5 bg-slate-800 rounded-lg border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => handleCaptureSS('light')}
                    className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                      screenshotPreview.theme === 'light'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    White Paper
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCaptureSS('dark')}
                    className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                      screenshotPreview.theme === 'dark'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dark Slate
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyScreenshot}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copy screenshot to clipboard"
                >
                  {isCopiedToClipboard ? (
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

                <a
                  href={screenshotPreview.url}
                  download={`Daybook-${screenshotPreview.date}.png`}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Download image file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </a>

                <button
                  type="button"
                  onClick={() => setScreenshotPreview(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                  title="Close screenshot preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Preview Body */}
            <div className={`flex-1 overflow-y-auto p-4 text-center ${screenshotPreview.theme === 'light' ? 'bg-slate-300/90' : 'bg-slate-950/90'}`}>
              <img
                src={screenshotPreview.url}
                alt={`Daybook statement for ${screenshotPreview.date}`}
                className="max-w-full h-auto mx-auto rounded-xl border border-slate-700/80 shadow-2xl"
              />
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-slate-500 shrink-0">
              <span className="text-emerald-400 font-medium">✓ Screenshot ready with accounts and day's transactions.</span>
              <span>Tip: If your browser blocks automatic downloads, use "Copy Image" or right-click to save.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
