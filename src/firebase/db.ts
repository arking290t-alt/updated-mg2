import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import { 
  CorrugationJob, 
  InventoryItem, 
  JobStatus,
  JobProcessStep,
  INITIAL_STOCK_TYPES, 
  COMMON_SUPPLIERS, 
  INITIAL_PRESS_NAMES,
  INITIAL_DIE_MAKERS,
  INITIAL_PUNCH_TYPES,
  INITIAL_PRINT_TYPES,
  formatReceivedTimestamp
} from '../types/job';
import { Quotation } from '../types/quotation';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  timestamp: string;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    timestamp: new Date().toISOString(),
  };
  console.warn('Firestore Note:', JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
}

export interface FactorySettings {
  jobTypes: string[];
  stockTypes: string[];
  suppliers: string[];
  presses: string[];
  dieMakers: string[];
  punchTypes: string[];
  printTypes: string[];
}

const JOBS_COLLECTION = 'jobs';
const INVENTORY_COLLECTION = 'inventory';
const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC = 'factory_dropdowns';

// Local Storage & Tombstone Keys to guarantee permanent deletions and no reset on refresh
const MG_JOBS_STORAGE_KEY = 'mg_corrugation_jobs_data';
const MG_INVENTORY_STORAGE_KEY = 'mg_corrugation_inventory_data';
const MG_SETTINGS_STORAGE_KEY = 'mg_corrugation_settings_data';
const MG_DELETED_JOBS_KEY = 'mg_corrugation_deleted_jobs_ids';
const MG_DELETED_INVENTORY_KEY = 'mg_corrugation_deleted_inventory_ids';

const LEGACY_DEFAULT_JOB_TYPES = [
  'Single Facer Fluting',
  'Double Backer Pasting',
  'Corrugated Board Slitting & Scoring',
  'Flexo Printing & Slotting',
  'Rotary Die Cutting',
  'Flatbed Die Cutting',
  'Folder Gluer & Stitching',
  'Starch Adhesive Batching',
  'Paper Reel Unloading & Inspection',
  'ECT & Bursting Strength Quality Audit',
  'Customer Order Estimation & Quotation',
  'Raw Paper Reel Procurement',
  'Dispatch & Logistics Billing',
  'Production Shift Scheduling',
];

// ----------------------------------------------------
// LOCAL STORAGE & PERMANENT TOMBSTONE HELPERS
// ----------------------------------------------------

export function getDeletedJobIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(MG_DELETED_JOBS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markJobAsDeleted(jobId: string): void {
  if (typeof window === 'undefined' || !jobId) return;
  try {
    const deleted = getDeletedJobIds();
    deleted.add(jobId);
    localStorage.setItem(MG_DELETED_JOBS_KEY, JSON.stringify(Array.from(deleted)));
    const currentJobs = getPersistedJobs();
    savePersistedJobs(currentJobs.filter((j) => j.id !== jobId));
  } catch (e) {
    console.warn('Error marking job as deleted:', e);
  }
}

export function getPersistedJobs(): CorrugationJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MG_JOBS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const deletedIds = getDeletedJobIds();
    return Array.isArray(parsed) ? parsed.filter((j) => j && j.id && !deletedIds.has(j.id)) : [];
  } catch (e) {
    console.warn('Error reading persisted jobs:', e);
    return [];
  }
}

export function savePersistedJobs(jobs: CorrugationJob[]): void {
  if (typeof window === 'undefined') return;
  try {
    const deletedIds = getDeletedJobIds();
    const cleanJobs = jobs.filter((j) => j && j.id && !deletedIds.has(j.id));
    localStorage.setItem(MG_JOBS_STORAGE_KEY, JSON.stringify(cleanJobs));
  } catch (e) {
    console.warn('Error saving persisted jobs:', e);
  }
}

export function getDeletedInventoryIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(MG_DELETED_INVENTORY_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markInventoryAsDeleted(itemId: string): void {
  if (typeof window === 'undefined' || !itemId) return;
  try {
    const deleted = getDeletedInventoryIds();
    deleted.add(itemId);
    localStorage.setItem(MG_DELETED_INVENTORY_KEY, JSON.stringify(Array.from(deleted)));
    const currentInv = getPersistedInventory();
    savePersistedInventory(currentInv.filter((i) => i.id !== itemId));
  } catch (e) {
    console.warn('Error marking inventory as deleted:', e);
  }
}

export function getPersistedInventory(): InventoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MG_INVENTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const deletedIds = getDeletedInventoryIds();
    return Array.isArray(parsed) ? parsed.filter((i) => i && i.id && !deletedIds.has(i.id)) : [];
  } catch (e) {
    console.warn('Error reading persisted inventory:', e);
    return [];
  }
}

export function savePersistedInventory(inventory: InventoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const deletedIds = getDeletedInventoryIds();
    const cleanInv = inventory.filter((i) => i && i.id && !deletedIds.has(i.id));
    localStorage.setItem(MG_INVENTORY_STORAGE_KEY, JSON.stringify(cleanInv));
  } catch (e) {
    console.warn('Error saving persisted inventory:', e);
  }
}

