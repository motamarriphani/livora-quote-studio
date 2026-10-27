import { describe, expect, it } from 'vitest';
import { agreedTooHigh, itemAmount, quoteTotal, totals } from './math';
import { amountInWords, isExpired, todayStr } from './format';
import { copyAsNew, newQuote, printedTerms, sampleQuote } from './defaults';
import { isWorthSaving, toPayload } from './convert';
import { buildPdfDef } from './pdf';
import type { Quote } from './types';

const sections = [{ id: 'a', name: 'Bedroom', items: [
  { id: '1', name: 'Wardrobe', w: 5, h: 8, rate: 1500 },
  { id: '2', name: 'Paint', lump: true, rate: 25000 },
] }];

describe('money math', () => {
  it('matches the original rules', () => {
    expect(itemAmount({ id: 'x', name: '', w: 5, h: 8, rate: 1500 })).toBe(60000);
    expect(itemAmount({ id: 'x', name: '', lump: true, rate: 25000 })).toBe(25000);
    expect(quoteTotal(sections)).toBe(85000);
    expect(totals(sections, 80000, 5)).toMatchObject({ total: 85000, discount: 5000, base: 80000, gstAmt: 4000, grand: 84000 });
  });

  it('never prints figures that do not add up when the agreed amount is too high', () => {
    expect(agreedTooHigh(85000, 90000)).toBe(true);
    const t = totals(sections, 90000, 18);
    expect(t.agreedTooHigh).toBe(true);
    expect(t.base).toBe(85000);
    expect(t.discount).toBe(0);
    expect(t.grand).toBe(85000 + Math.round(85000 * 0.18));
  });

  it('sample quote reproduces the reference ₹22,00,000 agreed amount', () => {
    const s = sampleQuote();
    const t = totals(s.sections, s.finalCharge, s.gst);
    expect(t.base).toBe(2200000);
    expect(t.discount).toBe(Math.round(t.total - 2200000));
  });
});

describe('new quotes', () => {
  it('start today, as a draft, with no number', () => {
    const q = newQuote(null);
    expect(q.date).toBe(todayStr());
    expect(q.status).toBe('draft');
    expect(q.quoteNo).toBe('');
    expect(q.id).toBeNull();
  });

  it('copies (duplicate / revision) reset date, status, number and ids', () => {
    const old: Quote = { ...newQuote(null), id: 'q1' as Quote['id'], version: 7, quoteNo: 'LQ-2026-004', date: '2026-01-02', status: 'accepted', sections };
    const c = copyAsNew(old);
    expect(c).toMatchObject({ id: null, version: 0, quoteNo: '', date: todayStr(), status: 'draft' });
    expect(c.sections[0].items[0].id).not.toBe('1');
    expect(c.sections[0].items[0].name).toBe('Wardrobe');
  });

  it('is only saved once it has an item', () => {
    expect(isWorthSaving({ ...newQuote(null), customer: { name: 'Ravi', phone: '', address: '' } })).toBe(false);
    expect(isWorthSaving({ ...newQuote(null), sections })).toBe(true);
  });
});

describe('payload', () => {
  it('does not book clients unless asked, and never stores a too-high agreed amount', () => {
    const p = toPayload({ ...newQuote(null), sections, finalCharge: 99999 }, false);
    expect(p.autoBook).toBe(false);
    expect(p.finalCharge).toBe(0);
    expect(p.itemCount).toBe(2);
    expect(p.grand).toBe(85000);
  });
});

describe('quote text', () => {
  it('words', () => {
    expect(amountInWords(2200000)).toBe('Rupees Twenty Two Lakh Only');
    expect(amountInWords(0)).toBe('Rupees Zero Only');
  });

  it('only sent quotes expire', () => {
    expect(isExpired({ status: 'draft', date: '2020-01-01', validityDays: 15 })).toBe(false);
    expect(isExpired({ status: 'sent', date: '2020-01-01', validityDays: 15 })).toBe(true);
    expect(isExpired({ status: 'sent', date: todayStr(), validityDays: 15 })).toBe(false);
  });

  it('adds GST / validity / timeline lines', () => {
    const t = printedTerms({ terms: ['A', ' '], gst: 18, validityDays: 10, timeline: '6 weeks' });
    expect(t).toEqual([
      'A',
      'GST @ 18% is charged extra and is shown in the grand total',
      'Validity of this quotation: 10 days from the date of issue',
      'Project timeline: approximately 6 weeks from the start date',
    ]);
  });

  it('PDF totals block reconciles: TOTAL − DISCOUNT = SUBTOTAL, + GST = GRAND TOTAL', () => {
    const def = buildPdfDef({ ...newQuote(null), quoteNo: 'LQ-1', sections, finalCharge: 80000, gst: 5 });
    const text = JSON.stringify(def.content);
    for (const s of ['TOTAL', '₹85,000', 'DISCOUNT', '− ₹5,000', 'SUBTOTAL', '₹80,000', 'GST @ 5%', '+ ₹4,000', 'GRAND TOTAL', '₹84,000']) {
      expect(text).toContain(s);
    }
  });
});
