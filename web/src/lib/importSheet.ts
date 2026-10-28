// Turns spreadsheet rows (from our template or any sheet) into a draft quote.
// Pure: no Excel library here — lib/excel.ts reads the file into `Cell[][]`.
import type { Catalog, Customer, Item, Quote, Section, Spec } from './types';
import { quoteTotal } from './math';
import { todayStr, uid } from './format';

export type Cell = string | number | Date | null;
export type SheetData = { name: string; rows: Cell[][] };

/** Terms / specification that came from the workbook (null = keep the catalog defaults). */
export type Extras = { terms: string[] | null; spec: Spec[] | null };

const TERMS_SHEET = /^(terms|t ?& ?c|conditions)/i;
const SPEC_SHEET = /^(spec|material)/i;
const RATE_SHEET = /^rate ?card$/i;

/**
 * Separates a workbook into item sheets ("Quote" first) and the Terms /
 * Specification sheets. Empty Terms or Specification sheets count as absent.
 */
export function splitWorkbook(sheets: SheetData[]): { itemSheets: SheetData[] } & Extras {
  const terms = sheets.find((s) => TERMS_SHEET.test(s.name.trim()));
  const spec = sheets.find((s) => SPEC_SHEET.test(s.name.trim()));
  const itemSheets = sheets
    .filter((s) => s !== terms && s !== spec && !RATE_SHEET.test(s.name.trim()))
    .sort((a, b) => Number(b.name === 'Quote') - Number(a.name === 'Quote'));
  const termList = terms?.rows
    .map((r) => cellText(r[0] ?? null).replace(/^\(?\d{1,2}[.)]\s*/, '').trim())
    .filter((t, i) => t && !(i === 0 && TERMS_SHEET.test(t))) ?? [];
  const specList = spec?.rows
    .map((r) => ({ c: cellText(r[0] ?? null), d: cellText(r[1] ?? null) }))
    .filter((s, i) => (s.c || s.d) && !(i === 0 && /^category$/i.test(s.c))) ?? [];
  return { itemSheets, terms: termList.length ? termList : null, spec: specList.length ? specList : null };
}
export type Role = 'room' | 'item' | 'w' | 'h' | 'rate' | 'ignore';
export const ROLES: { role: Role; label: string }[] = [
  { role: 'room', label: 'Room' },
  { role: 'item', label: 'Item' },
  { role: 'w', label: 'Width' },
  { role: 'h', label: 'Height' },
  { role: 'rate', label: 'Rate' },
  { role: 'ignore', label: 'Ignore' },
];

/** Header words → role. First match on the header's first word(s) wins. */
const HEADER_WORDS: [RegExp, Role][] = [
  [/^(room|area|space|location|section|zone)\b/, 'room'],
  [/^(item|description|particulars?|work|product)\b/, 'item'],
  [/^(width|w|length|l)\b/, 'w'],
  [/^(height|h)\b/, 'h'],
  [/^(rate|price|unit rate|cost)\b/, 'rate'],
];

/** Labels of the details block above the item table (our template's column A). */
const DETAIL_WORDS: [RegExp, keyof Details][] = [
  [/^(customer|client)( name)?$|^name$/, 'name'],
  [/^(phone|mobile|contact)/, 'phone'],
  [/^(address|site)/, 'address'],
  [/^(quote )?date$/, 'date'],
  [/^valid/, 'validityDays'],
  [/^timeline/, 'timeline'],
  [/^agreed( subtotal)?|^final( price| amount)?$/, 'finalCharge'],
  [/^gst/, 'gst'],
];
type Details = { name: string; phone: string; address: string; date: string; validityDays: number; timeline: string; finalCharge: number; gst: number };

const norm = (v: Cell) => (v == null ? '' : v instanceof Date ? '' : String(v)).trim().toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
export const cellText = (v: Cell) => (v == null ? '' : v instanceof Date ? isoDate(v) : String(v).trim());

