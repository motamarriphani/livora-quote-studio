// Quotation PDF (pdfmake, generated in the browser). pdfmake + fonts are
// ~1 MB, so they load only when a preview or download is first needed.
import type { Column, Content, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import type { Quote } from './types';
import { COMPANY, printedTerms } from './defaults';
import { amountInWords, fmtDate } from './format';
import { LOGO_MARK_SVG } from './logo';
import { itemAmount, sectionTotal, totals } from './math';

const INK = '#241d16';
const ACCENT = '#a05a2c';
const ACCENT_BG = '#f3e7db';
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const area = (w?: number | null, h?: number | null) =>
  ((w || 0) * (h || 0)).toLocaleString('en-IN', { maximumFractionDigits: 1 });

export function buildPdfDef(q: Quote): TDocumentDefinitions {
  const c = COMPANY;
  const cu = q.customer;
  const t = totals(q.sections, q.finalCharge, q.gst);
  const cols = q.showDims ? 7 : 5;
  const span = cols - 1; // label span for subtotal / total rows
  const filler = (n: number): TableCell[] => Array(n).fill({});

  const body: TableCell[][] = [];
  let sno = 0;
  let room = 0;
  for (const sec of q.sections) {
    if (!sec.items.length) continue;
    room++;
    body.push([{ id: `room-${room}`, text: sec.name.toUpperCase(), colSpan: cols, fillColor: ACCENT_BG, bold: true, fontSize: 8.5, color: INK, margin: [0, 3, 0, 3] }, ...filler(cols - 1)]);
    sec.items.forEach((it, i) => {
      sno++;
      const row: TableCell[] = [{ text: String(sno), alignment: 'center', ...(i === 0 ? { id: `room-${room}-first` } : {}) }, { text: it.name }];
      if (q.showDims) {
        row.push({ text: it.lump ? '—' : String(it.w ?? ''), alignment: 'center' }, { text: it.lump ? '—' : String(it.h ?? ''), alignment: 'center' });
      }
      row.push(
        { text: it.lump ? '—' : area(it.w, it.h), alignment: 'center' },
        { text: it.lump ? '—' : inr(it.rate), alignment: 'right' },
        { text: inr(itemAmount(it)), alignment: 'right', bold: true },
      );
      body.push(row);
    });
    body.push([{ text: 'Subtotal — ' + sec.name, colSpan: span, alignment: 'right', bold: true, italics: true, fontSize: 8 }, ...filler(span - 1), { text: inr(sectionTotal(sec)), alignment: 'right', bold: true }]);
  }
  const totalRow = (label: string, value: string, dark = false): TableCell[] => [
    { text: label, colSpan: span, alignment: 'right', bold: true, ...(dark ? { color: '#fff', fillColor: INK } : {}) },
    ...filler(span - 1),
    { text: value, alignment: 'right', bold: true, ...(dark ? { color: '#fff', fillColor: INK } : {}) },
  ];
  body.push(totalRow('TOTAL', inr(t.total)));
  if (t.discount) body.push(totalRow('DISCOUNT', '− ' + inr(t.discount)));
  if (t.discount || t.gstAmt) body.push(totalRow('SUBTOTAL', inr(t.base)));
  if (t.gstAmt) body.push(totalRow(`GST @ ${q.gst}%`, '+ ' + inr(t.gstAmt)));
  body.push(totalRow('GRAND TOTAL', inr(t.grand), true));

  const header: TableCell[] = [
    { text: 'S.NO', style: 'th' },
    { text: 'DESCRIPTION', style: 'th' },
    ...(q.showDims ? [{ text: 'W (FT)', style: 'th', alignment: 'center' }, { text: 'H (FT)', style: 'th', alignment: 'center' }] as TableCell[] : []),
    { text: 'SQ FT', style: 'th', alignment: 'center' },
    { text: 'RATE / SQ FT', style: 'th', alignment: 'right' },
    { text: 'AMOUNT', style: 'th', alignment: 'right' },
  ];

  // The last few terms travel WITH the signature block as one unbreakable
  // unit, so a page never ends on a lonely signature line.
  const allTerms = printedTerms(q);
  const tailN = Math.min(3, allTerms.length);
  const flowTerms = allTerms.slice(0, allTerms.length - tailN);
  const tailTerms = allTerms.slice(allTerms.length - tailN);
  const termItem = (text: string) => ({ text, margin: [0, 1.2, 0, 1.2] as [number, number, number, number] });
  const sigLine = (label: string, sub: string): Column => ({
    width: '*',
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: INK }], margin: [0, 144, 0, 5] },
      { text: label, alignment: 'center', fontSize: 9, bold: true },
      { text: sub, alignment: 'center', fontSize: 7.5, color: '#8a7d6f' },
    ],
  });
  const thinGrid = { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#c9bfb2', vLineColor: () => '#c9bfb2' };

  return {
    pageSize: 'A4',
    pageMargins: [36, 40, 36, 48],
    info: { title: 'Quotation ' + q.quoteNo, author: c.name, subject: 'Quotation — ' + cu.name },
    // A room heading never ends a page alone: if its first item isn't on the same
    // page, the heading moves to the next page with it.
    pageBreakBefore: (node, nodes) =>
      typeof node.id === 'string' && /^room-\d+$/.test(node.id) &&
      !nodes.getFollowingNodesOnPage().some((n) => n.id === node.id + '-first'),
    footer: (current: number, count: number) => ({
      columns: [
        { text: `${c.name} · ${c.address} · ${c.phone}`, fontSize: 7, color: '#8a7d6f' },
        { text: `Page ${current} of ${count}`, fontSize: 7, color: '#8a7d6f', alignment: 'right' },
      ],
      margin: [36, 10, 36, 0],
    }),
    content: [
      {
        columns: [
          { width: 46, svg: LOGO_MARK_SVG, margin: [0, 1, 0, 0] },
          { width: '*', stack: [
            { text: c.name, fontSize: 20, bold: true, characterSpacing: 1, color: INK },
            { text: c.address, fontSize: 8.5, color: '#4c4238', margin: [0, 3, 0, 0] },
            { text: 'Ph No : ' + c.phone, fontSize: 8.5, color: '#4c4238' },
          ] },
          { width: 'auto', stack: [
            { text: 'QUOTATION', fontSize: 16, bold: true, characterSpacing: 4, color: ACCENT, alignment: 'right' },
            { text: 'DATE : ' + fmtDate(q.date), fontSize: 8.5, alignment: 'right', margin: [0, 7, 0, 0] },
            { text: 'QUOTE NO : ' + (q.quoteNo || '—'), fontSize: 8.5, alignment: 'right' },
            { text: 'VALIDITY : ' + (q.validityDays || 15) + ' days', fontSize: 8.5, alignment: 'right' },
            ...(q.timeline.trim() ? [{ text: 'TIMELINE : ' + q.timeline.trim(), fontSize: 8.5, alignment: 'right' as const }] : []),
          ] },
        ],
        columnGap: 12,
        margin: [0, 0, 0, 10],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 1.6, lineColor: INK }], margin: [0, 0, 0, 8] },
      {
        table: { widths: ['*'], body: [[{
          text: 'CUSTOMER NAME & ADDRESS : ' + [cu.name, cu.address].filter(Boolean).join(', ') + (cu.phone ? ' — Ph: ' + cu.phone : ''),
          fontSize: 9, margin: [6, 5, 6, 5],
        }]] },
        layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => INK, vLineColor: () => INK },
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: q.showDims ? [24, '*', 30, 30, 40, 60, 78] : [24, '*', 44, 64, 82],
          body: [header, ...body],
        },
        layout: {
          ...thinGrid,
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
          paddingTop: () => 3.5, paddingBottom: () => 3.5, paddingLeft: () => 5, paddingRight: () => 5,
        },
        fontSize: 8.5,
        margin: [0, 0, 0, 10],
      },
      { text: 'AMOUNT IN WORDS : ' + amountInWords(t.grand), fontSize: 9.5, bold: true, margin: [0, 0, 0, 6] },
      ...(q.showSpec && q.spec.length ? [
        { text: 'MATERIAL SPECIFICATION', fontSize: 10, bold: true, characterSpacing: 1, margin: [0, 2, 0, 3] } as Content,
        {
          table: {
            dontBreakRows: true,
            widths: [118, '*'],
            body: q.spec.map((s) => [
              { text: s.c.toUpperCase(), bold: true, fontSize: 7.8, fillColor: ACCENT_BG, color: INK, margin: [4, 3, 4, 3] },
              { text: s.d, fontSize: 8.2, margin: [4, 3, 4, 3] },
            ]),
          },
          layout: { ...thinGrid, paddingTop: () => 0, paddingBottom: () => 0, paddingLeft: () => 0, paddingRight: () => 0 },
          margin: [0, 0, 0, 6],
        } as Content,
      ] : []),
      { text: 'NOTE — TERMS & CONDITIONS', fontSize: 10, bold: true, characterSpacing: 1, margin: [0, 2, 0, 3] },
      ...(flowTerms.length ? [{ ol: flowTerms.map(termItem), fontSize: 8.5, margin: [0, 0, 0, 4] } as Content] : []),
      {
        unbreakable: true,
        stack: [
          ...(tailTerms.length ? [{ ol: tailTerms.map(termItem), fontSize: 8.5, start: flowTerms.length + 1 } as Content] : []),
          { columns: [sigLine(cu.name ? cu.name.toUpperCase() : 'CUSTOMER', 'Customer signature'), sigLine('For ' + c.name, 'Authorized signatory')], columnGap: 30 },
        ],
      },
    ],
    styles: { th: { bold: true, color: '#fff', fillColor: INK, fontSize: 8 } },
  };
}

async function getPdfMake() {
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  pdfMake.addVirtualFileSystem(vfs);
  return pdfMake;
}

export async function makePdfBlob(q: Quote): Promise<Blob> {
  const pdfMake = await getPdfMake();
  return pdfMake.createPdf(buildPdfDef(q)).getBlob();
}

/** LIVORA-Quotation-<client or quote no>-<DD-MM-YYYY>.pdf */
export function pdfFileName(q: Quote) {
  const id = (q.customer.name || q.quoteNo || '').trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  return 'LIVORA-Quotation' + (id ? '-' + id : '') + '-' + fmtDate(q.date) + '.pdf';
}

export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

/** Render every page of a PDF to canvases (pdf.js) — identical to the downloaded file. */
export async function renderPdfPages(blob: Blob, width = 1000): Promise<HTMLCanvasElement[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const pages: HTMLCanvasElement[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
    pages.push(canvas);
  }
  return pages;
}