export function getPersistedSettings(): FactorySettings {
  const defaultSettings: FactorySettings = {
    jobTypes: [], // Starts strictly at 0 saved items
    stockTypes: INITIAL_STOCK_TYPES,
    suppliers: COMMON_SUPPLIERS,
    presses: INITIAL_PRESS_NAMES,
    dieMakers: INITIAL_DIE_MAKERS,
    punchTypes: INITIAL_PUNCH_TYPES,
    printTypes: INITIAL_PRINT_TYPES,
  };

  if (typeof window === 'undefined') return defaultSettings;
  try {
    const raw = localStorage.getItem(MG_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      jobTypes: Array.isArray(parsed.jobTypes)
        ? parsed.jobTypes.filter((t: string) => !LEGACY_DEFAULT_JOB_TYPES.includes(t))
        : [],
      stockTypes:
        Array.isArray(parsed.stockTypes) && parsed.stockTypes.length > 0
          ? parsed.stockTypes
          : INITIAL_STOCK_TYPES,
      suppliers:
        Array.isArray(parsed.suppliers) && parsed.suppliers.length > 0
          ? parsed.suppliers
          : COMMON_SUPPLIERS,
      presses:
        Array.isArray(parsed.presses) && parsed.presses.length > 0
          ? parsed.presses
          : INITIAL_PRESS_NAMES,
      dieMakers:
        Array.isArray(parsed.dieMakers) && parsed.dieMakers.length > 0
          ? parsed.dieMakers
          : INITIAL_DIE_MAKERS,
      punchTypes:
        Array.isArray(parsed.punchTypes) && parsed.punchTypes.length > 0
          ? parsed.punchTypes
          : INITIAL_PUNCH_TYPES,
      printTypes:
        Array.isArray(parsed.printTypes) && parsed.printTypes.length > 0
          ? parsed.printTypes
          : INITIAL_PRINT_TYPES,
    };
  } catch {
    return defaultSettings;
  }
}

export function savePersistedSettings(settings: FactorySettings): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanJobTypes = (settings.jobTypes || []).filter(
      (t: string) => !LEGACY_DEFAULT_JOB_TYPES.includes(t)
    );
    localStorage.setItem(
      MG_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...settings,
        jobTypes: cleanJobTypes,
      })
    );
  } catch (e) {
    console.warn('Error saving persisted settings:', e);
  }
}

// Test connection to Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDoc = await getDoc(doc(db, SETTINGS_COLLECTION, 'healthcheck'));
    return true;
  } catch (error) {
    console.warn('Firestore connection check warning:', error);
    return false;
  }
}

// ----------------------------------------------------
// 1. JOBS OPERATIONS (DUAL SYNC: LOCAL STORAGE + FIRESTORE)
// ----------------------------------------------------

export function subscribeToJobs(
  onUpdate: (jobs: CorrugationJob[]) => void,
  onError?: (err: Error) => void
): () => void {
  // 1. Immediately provide persisted jobs from local storage for instant offline render
  const initialJobs = getPersistedJobs();
  onUpdate(initialJobs);

  const jobsRef = collection(db, JOBS_COLLECTION);

  const unsubscribe = onSnapshot(
    jobsRef,
    (snapshot) => {
      const firestoreItems: CorrugationJob[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        firestoreItems.push({
          id: docSnap.id,
          jobName: data.jobName || 'Unnamed Job',
          jobType: data.jobType || 'General Corrugation',
          jobPlacement: data.jobPlacement || 'Factory',
          createdAt: data.createdAt || new Date().toISOString(),
          status: (data.status as JobStatus) || 'Pending',
          notes: data.notes || '',
          hasInventory: Boolean(data.hasInventory),
          inventoryCount: data.inventoryCount || 0,
          inventoryOrderId: data.inventoryOrderId || undefined,
          boardSize: data.boardSize || undefined,
          jobSize: data.jobSize || undefined,
          pressName: data.pressName || undefined,
          isUrgent: Boolean(data.isUrgent),
          pressStatus: data.pressStatus || undefined,
          isPrinted: data.isPrinted !== undefined ? Boolean(data.isPrinted) : undefined,
          pressPhotoUrl: data.pressPhotoUrl || undefined,
          processes: Array.isArray(data.processes)
            ? data.processes.map((p: any, idx: number) => ({
                id: String(p.id || `proc-${idx}`),
                name: String(p.name || 'Process'),
                completed: Boolean(p.completed),
                completedDate: p.completedDate ? String(p.completedDate) : undefined,
                notes: p.notes ? String(p.notes) : undefined,
                sequence: typeof p.sequence === 'number' ? p.sequence : idx + 1,
              }))
            : undefined,
          completedAt: data.completedAt || undefined,
          pressCompletedAt: data.pressCompletedAt || undefined,
        });
      });

      // If firestore has items, update local storage & callback
      if (firestoreItems.length > 0) {
        const finalJobs = firestoreItems.sort((a, b) => 
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );
        savePersistedJobs(finalJobs);
        onUpdate(finalJobs);
      } else {
        // If firestore has 0 jobs currently, check if this device has local jobs to sync
        const localJobs = getPersistedJobs();
        if (localJobs.length > 0) {
          onUpdate(localJobs);
          localJobs.forEach((job) => {
            setDoc(doc(db, JOBS_COLLECTION, job.id), cleanFirestoreData(job), { merge: true }).catch((e) => {
              console.warn('Auto-sync job failed:', job.id, e);
            });
          });
        } else {
          savePersistedJobs([]);
          onUpdate([]);
        }
      }
    },
    (err) => {
      const wrappedError = handleFirestoreError(err, OperationType.LIST, JOBS_COLLECTION);
      const persistedJobs = getPersistedJobs();
      onUpdate(persistedJobs);
      if (onError) onError(wrappedError);
    }
  );

  return unsubscribe;
}

// Helper to deep clean data before passing to Firestore (Firestore rejects any `undefined` values)
export function cleanFirestoreData<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof data === 'object' && data !== null) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export function sanitizeJobProcessStep(step: any, index: number = 0): JobProcessStep {
  const cleanStep: JobProcessStep = {
    id: String(step.id || `proc_${Date.now()}_${index}`),
    name: String(step.name || `Process ${index + 1}`),
    completed: Boolean(step.completed),
    sequence: typeof step.sequence === 'number' ? step.sequence : index + 1,
  };
  if (step.completed && step.completedDate) {
    cleanStep.completedDate = String(step.completedDate);
  }
  if (step.notes) {
    cleanStep.notes = String(step.notes);
  }
  return cleanStep;
}

