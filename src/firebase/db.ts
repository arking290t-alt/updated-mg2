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
  INITIAL_JOB_TYPES, 
  INITIAL_STOCK_TYPES, 
  COMMON_SUPPLIERS, 
  INITIAL_PRESS_NAMES 
} from '../types/job';

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
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
}

export interface FactorySettings {
  jobTypes: string[];
  stockTypes: string[];
  suppliers: string[];
  presses: string[];
}

const JOBS_COLLECTION = 'jobs';
const INVENTORY_COLLECTION = 'inventory';
const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC = 'factory_dropdowns';

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
// 1. JOBS OPERATIONS
// ----------------------------------------------------

export function subscribeToJobs(
  onUpdate: (jobs: CorrugationJob[]) => void,
  onError?: (err: Error) => void
): () => void {
  const jobsRef = collection(db, JOBS_COLLECTION);
  const q = query(jobsRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: CorrugationJob[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
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
        });
      });
      onUpdate(items);
    },
    (err) => {
      const wrappedError = handleFirestoreError(err, OperationType.LIST, JOBS_COLLECTION);
      if (onError) onError(wrappedError);
    }
  );

  return unsubscribe;
}

export async function addJobToFirestore(job: CorrugationJob): Promise<void> {
  const path = `${JOBS_COLLECTION}/${job.id}`;
  try {
    await setDoc(doc(db, JOBS_COLLECTION, job.id), {
      jobName: job.jobName,
      jobType: job.jobType,
      jobPlacement: job.jobPlacement,
      createdAt: job.createdAt,
      status: job.status,
      notes: job.notes || '',
      hasInventory: Boolean(job.hasInventory),
      inventoryCount: job.inventoryCount || 0,
      inventoryOrderId: job.inventoryOrderId || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    throw handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateJobStatusInFirestore(jobId: string, status: JobStatus): Promise<void> {
  const path = `${JOBS_COLLECTION}/${jobId}`;
  try {
    await updateDoc(doc(db, JOBS_COLLECTION, jobId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    throw handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateJobInventoryFlagInFirestore(
  jobId: string, 
  hasInventory: boolean, 
  addedCount: number
): Promise<void> {
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
    throw handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteJobFromFirestore(jobId: string): Promise<void> {
  const path = `${JOBS_COLLECTION}/${jobId}`;
  try {
    await deleteDoc(doc(db, JOBS_COLLECTION, jobId));
  } catch (err) {
    throw handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// 2. INVENTORY OPERATIONS
// ----------------------------------------------------

export function subscribeToInventory(
  onUpdate: (inventory: InventoryItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const invRef = collection(db, INVENTORY_COLLECTION);
  const q = query(invRef, orderBy('orderedAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          stockType: data.stockType || 'Kraft Liner',
          jobSize: data.jobSize || '',
          receivingFrom: data.receivingFrom || '',
          isPrinted: Boolean(data.isPrinted),
          pressName: data.pressName || undefined,
          quantity: Number(data.quantity) || 0,
          jobId: data.jobId || undefined,
          jobName: data.jobName || undefined,
          orderedAt: data.orderedAt || new Date().toISOString(),
          status: data.status || 'Received',
          notes: data.notes || '',
        });
      });
      onUpdate(items);
    },
    (err) => {
      const wrappedError = handleFirestoreError(err, OperationType.LIST, INVENTORY_COLLECTION);
      if (onError) onError(wrappedError);
    }
  );

  return unsubscribe;
}

export async function addInventoryItemsToFirestore(
  items: InventoryItem[],
  targetJobId?: string
): Promise<void> {
  try {
    const batch = writeBatch(db);

    items.forEach((item) => {
      const itemRef = doc(db, INVENTORY_COLLECTION, item.id);
      batch.set(itemRef, {
        stockType: item.stockType,
        jobSize: item.jobSize,
        receivingFrom: item.receivingFrom,
        isPrinted: Boolean(item.isPrinted),
        pressName: item.pressName || '',
        quantity: item.quantity,
        jobId: item.jobId || '',
        jobName: item.jobName || '',
        orderedAt: item.orderedAt,
        status: item.status,
        notes: item.notes || '',
      });
    });

    if (targetJobId) {
      const jobRef = doc(db, JOBS_COLLECTION, targetJobId);
      batch.update(jobRef, {
        hasInventory: true,
        updatedAt: new Date().toISOString(),
      });
    }

    await batch.commit();
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, INVENTORY_COLLECTION);
  }
}

export async function deleteInventoryItemFromFirestore(itemId: string): Promise<void> {
  const path = `${INVENTORY_COLLECTION}/${itemId}`;
  try {
    await deleteDoc(doc(db, INVENTORY_COLLECTION, itemId));
  } catch (err) {
    throw handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ----------------------------------------------------
// 3. SETTINGS & DROPDOWNS (Job Types, Stock Types, Suppliers, Presses)
// ----------------------------------------------------

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

export function subscribeToFactorySettings(
  onUpdate: (settings: FactorySettings) => void,
  onError?: (err: Error) => void
): () => void {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);

  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const rawJobTypes = Array.isArray(data.jobTypes) ? data.jobTypes : [];
        // Only show what user adds - purge old default 14 items
        const cleanJobTypes = rawJobTypes.filter((t: string) => !LEGACY_DEFAULT_JOB_TYPES.includes(t));
        
        if (rawJobTypes.length !== cleanJobTypes.length) {
          setDoc(docRef, { jobTypes: cleanJobTypes }, { merge: true }).catch(() => {});
        }

        onUpdate({
          jobTypes: cleanJobTypes,
          stockTypes: Array.isArray(data.stockTypes) && data.stockTypes.length > 0 ? data.stockTypes : INITIAL_STOCK_TYPES,
          suppliers: Array.isArray(data.suppliers) && data.suppliers.length > 0 ? data.suppliers : COMMON_SUPPLIERS,
          presses: Array.isArray(data.presses) && data.presses.length > 0 ? data.presses : INITIAL_PRESS_NAMES,
        });
      } else {
        // Document does not exist yet; jobTypes starts at 0
        onUpdate({
          jobTypes: [],
          stockTypes: INITIAL_STOCK_TYPES,
          suppliers: COMMON_SUPPLIERS,
          presses: INITIAL_PRESS_NAMES,
        });
        setDoc(docRef, {
          jobTypes: [],
          stockTypes: INITIAL_STOCK_TYPES,
          suppliers: COMMON_SUPPLIERS,
          presses: INITIAL_PRESS_NAMES,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    },
    (err) => {
      const wrappedError = handleFirestoreError(err, OperationType.GET, `${SETTINGS_COLLECTION}/${SETTINGS_DOC}`);
      if (onError) onError(wrappedError);
    }
  );

  return unsubscribe;
}

export async function addCustomOptionToFirestore(
  category: keyof FactorySettings,
  newItem: string
): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
  try {
    const snap = await getDoc(docRef);
    let currentData: FactorySettings = {
      jobTypes: [],
      stockTypes: INITIAL_STOCK_TYPES,
      suppliers: COMMON_SUPPLIERS,
      presses: INITIAL_PRESS_NAMES,
    };

    if (snap.exists()) {
      const data = snap.data();
      const rawJobTypes = Array.isArray(data.jobTypes) ? data.jobTypes : [];
      currentData = {
        jobTypes: rawJobTypes.filter((t: string) => !LEGACY_DEFAULT_JOB_TYPES.includes(t)),
        stockTypes: data.stockTypes || INITIAL_STOCK_TYPES,
        suppliers: data.suppliers || COMMON_SUPPLIERS,
        presses: data.presses || INITIAL_PRESS_NAMES,
      };
    }

    if (!currentData[category].includes(newItem)) {
      const updatedList = [...currentData[category], newItem];
      await setDoc(docRef, {
        ...currentData,
        [category]: updatedList,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COLLECTION}/${SETTINGS_DOC}`);
  }
}

export async function deleteCustomOptionFromFirestore(
  category: keyof FactorySettings,
  itemToRemove: string
): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const currentList: string[] = Array.isArray(data[category]) ? data[category] : [];
      const updatedList = currentList.filter((item) => item !== itemToRemove);
      await setDoc(docRef, {
        [category]: updatedList,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    throw handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COLLECTION}/${SETTINGS_DOC}`);
  }
}

// ----------------------------------------------------
// 4. SEED INITIAL DATA IF FIRESTORE IS EMPTY
// ----------------------------------------------------
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const jobsSnap = await getDocs(collection(db, JOBS_COLLECTION));
    if (jobsSnap.empty) {
      console.log('Seeding initial corrugation jobs to Firestore...');
      const batch = writeBatch(db);
      
      const seedJobs: CorrugationJob[] = [
        {
          id: 'job-1',
          jobName: 'Single Face Fluting E-Flute Run #401',
          jobType: 'Single Facer Fluting',
          jobPlacement: 'Factory',
          createdAt: '2026-10-10 08:30',
          status: 'Pending',
          hasInventory: false,
          notes: 'Target speed 180 m/min, 120 GSM fluting medium.',
        },
        {
          id: 'job-2',
          jobName: '5-Ply Master Heavy Shipping Boxes (Export Grade)',
          jobType: 'Flexo Printing & Slotting',
          jobPlacement: 'Factory',
          createdAt: '2026-10-10 09:15',
          status: 'Not Completed',
          hasInventory: true,
          notes: 'Double wall BC-flute, 4-color company brand print.',
        },
      ];

      seedJobs.forEach((job) => {
        batch.set(doc(db, JOBS_COLLECTION, job.id), {
          ...job,
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();
    }

    const invSnap = await getDocs(collection(db, INVENTORY_COLLECTION));
    if (invSnap.empty) {
      console.log('Seeding initial corrugation inventory lots to Firestore...');
      const batch = writeBatch(db);

      const seedInventory: InventoryItem[] = [
        {
          id: 'inv-1',
          stockType: 'Kraft Liner 180 GSM',
          jobSize: '1200 x 850 mm',
          receivingFrom: 'International Paper Mills',
          isPrinted: true,
          pressName: 'Flexo Press 1 (4-Color)',
          quantity: 5000,
          jobId: 'job-2',
          jobName: '5-Ply Master Heavy Shipping Boxes (Export Grade)',
          orderedAt: '2026-10-10 09:30',
          status: 'Received',
          notes: 'High burst strength lot',
        },
        {
          id: 'inv-2',
          stockType: 'Semi-Chemical Fluting Medium 140 GSM',
          jobSize: 'Deckle 1600mm x Cut 950mm',
          receivingFrom: 'WestRock Packaging & Paper',
          isPrinted: false,
          quantity: 8500,
          orderedAt: '2026-10-09 14:00',
          status: 'Received',
          notes: 'Virgin fiber fluting for C-flute run',
        },
      ];

      seedInventory.forEach((inv) => {
        batch.set(doc(db, INVENTORY_COLLECTION, inv.id), inv);
      });

      await batch.commit();
    }
  } catch (error) {
    console.warn('Initial seeding skipped or encountered error (e.g. offline/rules):', error);
  }
}
