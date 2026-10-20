export type JobPlacement = 'Factory' | 'Office';
export type JobStatus = 'Pending' | 'Not Completed' | 'Completed';

export interface CorrugationJob {
  id: string;
  jobName: string;
  jobType: string;
  jobPlacement: JobPlacement;
  createdAt: string;
  status: JobStatus;
  notes?: string;
  hasInventory?: boolean;
  inventoryCount?: number;
  inventoryOrderId?: string;
  // Press / Machine specifics
  boardSize?: string;
  jobSize?: string;
  pressName?: string;
  isUrgent?: boolean;
  pressStatus?: 'Pending' | 'Completed';
  isPrinted?: boolean;
  pressPhotoUrl?: string; // Optional photo of press print / run setup
  processes?: JobProcessStep[]; // Sequence of manufacturing process steps
  completedAt?: string; // Timestamp when job was marked completed
  pressCompletedAt?: string; // Timestamp when press run was marked completed
}

export interface JobProcessStep {
  id: string;
  name: string;
  completed: boolean;
  completedDate?: string; // YYYY-MM-DD
  notes?: string;
  sequence?: number;
}

export interface InventoryItem {
  id: string;
  stockType: string;
  jobSize: string;
  receivingFrom: string;
  isPrinted: boolean;
  pressName?: string;
  quantity: number;
  unit?: string; // 'KGs' | 'Sheets' | 'Units'
  jobId?: string;
  jobName?: string;
  jobType?: string;
  orderedAt: string;
  status: 'Received' | 'Not Received' | 'In Transit' | 'Used';
  isUrgent?: boolean;
  notes?: string;
  category?: 'Stock' | 'Die' | 'Reel';
  dieMaker?: string;
  punchType?: string;
  photoUrl?: string; // Optional photo for die tooling or stock
  pressPhotoUrl?: string; // Optional photo of press run / proof
  receivedAt?: string; // Exact timestamp (date & time) when marked as Received
  isExistingStock?: boolean; // Whether ordered from existing factory in-house stock
  isUsed?: boolean; // Whether stock has been consumed/used
  usedAt?: string; // Exact timestamp when stock was marked as used
  usedJobId?: string; // Linked job ID
  usedJobName?: string; // Job Name stock was consumed for
  usedJobType?: string; // Job Type stock was consumed for
  usedJobDescription?: string; // Job description / notes on stock consumption
}

export const formatReceivedTimestamp = (date: Date = new Date()): string => {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export interface StockItemEntry {
  id: string;
  stockType: string;
  jobSize: string;
  receivingFrom: string;
  isPrinted: boolean;
  pressName?: string;
  quantity: number;
  unit?: string;
  notes?: string;
  category?: 'Stock' | 'Die' | 'Reel';
  dieMaker?: string;
  punchType?: string;
  jobId?: string;
  jobName?: string;
  jobType?: string;
  orderedAt?: string;
  status?: 'Received' | 'Not Received' | 'In Transit' | 'Used';
  isUrgent?: boolean;
  photoUrl?: string;
  pressPhotoUrl?: string;
  receivedAt?: string;
  isExistingStock?: boolean;
  isUsed?: boolean;
  usedAt?: string;
  usedJobId?: string;
  usedJobName?: string;
  usedJobType?: string;
  usedJobDescription?: string;
}

export const INITIAL_JOB_TYPES: string[] = [];

export const INITIAL_STOCK_TYPES: string[] = [
  'Kraft Liner 180 GSM',
  'Kraft Liner 250 GSM (Heavy Duty)',
  'Semi-Chemical Fluting Medium 140 GSM',
  'Recycled Fluting 120 GSM',
  'White Top Testliner 200 GSM',
  'Duplex Board Grey Back 300 GSM',
  'Bleached Kraft Liner 175 GSM',
  'Testliner Grade 2 (TL2) 150 GSM',
  'Water-Resistant High-Bulk Medium 160 GSM',
  'Virgin Scandinavian Fluting 150 GSM',
];

export const COMMON_SUPPLIERS: string[] = [
  'International Paper Mills',
  'WestRock Packaging & Paper',
  'Smurfit Kappa Paper Reels',
  'Mondi Pulp & Paper',
  'Billerud Fluting Supplies',
  'Sappi Fine & Kraft Papers',
  'Plant Raw Materials Bay 01',
  'Regional Central Depot',
];

export const INITIAL_PRESS_NAMES: string[] = [
  'Flexo Press 1 (4-Color)',
  'Bobst FFG 8.20 Expertline',
  'DongFang Apstar 1628',
  'Heidelberg Speedmaster',
  'Rotary Die Press B',
  'Curioni 2800 2-Color Printer',
  'Martin Transline Flexo Slotter',
];

export const INITIAL_DIE_MAKERS: string[] = [
  'Apex Laser Dies',
  'Matrix Tooling Works',
  'Standard Punch & Die Co.',
  'Precision Rotary Dies',
  'National Steel Rule Dies',
];

export const INITIAL_PUNCH_TYPES: string[] = [
  'Rotary Die Punch',
  'Flatbed Cutting Die',
  'Creasing & Scoring Die',
  'Stripping Die Tool',
  'Embossing Punch',
  'Slotting & Perforation Die',
];