export async function addJobToFirestore(job: CorrugationJob): Promise<void> {
  // 1. Remove ID from deleted tombstones if it was ever there
  const deletedIds = getDeletedJobIds();
  if (deletedIds.has(job.id)) {
    deletedIds.delete(job.id);
    localStorage.setItem(MG_DELETED_JOBS_KEY, JSON.stringify(Array.from(deletedIds)));
  }

  // Sanitize processes if present
  const cleanProcesses = Array.isArray(job.processes)
    ? job.processes.map((p, idx) => sanitizeJobProcessStep(p, idx))
    : null;

  const sanitizedJob: CorrugationJob = {
    ...job,
    processes: cleanProcesses || undefined,
  };

  // 2. Immediately save to local persistent storage
  const currentJobs = getPersistedJobs();
  const updatedJobs = [sanitizedJob, ...currentJobs.filter((j) => j.id !== job.id)];
  savePersistedJobs(updatedJobs);

  // 3. Sync to Firestore
  try {
    const payload = cleanFirestoreData({
      jobName: sanitizedJob.jobName,
      jobType: sanitizedJob.jobType,
      jobPlacement: sanitizedJob.jobPlacement,
      createdAt: sanitizedJob.createdAt,
      status: sanitizedJob.status,
      notes: sanitizedJob.notes || '',
      hasInventory: Boolean(sanitizedJob.hasInventory),
      inventoryCount: sanitizedJob.inventoryCount || 0,
      inventoryOrderId: sanitizedJob.inventoryOrderId || null,
      boardSize: sanitizedJob.boardSize || null,
      jobSize: sanitizedJob.jobSize || null,
      pressName: sanitizedJob.pressName || null,
      isUrgent: Boolean(sanitizedJob.isUrgent),
      pressStatus: sanitizedJob.pressStatus || 'Pending',
      isPrinted: sanitizedJob.isPrinted !== undefined ? sanitizedJob.isPrinted : null,
      pressPhotoUrl: sanitizedJob.pressPhotoUrl || null,
      processes: cleanProcesses,
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, JOBS_COLLECTION, job.id), payload, { merge: true });
  } catch (err) {
    console.warn(`Firestore setDoc for job ${job.id} failed, but job is saved locally:`, err);
  }
}

/**
 * Automatically marks all inventory stock (raw board, paper reel, die tooling)
 * attached to a job as 'Used' when the job is completed.
 */
export async function markAttachedStockUsedForJob(
  jobId: string,
  jobName?: string,
  jobType?: string,
  notes?: string,
  completedAt?: string
): Promise<void> {
  const currentInv = getPersistedInventory();
  const currentJobs = getPersistedJobs();
  const job = currentJobs.find((j) => j.id === jobId);
  const targetJobName = (jobName || job?.jobName || '').trim().toLowerCase();
  const timestamp = completedAt || formatReceivedTimestamp();
  const jobDesc = notes || job?.notes || jobType || job?.jobType || 'Completed with Job';

  // Find all items linked by jobId OR jobName that are not already marked used
  const matchingItems = currentInv.filter((item) => {
    if (item.isUsed) return false;
    const matchesId = item.jobId && item.jobId === jobId;
    const matchesName = targetJobName && item.jobName && item.jobName.trim().toLowerCase() === targetJobName;
    return matchesId || matchesName;
  });

  if (matchingItems.length === 0) return;

  // 1. Immediately update in local persistent storage
  const updatedInv = currentInv.map((item) => {
    const matchesId = item.jobId && item.jobId === jobId;
    const matchesName = targetJobName && item.jobName && item.jobName.trim().toLowerCase() === targetJobName;
    if (!item.isUsed && (matchesId || matchesName)) {
      return {
        ...item,
        isUsed: true,
        status: 'Used' as const,
        usedAt: timestamp,
        usedJobId: jobId,
        usedJobName: job?.jobName || item.jobName || targetJobName,
        usedJobDescription: jobDesc,
      };
    }
    return item;
  });
  savePersistedInventory(updatedInv);

  // 2. Sync each item to Firestore
  for (const item of matchingItems) {
    try {
      const payload = cleanFirestoreData({
        isUsed: true,
        status: 'Used',
        usedAt: timestamp,
        usedJobId: jobId,
        usedJobName: job?.jobName || item.jobName || targetJobName,
        usedJobDescription: jobDesc,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, INVENTORY_COLLECTION, item.id), payload, { merge: true });
    } catch (err) {
      console.warn(`Firestore setDoc for inventory item ${item.id} failed:`, err);
    }
  }
}

/**
 * Reverts inventory items previously marked used by this specific jobId back to active inventory.
 */
export async function unmarkAttachedStockUsedForJob(jobId: string): Promise<void> {
  const currentInv = getPersistedInventory();
  const autoUsedItems = currentInv.filter((i) => i.isUsed && i.usedJobId === jobId);
  if (autoUsedItems.length === 0) return;

  const updatedInv = currentInv.map((item) => {
    if (item.isUsed && item.usedJobId === jobId) {
      return {
        ...item,
        isUsed: false,
        status: (item.receivedAt ? 'Received' : 'Not Received') as any,
        usedAt: undefined,
        usedJobId: undefined,
        usedJobName: undefined,
        usedJobDescription: undefined,
      };
    }
    return item;
  });
  savePersistedInventory(updatedInv);

  for (const item of autoUsedItems) {
    try {
      const payload = cleanFirestoreData({
        isUsed: false,
        status: item.receivedAt ? 'Received' : 'Not Received',
        usedAt: null,
        usedJobId: null,
        usedJobName: null,
        usedJobDescription: null,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, INVENTORY_COLLECTION, item.id), payload, { merge: true });
    } catch (err) {
      console.warn(`Firestore setDoc revert for inventory item ${item.id} failed:`, err);
    }
  }
}

/**
 * Scans all inventory items and completed jobs; if any stock is attached to a
 * completed job but hasn't been marked as used yet, marks it as used.
 */
