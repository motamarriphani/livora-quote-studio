import type { Id } from '../../../convex/_generated/dataModel';

export type QuoteId = Id<'quotes'>;
export type ClientId = Id<'clients'>;

export type Item = {
  id: string;
  name: string;
  w?: number | null;
  h?: number | null;
  rate: number;
  lump?: boolean;
};

export type Section = { id: string; name: string; items: Item[]; collapsed?: boolean };
export type Spec = { c: string; d: string };
export type Customer = { name: string; phone: string; address: string };

/** What the user sets. "Expired" is never stored — it's derived from date + validity. */
export type Status = 'draft' | 'sent' | 'accepted' | 'declined';
export const STATUSES: Status[] = ['draft', 'sent', 'accepted', 'declined'];

export type Quote = {
  id: QuoteId | null; // null until the first cloud save
  version: number;
  quoteNo: string; // '' until the server issues LQ-YYYY-NNN
  date: string; // YYYY-MM-DD
  customer: Customer;
  clientId: ClientId | null;
  sections: Section[];
  finalCharge: number; // agreed subtotal before GST; 0 = no discount
  gst: number;
  validityDays: number;
  timeline: string;
  terms: string[];
  spec: Spec[];
  showDims: boolean;
  showSpec: boolean;
  status: Status;
};

export type CatalogItem = { id: string; name: string; rate: number; w?: number | null; h?: number | null; cat?: string };
export type CatalogService = { id: string; name: string; rate: number; cat?: string };
export type Catalog = { items: CatalogItem[]; services: CatalogService[]; materials: Spec[]; terms: string[] };
