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
}

export interface InventoryItem {
  id: string;
  stockType: string;
  jobSize: string;
  receivingFrom: string;
  isPrinted: boolean;
  pressName?: string;
  quantity: number;
  jobId?: string;
  jobName?: string;
  jobType?: string;
  orderedAt: string;
  status: 'Received' | 'Not Received' | 'In Transit';
  isUrgent?: boolean;
  notes?: string;
  category?: 'Stock' | 'Die';
  dieMaker?: string;
  punchType?: string;
}

export interface StockItemEntry {
  id: string;
  stockType: string;
  jobSize: string;
  receivingFrom: string;
  isPrinted: boolean;
  pressName?: string;
  quantity: number;
  notes?: string;
  category?: 'Stock' | 'Die';
  dieMaker?: string;
  punchType?: string;
  jobId?: string;
  jobName?: string;
  jobType?: string;
  orderedAt?: string;
  status?: 'Received' | 'Not Received' | 'In Transit';
  isUrgent?: boolean;
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