export async function reconcileCompletedJobsInventory(): Promise<void> {
  const currentJobs = getPersistedJobs();
  const completedJobs = currentJobs.filter((j) => j.status === 'Completed');
  if (completedJobs.length === 0) return;

  for (const job of completedJobs) {
    await markAttachedStockUsedForJob(job.id, job.jobName, job.jobType, job.notes, job.completedAt);
  }
}

export async function updateJobStatusInFirestore(jobId: string, status: JobStatus, completedAt?: string): Promise<void> {
  // 1. Immediately update in local persistent storage
  const currentJobs = getPersistedJobs();
  const updatedJobs = currentJobs.map((j) => (j.id === jobId ? { ...j, status, ...(status === 'Completed' && completedAt ? { completedAt } : {}) } : j));
  savePersistedJobs(updatedJobs);

  // 2. If status is Completed, immediately mark all attached stock as used
  if (status === 'Completed') {
    const targetJob = currentJobs.find((j) => j.id === jobId);
    await markAttachedStockUsedForJob(jobId, targetJob?.jobName, targetJob?.jobType, targetJob?.notes, completedAt);
  } else if (status === 'Pending') {
    await unmarkAttachedStockUsedForJob(jobId);
  }

  // 3. Sync to Firestore
  try {
    const payload: any = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (status === 'Completed' && completedAt) {
      payload.completedAt = completedAt;
    } else if (status === 'Pending') {
      payload.completedAt = null;
    }
    await setDoc(doc(db, JOBS_COLLECTION, jobId), cleanFirestoreData(payload), { merge: true });
  } catch (err) {
    console.warn(`Firestore setDoc for job ${jobId} failed, but status is saved locally:`, err);
  }
}

export async function updateJobDetailsInFirestore(
  jobId: string,
  updates: Partial<CorrugationJob>
): Promise<void> {
  // Clean processes if provided
  let cleanUpdates = { ...updates };
  if (Array.isArray(updates.processes)) {
    cleanUpdates.processes = updates.processes.map((p, idx) => sanitizeJobProcessStep(p, idx));
  }

  // 1. Immediately update in local persistent storage
  const currentJobs = getPersistedJobs();
  const existingJob = currentJobs.find((j) => j.id === jobId);
  const updatedJobs = currentJobs.map((j) => (j.id === jobId ? { ...j, ...cleanUpdates } : j));
  savePersistedJobs(updatedJobs);

  // 2. If status is Completed, immediately mark all attached stock as used
  if (cleanUpdates.status === 'Completed') {
    const targetJob = existingJob || currentJobs.find((j) => j.id === jobId);
    await markAttachedStockUsedForJob(
      jobId,
      cleanUpdates.jobName || targetJob?.jobName,
      cleanUpdates.jobType || targetJob?.jobType,
      cleanUpdates.notes || targetJob?.notes,
      cleanUpdates.completedAt
    );
  } else if (cleanUpdates.status === 'Pending') {
    await unmarkAttachedStockUsedForJob(jobId);
  }

  // 3. Sync to Firestore
  try {
    const payload: any = {
      ...cleanUpdates,
      updatedAt: new Date().toISOString(),
    };

    // If job document might need base fields to satisfy firestore security rules
    if (existingJob) {
      payload.jobName = cleanUpdates.jobName || existingJob.jobName;
      payload.status = cleanUpdates.status || existingJob.status;
      payload.jobPlacement = cleanUpdates.jobPlacement || existingJob.jobPlacement;
      payload.jobType = cleanUpdates.jobType || existingJob.jobType;
      payload.createdAt = cleanUpdates.createdAt || existingJob.createdAt;
    }

    const cleanPayload = cleanFirestoreData(payload);
    await setDoc(doc(db, JOBS_COLLECTION, jobId), cleanPayload, { merge: true });
  } catch (err) {
    console.warn(`Firestore setDoc for job ${jobId} failed, but saved locally:`, err);
    throw err;
  }
}

