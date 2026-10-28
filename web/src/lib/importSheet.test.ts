import { describe, expect, it } from 'vitest';
import { buildImport, detectColumns, parseDate, parseNum, type Cell } from './importSheet';
import { newQuote } from './defaults';
import type { Catalog } from './types';

const catalog: Catalog = {
  items: [
    { id: 'bed', name: 'Bed', rate: 1200, w: 7, h: 6, cat: 'Woodwork' },
    { id: 'loft', name: 'Kitchen Loft Box', rate: 1200, w: 34, h: 10, cat: 'Kitchen' },
  ],
  services: [{ id: 'paint', name: 'Painting Work', rate: 115000, cat: 'Finishes' }],
  materials: [],
  terms: [],
};

// Our template: details block, blank row, item table with fill-down rooms.
const template: Cell[][] = [
  ['Customer name', 'Ananya Rao'],
  ['Phone', '98480 12210'],
  ['Address', 'Jubilee Hills'],
  ['Quote date', new Date(Date.UTC(2026, 9, 28))],
  ['Valid for (days)', 15],
  ['Timeline', '6–8 weeks'],
  ['Agreed subtotal ₹', 200000],
  ['GST %', 18],
  [],
  ['Room', 'Item', 'Width ft', 'Height ft', 'Rate ₹', 'Amount ₹'],
  ['Master Bedroom', 'Wardrobe Box', 5, 8, 1500, 60000],
  [null, 'Bed', 7, 6, null, null],
  ['Kitchen', 'Kitchen Loft Box', null, null, 150, null],
  ['Whole home', 'Painting Work', null, null, null, null],
  [null, 'False ceiling', null, null, '₹83,500', null],
  [null, 'Wardrobe shutter', 4, null, 900, null],
  [null, 'Total', null, null, null, 999],
];

describe('sheet import', () => {
  it('finds the template header row and columns', () => {
    const { headerRow, roles } = detectColumns(template);
    expect(headerRow).toBe(9);
    expect(roles).toEqual(['room', 'item', 'w', 'h', 'rate', 'ignore']);
  });

  it('builds rooms, fills blanks from the rate card and skips what it cannot price', () => {
    const { headerRow, roles } = detectColumns(template);
    const res = buildImport(template, roles, headerRow, catalog, newQuote(catalog));
    const q = res.quote;
    expect(q.customer).toEqual({ name: 'Ananya Rao', phone: '98480 12210', address: 'Jubilee Hills' });
    expect(q.date).toBe('2026-10-28');
    expect(q.gst).toBe(18);
    expect(q.timeline).toBe('6–8 weeks');
    expect(q.sections.map((s) => [s.name, s.items.length])).toEqual([['Master Bedroom', 2], ['Kitchen', 1], ['Whole home', 2]]);
    const [bed] = q.sections[0].items.slice(1);
    expect(bed).toMatchObject({ name: 'Bed', w: 7, h: 6, rate: 1200 });
    expect(res.flags[bed.id]).toBe('Rate from rate card');
    expect(q.sections[1].items[0]).toMatchObject({ w: 34, h: 10, rate: 150 });
    expect(q.sections[2].items).toMatchObject([{ name: 'Painting Work', lump: true, rate: 115000 }, { name: 'False ceiling', lump: true, rate: 83500 }]);
    expect(res.skipped).toBe(1);
    expect(res.rows.find((r) => r.status === 'skipped')).toMatchObject({ row: 16, note: 'Height missing' });
    expect(res.rows.at(-1)).toMatchObject({ status: 'ignored', note: 'Total row' });
    expect(q.finalCharge).toBe(200000);
  });

  it('never keeps an agreed subtotal above the calculated total', () => {
    const rows: Cell[][] = [['Agreed subtotal', 999999], ['Item', 'Rate'], ['Painting Work', 1000]];
    const { headerRow, roles } = detectColumns(rows);
    expect(buildImport(rows, roles, headerRow, catalog, newQuote(catalog)).quote.finalCharge).toBe(0);
  });

  it('reads a free-form sheet by its own headers', () => {
    const rows: Cell[][] = [['S.No', 'Area', 'Description', 'W (ft)', 'H (ft)', 'Price', 'Remarks'], [1, 'MBR', 'Wardrobe', 5, 8, '1,500', 'laminate']];
    const { headerRow, roles } = detectColumns(rows);
    expect(roles).toEqual(['ignore', 'room', 'item', 'w', 'h', 'rate', 'ignore']);
    const q = buildImport(rows, roles, headerRow, null, newQuote(null)).quote;
    expect(q.sections[0]).toMatchObject({ name: 'MBR', items: [{ name: 'Wardrobe', w: 5, h: 8, rate: 1500 }] });
  });

  it('parses Indian-format numbers and dates', () => {
    expect(parseNum('₹1,15,000')).toBe(115000);
    expect(parseNum('—')).toBeNull();
    expect(parseDate('5/1/2026')).toBe('2026-01-05');
    expect(parseDate(46323)).toBe('2026-10-28');
  });
});
