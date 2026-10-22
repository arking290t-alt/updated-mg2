export interface QuotationItem {
  id: string;
  particular: string;
  quantity: string;
  rate: string;
}

export interface Quotation {
  id: string;
  refNo?: string;
  date: string; // ISO date string YYYY-MM-DD or formatted DD.MM.YYYY
  customerName: string; // e.g. "kids world"
  cityState: string; // e.g. "CHENNAI"
  items: QuotationItem[];
  notes: string[]; // Editable bullet points for "Please Note"
  createdAt: string;
  updatedAt?: string;
}

export const DEFAULT_QUOTATION_NOTES = [
  'Quotation Validation Period 10 days only',
  'GST and delivery as applicable',
  'Mention Quantity will be in +/- of upto 1000pcs in each size',
  'MINIMUM 15 WORKING DAYS TO PROCESS THIS WORK ORDER',
];