export async function updateJobInventoryFlagInFirestore(
  jobId: string, 
  hasInventory: boolean, 
  addedCount: number
): Promise<void> {
  // 1. Immediately update in local persistent storage
  const currentJobs = getPersistedJobs();
  const updatedJobs = currentJobs.map((j) => {
    if (j.id === jobId) {
      return {
        ...j,
        hasInventory,
        inventoryCount: (j.inventoryCount || 0) + addedCount,
      };
    }
    return j;
  });
  savePersistedJobs(updatedJobs);

  // 2. Sync to Firestore
  const path = `${JOBS_COLLECTION}/${jobId}`;
  try {
    const jobRef = doc(db, JOBS_COLLECTION, jobId);
    const existingSnap = await getDoc(jobRef);
    const currentCount = existingSnap.exists() ? (existingSnap.data().inventoryCount || 0) : 0;

    await updateDoc(jobRef, {
      hasInventory,
      inventoryCount: currentCount + addedCount,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`Firestore update for job inventory flag failed, but saved locally:`, err);
  }
}

export async function deleteJobFromFirestore(jobId: string): Promise<void> {
  // 1. Permanently mark as deleted in tombstone storage (will NEVER resurrect on refresh)
  markJobAsDeleted(jobId);

  // 2. Remove immediately from local persistent storage
  const currentJobs = getPersistedJobs();
  savePersistedJobs(currentJobs.filter((j) => j.id !== jobId));

  // 3. Delete from Firestore
  const path = `${JOBS_COLLECTION}/${jobId}`;
  try {
    await deleteDoc(doc(db, JOBS_COLLECTION, jobId));
  } catch (err) {
    console.warn(`Firestore deleteDoc for job ${jobId} failed, but item is permanently deleted locally:`, err);
  }
}

// ----------------------------------------------------
// 2. INVENTORY OPERATIONS (DUAL SYNC: LOCAL STORAGE + FIRESTORE)
// ----------------------------------------------------

export function subscribeToInventory(
  onUpdate: (inventory: InventoryItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  // 1. Immediately provide persisted inventory from local storage for instant offline render
  const initialInv = getPersistedInventory();
  onUpdate(initialInv);

  const invRef = collection(db, INVENTORY_COLLECTION);

  const unsubscribe = onSnapshot(
    invRef,
    (snapshot) => {
      const firestoreItems: InventoryItem[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        firestoreItems.push({
          id: docSnap.id,
          stockType: data.stockType || 'Kraft Liner',
          jobSize: data.jobSize || '',
          receivingFrom: data.receivingFrom || '',
          isPrinted: Boolean(data.isPrinted),
          pressName: data.pressName || undefined,
          quantity: Number(data.quantity) || 0,
          jobId: data.jobId || undefined,
          jobName: data.jobName || undefined,
          jobType: data.jobType || undefined,
          orderedAt: data.orderedAt || new Date().toISOString(),
          status: data.status || 'Not Received',
          isUrgent: Boolean(data.isUrgent),
          notes: data.notes || '',
          category: data.category || 'Stock',
          unit: data.unit || undefined,
          dieMaker: data.dieMaker || undefined,
          punchType: data.punchType || undefined,
          photoUrl: data.photoUrl || undefined,
          pressPhotoUrl: data.pressPhotoUrl || undefined,
          receivedAt: data.receivedAt || undefined,
          isExistingStock: Boolean(data.isExistingStock),
          isUsed: Boolean(data.isUsed),
          usedAt: data.usedAt || undefined,
          usedJobId: data.usedJobId || undefined,
          usedJobName: data.usedJobName || undefined,
          usedJobDescription: data.usedJobDescription || undefined,
        });
      });

      if (firestoreItems.length > 0) {
        const finalInv = firestoreItems.sort((a, b) =>
          (b.orderedAt || '').localeCompare(a.orderedAt || '')
        );
        savePersistedInventory(finalInv);
        onUpdate(finalInv);
      } else {
        // If firestore has 0 inventory items currently, check if this device has local items to sync
        const localInv = getPersistedInventory();
        if (localInv.length > 0) {
          onUpdate(localInv);
          localInv.forEach((it) => {
            setDoc(doc(db, INVENTORY_COLLECTION, it.id), cleanFirestoreData(it), { merge: true }).catch((e) => {
              console.warn('Auto-sync inventory item failed:', it.id, e);
            });
          });
        } else {
          savePersistedInventory([]);
          onUpdate([]);
        }
      }
    },
    (err) => {
      const wrappedError = handleFirestoreError(err, OperationType.LIST, INVENTORY_COLLECTION);
      const persisted = getPersistedInventory();
      onUpdate(persisted);
      if (onError) onError(wrappedError);
    }
  );

  return unsubscribe;
}

export async function addInventoryItemsToFirestore(
  items: InventoryItem[],
  jobId?: string
): Promise<void> {
  // 1. Check if any added stock is ordered for an already-completed job: if so, mark it as used
  const currentJobs = getPersistedJobs();
  const completedJobsMap = new Map<string, CorrugationJob>();
  currentJobs.filter((j) => j.status === 'Completed').forEach((j) => {
    completedJobsMap.set(j.id, j);
    if (j.jobName) {
      completedJobsMap.set(j.jobName.trim().toLowerCase(), j);
    }
  });

  const processedItems: InventoryItem[] = items.map((it) => {
    const matchedJob =
      (it.jobId && completedJobsMap.get(it.jobId)) ||
      (it.jobName && completedJobsMap.get(it.jobName.trim().toLowerCase())) ||
      (jobId && completedJobsMap.get(jobId));

    if (matchedJob && !it.isUsed) {
      return {
        ...it,
        isUsed: true,
        status: 'Used' as const,
        usedAt: matchedJob.completedAt || formatReceivedTimestamp(),
        usedJobId: matchedJob.id,
        usedJobName: matchedJob.jobName,
        usedJobDescription: matchedJob.notes || matchedJob.jobType || 'Ordered for Completed Job',
      };
    }
    return it;
  });

  // 2. Immediately save inventory to local persistent storage
  const currentInv = getPersistedInventory();
  const updatedInv = [...processedItems, ...currentInv.filter((i) => !processedItems.some((n) => n.id === i.id))];
  savePersistedInventory(updatedInv);

  // If tied to a job, update job locally as well
  if (jobId) {
    const updatedJobs = currentJobs.map((j) =>
      j.id === jobId
        ? { ...j, hasInventory: true, inventoryCount: (j.inventoryCount || 0) + items.length }
        : j
    );
    savePersistedJobs(updatedJobs);
  }

  // 3. Sync to Firestore with cleanFirestoreData to prevent undefined property errors
  try {
    const batch = writeBatch(db);
    processedItems.forEach((item) => {
      const docRef = doc(db, INVENTORY_COLLECTION, item.id);
      batch.set(docRef, cleanFirestoreData(item), { merge: true });
    });

    if (jobId) {
      const jobRef = doc(db, JOBS_COLLECTION, jobId);
      batch.set(jobRef, {
        hasInventory: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    await batch.commit();
  } catch (err) {
    console.warn(`Firestore batch commit for inventory failed, retrying with individual setDoc:`, err);
    // Fallback: Individual setDoc
    for (const item of processedItems) {
      try {
        await setDoc(doc(db, INVENTORY_COLLECTION, item.id), cleanFirestoreData(item), { merge: true });
      } catch (e) {
        console.warn(`Individual setDoc failed for ${item.id}:`, e);
      }
    }
  }
}

export async function deleteInventoryItemFromFirestore(itemId: string): Promise<void> {
  // 1. Permanently mark as deleted in tombstone storage (NEVER resurrect on refresh)
  markInventoryAsDeleted(itemId);

  // 2. Remove immediately from local persistent storage
  const currentInv = getPersistedInventory();
  savePersistedInventory(currentInv.filter((i) => i.id !== itemId));

  // 3. Delete from Firestore
  const path = `${INVENTORY_COLLECTION}/${itemId}`;
  try {
    await deleteDoc(doc(db, INVENTORY_COLLECTION, itemId));
  } catch (err) {
    console.warn(`Firestore deleteDoc for inventory ${itemId} failed, but item is permanently deleted locally:`, err);
  }
}

export async function updateInventoryItemInFirestore(
  itemId: string,
  updates: Partial<InventoryItem>
): Promise<void> {
  // 1. Immediately update in local persistent storage
  const currentInv = getPersistedInventory();
  const updatedInv = currentInv.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
  savePersistedInventory(updatedInv);

  // 2. Sync to Firestore
  try {
    const payload: any = cleanFirestoreData({ ...updates, updatedAt: new Date().toISOString() });
    await setDoc(doc(db, INVENTORY_COLLECTION, itemId), payload, { merge: true });
  } catch (err) {
    console.warn(`Firestore setDoc for inventory ${itemId} failed, but saved locally:`, err);
  }
}

// ----------------------------------------------------
// 3. SETTINGS & DROPDOWNS (Job Types, Stock Types, Suppliers, Presses, Die Makers, Punch Types)
// ----------------------------------------------------

export function subscribeToFactorySettings(
  onUpdate: (settings: FactorySettings) => void,
  onError?: (err: Error) => void
): () => void {
  // 1. Immediately provide persisted settings from local storage
  const persistedSettings = getPersistedSettings();
  onUpdate(persistedSettings);

  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);

  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const rawJobTypes = Array.isArray(data.jobTypes) ? data.jobTypes : [];
        const cleanJobTypes = rawJobTypes.filter(
          (t: string) => !LEGACY_DEFAULT_JOB_TYPES.includes(t)
        );

        // Merge with local settings
        const local = getPersistedSettings();
        const mergedJobTypes = Array.from(new Set([...local.jobTypes, ...cleanJobTypes])).filter(
          (t) => !LEGACY_DEFAULT_JOB_TYPES.includes(t)
        );

        const newSettings: FactorySettings = {
          jobTypes: mergedJobTypes,
          stockTypes:
            Array.isArray(data.stockTypes) && data.stockTypes.length > 0
              ? data.stockTypes
              : local.stockTypes,
          suppliers:
            Array.isArray(data.suppliers) && data.suppliers.length > 0
              ? data.suppliers
              : local.suppliers,
          presses:
            Array.isArray(data.presses) && data.presses.length > 0
              ? data.presses
              : local.presses,
          dieMakers:
            Array.isArray(data.dieMakers) && data.dieMakers.length > 0
              ? data.dieMakers
              : local.dieMakers,
          punchTypes:
            Array.isArray(data.punchTypes) && data.punchTypes.length > 0
              ? data.punchTypes
              : local.punchTypes,
          printTypes:
            Array.isArray(data.printTypes) && data.printTypes.length > 0
              ? data.printTypes
              : local.printTypes,
        };

        savePersistedSettings(newSettings);
        onUpdate(newSettings);
      } else {
        const current = getPersistedSettings();
        onUpdate(current);
        setDoc(docRef, {
          jobTypes: current.jobTypes,
          stockTypes: current.stockTypes,
          suppliers: current.suppliers,
          presses: current.presses,
          dieMakers: current.dieMakers,
          punchTypes: current.punchTypes,
          printTypes: current.printTypes,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    },
    (err) => {
      const wrappedError = handleFirestoreError(err, OperationType.GET, `${SETTINGS_COLLECTION}/${SETTINGS_DOC}`);
      const persisted = getPersistedSettings();
      onUpdate(persisted);
      if (onError) onError(wrappedError);
    }
  );

  return unsubscribe;
}

export async function addCustomOptionToFirestore(
  category: keyof FactorySettings,
  newItem: string
): Promise<void> {
  const currentSettings = getPersistedSettings();
  if (!currentSettings[category].includes(newItem)) {
    const updatedList = [...currentSettings[category], newItem];
    const newSettings = {
      ...currentSettings,
      [category]: updatedList,
    };
    savePersistedSettings(newSettings);
  }

  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
  try {
    const snap = await getDoc(docRef);
    let currentData = currentSettings;

    if (snap.exists()) {
      const data = snap.data();
      const rawJobTypes = Array.isArray(data.jobTypes) ? data.jobTypes : [];
      currentData = {
        jobTypes: rawJobTypes.filter((t: string) => !LEGACY_DEFAULT_JOB_TYPES.includes(t)),
        stockTypes: data.stockTypes || INITIAL_STOCK_TYPES,
        suppliers: data.suppliers || COMMON_SUPPLIERS,
        presses: data.presses || INITIAL_PRESS_NAMES,
        dieMakers: data.dieMakers || INITIAL_DIE_MAKERS,
        punchTypes: data.punchTypes || INITIAL_PUNCH_TYPES,
        printTypes: data.printTypes || INITIAL_PRINT_TYPES,
      };
    }

    if (!currentData[category].includes(newItem)) {
      const updatedList = [...currentData[category], newItem];
      await setDoc(
        docRef,
        {
          ...currentData,
          [category]: updatedList,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn(`Firestore update for added option '${newItem}' in '${category}' failed, but saved locally:`, err);
  }
}

export async function deleteCustomOptionFromFirestore(
  category: keyof FactorySettings,
  itemToRemove: string
): Promise<void> {
  // 1. Immediately update in local persistent storage
  const currentSettings = getPersistedSettings();
  const updatedList = (currentSettings[category] || []).filter((item) => item !== itemToRemove);
  const newSettings = {
    ...currentSettings,
    [category]: updatedList,
  };
  savePersistedSettings(newSettings);

  // 2. Sync to Firestore
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentList: string[] = Array.isArray(data[category]) ? data[category] : [];
      const remoteUpdated = currentList.filter((item) => item !== itemToRemove);
      await setDoc(
        docRef,
        {
          [category]: remoteUpdated,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn(`Firestore update for deleted option '${itemToRemove}' in '${category}' failed, but deleted locally:`, err);
  }
}

// ----------------------------------------------------
// 4. DAYBOOK PURPOSES (MULTI-DEVICE FIRESTORE SYNC & PERSISTENCE)
// ----------------------------------------------------
// User requested: Start fresh with NO existing/hardcoded options. Users type & save their own purposes.
export const DEFAULT_DAYBOOK_PURPOSES: string[] = [];

export const LEGACY_DEFAULT_DAYBOOK_PURPOSES: string[] = [
  'Office Tea & Snacks',
  'Factory Cleaning & Maintenance',
  'Electricity & Utility Bill',
  'Office Stationery & Printing',
  'Staff Advance & Salary',
  'Transport & Freight Charges',
  'Machine Repair & Spares',
  'Client Refreshments',
  'Fuel & Generator Diesel',
  'Packaging Tape & Strapping',
  'Bank Charges & Processing Fee',
  'Miscellaneous Plant Expense',
  'Customer Payment Receipt',
  'Sales Invoice Collection',
];

const DAYBOOK_PURPOSES_DOC = 'daybook_purposes';
const MG_DAYBOOK_PURPOSES_KEY = 'mg_daybook_saved_purposes';

export function getPersistedDaybookPurposes(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MG_DAYBOOK_PURPOSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out legacy hardcoded defaults
    return parsed.filter(
      (p: string) => typeof p === 'string' && p.trim() && !LEGACY_DEFAULT_DAYBOOK_PURPOSES.includes(p.trim())
    );
  } catch {
    return [];
  }
}

export function savePersistedDaybookPurposes(purposes: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = purposes.filter(
      (p) => typeof p === 'string' && p.trim() && !LEGACY_DEFAULT_DAYBOOK_PURPOSES.includes(p.trim())
    );
    localStorage.setItem(MG_DAYBOOK_PURPOSES_KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn('Error saving persisted daybook purposes:', e);
  }
}

export function subscribeToDaybookPurposes(
  onUpdate: (purposes: string[]) => void
): () => void {
  const initial = getPersistedDaybookPurposes();
  onUpdate(initial);

  const docRef = doc(db, SETTINGS_COLLECTION, DAYBOOK_PURPOSES_DOC);
  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.purposes)) {
          const clean = data.purposes.filter(
            (p: string) => typeof p === 'string' && p.trim() && !LEGACY_DEFAULT_DAYBOOK_PURPOSES.includes(p.trim())
          );
          savePersistedDaybookPurposes(clean);
          onUpdate(clean);
          return;
        }
      }
      const current = getPersistedDaybookPurposes();
      onUpdate(current);
      setDoc(docRef, { purposes: current, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    },
    (err) => {
      console.warn('Daybook purposes listener warning:', err);
      onUpdate(getPersistedDaybookPurposes());
    }
  );

  return unsubscribe;
}

export async function addDaybookPurposeToFirestore(newPurpose: string): Promise<void> {
  const trimmed = newPurpose.trim();
  if (!trimmed) return;
  const current = getPersistedDaybookPurposes();
  if (current.some((p) => p.toLowerCase() === trimmed.toLowerCase())) return;

  const updated = [...current, trimmed];
  savePersistedDaybookPurposes(updated);

  const docRef = doc(db, SETTINGS_COLLECTION, DAYBOOK_PURPOSES_DOC);
  try {
    await setDoc(docRef, { purposes: updated, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Failed to save daybook purpose to Firestore:', err);
  }
}

export async function deleteDaybookPurposeFromFirestore(purposeToDelete: string): Promise<void> {
  const current = getPersistedDaybookPurposes();
  const updated = current.filter((p) => p.toLowerCase() !== purposeToDelete.toLowerCase());
  savePersistedDaybookPurposes(updated);

  const docRef = doc(db, SETTINGS_COLLECTION, DAYBOOK_PURPOSES_DOC);
  try {
    await setDoc(docRef, { purposes: updated, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Failed to delete daybook purpose from Firestore:', err);
  }
}

// ----------------------------------------------------
// 5. JOB PROCESS PRESETS (MULTI-DEVICE FIRESTORE SYNC & PERSISTENCE)
// ----------------------------------------------------
// User requested: Start fresh with NO existing process suggestions. Users type & save first, then select.
export const DEFAULT_JOB_PROCESSES: string[] = [];

export const LEGACY_DEFAULT_JOB_PROCESSES: string[] = [
  'Paper Reel Splicing & Loading',
  'Corrugation / Fluting (Single / Double Wall)',
  'Corrugation / Fluting',
  'Sheet Slitting & Scoring',
  'Flexo Printing & Inking',
  'Die Cutting & Creasing',
  'Rotary Slotting & Punching',
  'Folder Gluer / Side Pasting',
  'Wire Stitching & Binding',
  'Quality Inspection & Burst Testing',
  'Bundling & Strapping',
  'Bundling & Dispatch',
  'Palletization & Shrink Wrapping',
  'Dispatch & Logistics',
];

const JOB_PROCESSES_DOC = 'job_processes';
const MG_JOB_PROCESSES_KEY = 'mg_saved_job_processes';

export function getPersistedJobProcesses(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MG_JOB_PROCESSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p: string) => typeof p === 'string' && p.trim() && !LEGACY_DEFAULT_JOB_PROCESSES.includes(p.trim())
    );
  } catch {
    return [];
  }
}

export function savePersistedJobProcesses(processes: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = processes.filter(
      (p) => typeof p === 'string' && p.trim() && !LEGACY_DEFAULT_JOB_PROCESSES.includes(p.trim())
    );
    localStorage.setItem(MG_JOB_PROCESSES_KEY, JSON.stringify(clean));
  } catch (e) {
    console.warn('Error saving persisted job processes:', e);
  }
}

export function subscribeToJobProcesses(
  onUpdate: (processes: string[]) => void
): () => void {
  const initial = getPersistedJobProcesses();
  onUpdate(initial);

  const docRef = doc(db, SETTINGS_COLLECTION, JOB_PROCESSES_DOC);
  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.processes)) {
          const clean = data.processes.filter(
            (p: string) => typeof p === 'string' && p.trim() && !LEGACY_DEFAULT_JOB_PROCESSES.includes(p.trim())
          );
          savePersistedJobProcesses(clean);
          onUpdate(clean);
          return;
        }
      }
      const current = getPersistedJobProcesses();
      onUpdate(current);
      setDoc(docRef, { processes: current, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    },
    (err) => {
      console.warn('Job processes listener warning:', err);
      onUpdate(getPersistedJobProcesses());
    }
  );

  return unsubscribe;
}