export function parseNum(v: Cell): number | null {
  if (v == null || v instanceof Date) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = v.replace(/[₹,\s]|rs\.?/gi, '');
  if (!s || /^[-–—]+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isoDate(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Excel date cell, Excel serial number, or DD-MM-YYYY / DD/MM/YYYY text → YYYY-MM-DD. */
export function parseDate(v: Cell): string | null {
  if (v instanceof Date) return isoDate(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) return isoDate(new Date(Date.UTC(1899, 11, 30) + v * 86400000));
  const m = typeof v === 'string' && v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function roleOf(header: Cell): Role | null {
  const h = norm(header);
  if (!h) return null;
  for (const [re, role] of HEADER_WORDS) if (re.test(h)) return role;
  return null;
}

/** The header row is the first row naming an item column plus at least one more known column. */
export function detectColumns(rows: Cell[][]): { headerRow: number; roles: Role[] } {
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const found = rows[r].map(roleOf);
    if (found.includes('item') && found.filter(Boolean).length >= 2) {
      const seen = new Set<Role>();
      const roles = found.map((x) => {
        if (!x || seen.has(x)) return 'ignore' as Role;
        seen.add(x);
        return x;
      });
      return { headerRow: r, roles };
    }
  }
  const width = Math.max(0, ...rows.map((r) => r.length));
  return { headerRow: -1, roles: Array<Role>(width).fill('ignore') };
}

export type RowResult = {
  row: number; // 1-based, as the spreadsheet shows it
  status: 'ok' | 'filled' | 'skipped' | 'ignored';
  note?: string;
  room?: string;
  name?: string;
  item?: Item;
};

/** What the builder shows about a quote that was just imported. */
export type ImportInfo = { file: string; items: number; filled: number; terms?: number; spec?: number; skipped: { row: number; name?: string; note?: string }[] };

export type ImportResult = {
  quote: Quote;
  rows: RowResult[];
  /** Notes to show on items in the builder, by item id. */
  flags: Record<string, string>;
  skipped: number;
  filled: number;
};

const TOTAL_ROW = /^(sub ?total|grand total|total|net total)\b/i;

export function buildImport(rows: Cell[][], roles: Role[], headerRow: number, catalog: Catalog | null | undefined, base: Quote, extras?: Extras): ImportResult {
  const col = (role: Role) => roles.indexOf(role);
  const [cRoom, cItem, cW, cH, cRate] = (['room', 'item', 'w', 'h', 'rate'] as Role[]).map(col);
  const byName = new Map((catalog?.items ?? []).map((x) => [x.name.trim().toLowerCase(), x]));
  const svcByName = new Map((catalog?.services ?? []).map((x) => [x.name.trim().toLowerCase(), x]));

  // Details block: label/value pairs above the header row.
  const details: Partial<Details> = {};
  for (let r = 0; r < (headerRow < 0 ? 0 : headerRow); r++) {
    const label = norm(rows[r][0]);
    const value = rows[r][1] ?? null;
    const key = DETAIL_WORDS.find(([re]) => re.test(label))?.[1];
    if (!key || value == null || value === '') continue;
    if (key === 'date') { const d = parseDate(value); if (d) details.date = d; }
    else if (key === 'validityDays' || key === 'finalCharge' || key === 'gst') { const n = parseNum(value); if (n != null && n >= 0) details[key] = n; }
    else details[key] = cellText(value);
  }

  const sections: Section[] = [];
  const results: RowResult[] = [];
  const flags: Record<string, string> = {};
  let room = '';
  const sectionFor = (name: string) => {
    const key = name.toLowerCase();
    let s = sections.find((x) => x.name.toLowerCase() === key);
    if (!s) { s = { id: uid(), name, items: [] }; sections.push(s); }
    return s;
  };

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    const at = (c: number) => (c < 0 ? null : row[c] ?? null);
    const rowNo = r + 1;
    if (row.every((v) => cellText(v) === '')) continue;
    const roomCell = cellText(at(cRoom));
    if (roomCell && !TOTAL_ROW.test(roomCell)) room = roomCell;
    const name = cellText(at(cItem));
    if (!name || TOTAL_ROW.test(name) || TOTAL_ROW.test(roomCell)) {
      results.push({ row: rowNo, status: 'ignored', note: name || roomCell ? 'Total row' : 'No item name' });
      continue;
    }
    const w = parseNum(at(cW)), h = parseNum(at(cH)), rate = parseNum(at(cRate));
    const key = name.toLowerCase();
    const cat = byName.get(key), svc = svcByName.get(key);
    const notes: string[] = [];
    let item: Item | null = null;
    let skip = '';

    if (w != null && h != null) {
      const r2 = rate ?? cat?.rate ?? null;
      if (rate == null && cat) notes.push('rate from rate card');
      if (r2 == null) skip = 'No rate';
      else item = { id: uid(), name, w, h, rate: r2 };
    } else if (svc && w == null && h == null) {
      if (rate == null) notes.push('amount from rate card');
      item = { id: uid(), name, lump: true, rate: rate ?? svc.rate };
    } else if (cat) {
      const w2 = w ?? cat.w ?? null, h2 = h ?? cat.h ?? null;
      if (w == null || h == null) notes.push('size from rate card');
      if (rate == null) notes.push('rate from rate card');
      if (w2 == null || h2 == null) skip = 'No size';
      else item = { id: uid(), name, w: w2, h: h2, rate: rate ?? cat.rate };
    } else if (w == null && h == null) {
      if (rate == null) skip = 'No rate or size';
      else item = { id: uid(), name, lump: true, rate };
    } else {
      skip = w == null ? 'Width missing' : 'Height missing';
    }

    const roomName = room || 'General';
    if (!item) { results.push({ row: rowNo, status: 'skipped', note: skip, room: roomName, name }); continue; }
    sectionFor(roomName).items.push(item);
    const note = notes.length ? notes.join(', ').replace(/^./, (c) => c.toUpperCase()) : undefined;
    if (note) flags[item.id] = note;
    results.push({ row: rowNo, status: note ? 'filled' : 'ok', note, room: roomName, item });
  }

  const customer: Customer = {
    name: details.name ?? base.customer.name,
    phone: details.phone ?? base.customer.phone,
    address: details.address ?? base.customer.address,
  };
  const total = quoteTotal(sections);
  // An agreed subtotal above the calculated total is never used (see math.ts).
  const finalCharge = details.finalCharge && details.finalCharge <= total ? details.finalCharge : 0;
  const quote: Quote = {
    ...base,
    customer,
    date: details.date ?? base.date ?? todayStr(),
    validityDays: details.validityDays && details.validityDays >= 1 ? Math.min(365, Math.round(details.validityDays)) : base.validityDays,
    timeline: details.timeline ?? base.timeline,
    gst: details.gst != null && details.gst <= 100 ? details.gst : base.gst,
    finalCharge,
    sections,
    terms: extras?.terms ?? base.terms,
    spec: extras?.spec ?? base.spec,
  };
  return {
    quote,
    rows: results,
    flags,
    skipped: results.filter((x) => x.status === 'skipped').length,
    filled: results.filter((x) => x.status === 'filled').length,
  };
}
