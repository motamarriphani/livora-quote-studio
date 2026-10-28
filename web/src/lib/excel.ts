// Excel I/O (ExcelJS, ~1 MB, so it loads only when someone imports or downloads
// the template). The quote logic lives in importSheet.ts.
import type { Row } from 'exceljs';
import type { Catalog } from './types';
import type { Cell, SheetData } from './importSheet';

const loadExcel = () => import('exceljs').then((m) => m.default ?? m);

export const TEMPLATE_FILE = 'LIVORA-quote-template.xlsx';
const ITEM_ROWS = 150;
const HEAD_ROW = 10;

/** Our upload template: details block, an item table with a rate-card dropdown, and the rate card for reference. */
export async function buildTemplate(catalog: Catalog | null | undefined): Promise<Blob> {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LIVORA Quote Studio';
  const ws = wb.addWorksheet('Quote', { views: [{ state: 'frozen', ySplit: HEAD_ROW }] });
  const terms = wb.addWorksheet('Terms');
  const spec = wb.addWorksheet('Specification');
  const rc = wb.addWorksheet('Rate card');

  const ink = 'FF0A0A0A', input = 'FFFFFDF0', calc = 'FFF7F7F7', line = { style: 'thin' as const, color: { argb: 'FFE5E5E5' } };
  const border = { top: line, left: line, bottom: line, right: line };
  const headCells = (row: Row) =>
    row.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ink } }; });

  // Rate card sheet: Name | Type | Rate | Width | Height | Category
  rc.columns = [
    { header: 'Name', key: 'name', width: 32 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Rate ₹', key: 'rate', width: 12, style: { numFmt: '#,##0' } },
    { header: 'Width ft', key: 'w', width: 10 },
    { header: 'Height ft', key: 'h', width: 10 },
    { header: 'Category', key: 'cat', width: 18 },
  ];
  for (const x of catalog?.items ?? []) rc.addRow({ name: x.name, type: 'per sq ft', rate: x.rate, w: x.w ?? null, h: x.h ?? null, cat: x.cat ?? '' });
  for (const x of catalog?.services ?? []) rc.addRow({ name: x.name, type: 'lump sum', rate: x.rate, cat: x.cat ?? '' });
  headCells(rc.getRow(1));
  const last = Math.max(2, rc.rowCount);
  const rcRange = `'Rate card'!$A$2:$F$${last}`;

  // Terms + Specification: start from the catalog defaults; edit per quote.
  terms.columns = [{ header: 'Terms & conditions', key: 't', width: 110, style: { alignment: { wrapText: true, vertical: 'top' } } }];
  for (const t of catalog?.terms ?? []) terms.addRow({ t });
  headCells(terms.getRow(1));
  spec.columns = [
    { header: 'Category', key: 'c', width: 28, style: { alignment: { vertical: 'top' } } },
    { header: 'Details', key: 'd', width: 90, style: { alignment: { wrapText: true, vertical: 'top' } } },
  ];
  for (const s of catalog?.materials ?? []) spec.addRow({ c: s.c, d: s.d });
  headCells(spec.getRow(1));

  // Quote sheet
  ws.columns = [{ width: 22 }, { width: 34 }, { width: 11 }, { width: 11 }, { width: 13 }, { width: 14 }];
  const labels = ['Customer name', 'Phone', 'Address', 'Quote date', 'Valid for (days)', 'Timeline', 'Agreed subtotal ₹', 'GST %'];
  labels.forEach((label, i) => {
    const r = ws.getRow(i + 1);
    r.getCell(1).value = label;
    r.getCell(1).font = { bold: true };
    const v = r.getCell(2);
    v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: input } };
    v.border = border;
    if (label === 'Valid for (days)') v.value = 15;
    if (label === 'Quote date') v.numFmt = 'dd-mm-yyyy';
    if (label === 'Agreed subtotal ₹') v.numFmt = '#,##0';
  });
  const head = ws.getRow(HEAD_ROW);
  ['Room', 'Item', 'Width ft', 'Height ft', 'Rate ₹', 'Amount ₹'].forEach((h, i) => {
    const c = head.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ink } };
  });
  for (let r = HEAD_ROW + 1; r <= HEAD_ROW + ITEM_ROWS; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 6; c++) row.getCell(c).border = border;
    if (catalog && (catalog.items.length || catalog.services.length)) {
      // A suggestion list, not a rule: custom item names are fine.
      row.getCell(2).dataValidation = { type: 'list', allowBlank: true, formulae: [`'Rate card'!$A$2:$A$${last}`], showErrorMessage: false };
    }
    const look = (col: number) => `IFERROR(VLOOKUP(B${r},${rcRange},${col},FALSE),"")`;
    const rate = `IF(E${r}<>"",E${r},${look(3)})`;
    const w = `IF(C${r}<>"",C${r},${look(4)})`;
    const h = `IF(D${r}<>"",D${r},${look(5)})`;
    const amount = row.getCell(6);
    amount.value = { formula: `IF(B${r}="","",IF(AND(N(${w})>0,N(${h})>0),${w}*${h}*N(${rate}),N(${rate})))` };
    amount.numFmt = '#,##0';
    amount.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: calc } };
    row.getCell(5).numFmt = '#,##0';
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Every worksheet as plain rows (importSheet.splitWorkbook sorts out which is which). */
export async function readWorkbook(file: File): Promise<SheetData[]> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Only .xlsx files can be imported — in Excel, use File › Save As › Excel Workbook.');
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheets: SheetData[] = [];
  wb.eachSheet((ws) => {
    const rows: Cell[][] = [];
    const lastRow = Math.min(ws.rowCount, 2000);
    const lastCol = Math.min(ws.columnCount, 30);
    for (let r = 1; r <= lastRow; r++) {
      const row = ws.getRow(r);
      const out: Cell[] = [];
      for (let c = 1; c <= lastCol; c++) out.push(plain(row.getCell(c).value));
      rows.push(out);
    }
    while (rows.length && rows[rows.length - 1].every((v) => v == null || v === '')) rows.pop();
    sheets.push({ name: ws.name, rows });
  });
  return sheets;
}

/** ExcelJS cell value → string | number | Date | null (formulas give their saved result). */
function plain(v: unknown): Cell {
  if (v == null) return null;
  if (typeof v === 'string' || typeof v === 'number' || v instanceof Date) return v;
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    const o = v as { richText?: { text: string }[]; result?: unknown; text?: unknown; error?: unknown };
    if (o.richText) return o.richText.map((t) => t.text).join('');
    if ('result' in o) return plain(o.result);
    if ('text' in o) return plain(o.text);
  }
  return null;
}