export async function addJobProcessToFirestore(newProcess: string): Promise<void> {
  const trimmed = newProcess.trim();
  if (!trimmed) return;
  const current = getPersistedJobProcesses();
  if (current.some((p) => p.toLowerCase() === trimmed.toLowerCase())) return;

  const updated = [...current, trimmed];
  savePersistedJobProcesses(updated);

  const docRef = doc(db, SETTINGS_COLLECTION, JOB_PROCESSES_DOC);
  try {
    await setDoc(docRef, { processes: updated, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Failed to save job process to Firestore:', err);
  }
}

export async function deleteJobProcessFromFirestore(processToDelete: string): Promise<void> {
  const current = getPersistedJobProcesses();
  const updated = current.filter((p) => p.toLowerCase() !== processToDelete.toLowerCase());
  savePersistedJobProcesses(updated);

  const docRef = doc(db, SETTINGS_COLLECTION, JOB_PROCESSES_DOC);
  try {
    await setDoc(docRef, { processes: updated, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Failed to delete job process from Firestore:', err);
  }
}

export async function syncLocalJobsAndInventoryToFirestore(): Promise<void> {
  try {
    const localJobs = getPersistedJobs();
    if (localJobs.length > 0) {
      for (const job of localJobs) {
        try {
          const docRef = doc(db, JOBS_COLLECTION, job.id);
          const snap = await getDoc(docRef);
          if (!snap.exists()) {
            await setDoc(docRef, cleanFirestoreData(job), { merge: true });
          }
        } catch (e) {
          console.warn('Sync job to firestore failed:', job.id, e);
        }
      }
    }

    const localInv = getPersistedInventory();
    if (localInv.length > 0) {
      for (const item of localInv) {
        try {
          const docRef = doc(db, INVENTORY_COLLECTION, item.id);
          const snap = await getDoc(docRef);
          if (!snap.exists()) {
            await setDoc(docRef, cleanFirestoreData(item), { merge: true });
          }
        } catch (e) {
          console.warn('Sync inventory to firestore failed:', item.id, e);
        }
      }
    }
  } catch (err) {
    console.warn('syncLocalJobsAndInventoryToFirestore error:', err);
  }
}

// ----------------------------------------------------
// 6. QUOTATIONS (MULTI-DEVICE FIRESTORE SYNC & PERSISTENCE)
// ----------------------------------------------------
export const QUOTATIONS_COLLECTION = 'quotations';
const MG_QUOTATIONS_STORAGE_KEY = 'mg_quotations_cache';

export function getPersistedQuotations(): Quotation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MG_QUOTATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error reading persisted quotations:', e);
    return [];
  }
}

export function savePersistedQuotations(quotations: Quotation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MG_QUOTATIONS_STORAGE_KEY, JSON.stringify(quotations));
  } catch (e) {
    console.warn('Error saving persisted quotations:', e);
  }
}

