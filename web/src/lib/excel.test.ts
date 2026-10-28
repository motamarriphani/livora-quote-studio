import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildTemplate, readWorkbook } from './excel';
import { buildImport, detectColumns, splitWorkbook } from './importSheet';
import { newQuote } from './defaults';
import type { Catalog } from './types';

const catalog: Catalog = {
  items: [{ id: 'bed', name: 'Bed', rate: 1200, w: 7, h: 6, cat: 'Woodwork' }],
  services: [{ id: 'paint', name: 'Painting Work', rate: 115000, cat: 'Finishes' }],
  materials: [{ c: 'Plywood', d: 'BWP 710' }],
  terms: ['50% advance', 'Balance on handover'],
};

describe('excel template round trip', () => {
  it('a filled-in template imports as a quote', async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await (await buildTemplate(catalog)).arrayBuffer());
    const ws = wb.getWorksheet('Quote')!;
    expect(wb.getWorksheet('Rate card')!.getCell('A2').value).toBe('Bed');
    expect(ws.getCell('B11').dataValidation?.formulae?.[0]).toContain('Rate card');
    ws.getCell('B1').value = 'Ananya Rao';
    ws.getCell('A11').value = 'Bedroom';
    ws.getCell('B11').value = 'Bed';
    ws.getCell('B12').value = 'Painting Work';
    const terms = wb.getWorksheet('Terms')!;
    expect(terms.getCell('A2').value).toBe('50% advance');
    terms.getCell('A3').value = '2. Balance within 7 days of handover';
    terms.getCell('A4').value = 'Site to be cleared before work starts';
    wb.getWorksheet('Specification')!.spliceRows(2, 1);
    const file = new File([await wb.xlsx.writeBuffer()], 'filled.xlsx');

    const book = splitWorkbook(await readWorkbook(file));
    const [sheet] = book.itemSheets;
    expect(sheet.name).toBe('Quote');
    expect(book.spec).toBeNull();
    const { headerRow, roles } = detectColumns(sheet.rows);
    const res = buildImport(sheet.rows, roles, headerRow, catalog, newQuote(catalog), book);
    expect(res.quote.terms).toEqual(['50% advance', 'Balance within 7 days of handover', 'Site to be cleared before work starts']);
    expect(res.quote.spec).toEqual([{ c: 'Plywood', d: 'BWP 710' }]);
    expect(res.quote.customer.name).toBe('Ananya Rao');
    expect(res.quote.validityDays).toBe(15);
    expect(res.quote.sections[0].items).toMatchObject([{ name: 'Bed', w: 7, h: 6, rate: 1200 }, { name: 'Painting Work', lump: true, rate: 115000 }]);
  });

  it('refuses old .xls files with a clear message', async () => {
    await expect(readWorkbook(new File(['x'], 'old.xls'))).rejects.toThrow('.xlsx');
  });
});