export function subscribeToQuotations(
  onUpdate: (quotations: Quotation[]) => void,
  onError?: (err: any) => void
): () => void {
  // Immediately serve cached
  const initial = getPersistedQuotations();
  onUpdate(initial);

  const colRef = collection(db, QUOTATIONS_COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: Quotation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          refNo: data.refNo || '',
          date: data.date || '',
          customerName: data.customerName || '',
          cityState: data.cityState || '',
          items: Array.isArray(data.items) ? data.items : [],
          notes: Array.isArray(data.notes) ? data.notes : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || undefined,
        });
      });
      savePersistedQuotations(list);
      onUpdate(list);
    },
    (err) => {
      console.warn('Quotations listener warning:', err);
      if (onError) onError(err);
      onUpdate(getPersistedQuotations());
    }
  );

  return unsubscribe;
}

export async function addQuotationToFirestore(quotation: Quotation): Promise<void> {
  const current = getPersistedQuotations();
  const updated = [quotation, ...current.filter((q) => q.id !== quotation.id)];
  savePersistedQuotations(updated);

  const docRef = doc(db, QUOTATIONS_COLLECTION, quotation.id);
  await setDoc(docRef, cleanFirestoreData(quotation), { merge: true });
}

export async function updateQuotationInFirestore(
  id: string,
  updates: Partial<Quotation>
): Promise<void> {
  const current = getPersistedQuotations();
  const updated = current.map((q) => (q.id === id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q));
  savePersistedQuotations(updated);

  const docRef = doc(db, QUOTATIONS_COLLECTION, id);
  await updateDoc(docRef, cleanFirestoreData({ ...updates, updatedAt: new Date().toISOString() }));
}

export async function deleteQuotationFromFirestore(id: string): Promise<void> {
  const current = getPersistedQuotations();
  const updated = current.filter((q) => q.id !== id);
  savePersistedQuotations(updated);

  const docRef = doc(db, QUOTATIONS_COLLECTION, id);
  await deleteDoc(docRef);
}


