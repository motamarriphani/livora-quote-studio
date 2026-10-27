// Money math. Same rules as the original quote-math.js, plus an explicit
// check for an agreed subtotal that is higher than the calculated total
// (the PDF must never show figures that don't add up).
import type { Item, Section } from './types';

const positive = (value: unknown) => {
  const n = parseFloat(String(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function itemAmount(item: Item) {
  return item.lump ? positive(item.rate) : positive(item.w) * positive(item.h) * positive(item.rate);
}

export function sectionTotal(section: Section) {
  return section.items.reduce((sum, item) => sum + itemAmount(item), 0);
}

export function quoteTotal(sections: Section[]) {
  return sections.reduce((sum, section) => sum + sectionTotal(section), 0);
}

export function itemCount(sections: Section[]) {
  return sections.reduce((sum, section) => sum + section.items.length, 0);
}

/** An agreed subtotal above the calculated total can't be shown honestly as a discount. */
export function agreedTooHigh(total: number, finalCharge: number) {
  return positive(finalCharge) > 0 && Math.round(positive(finalCharge)) > Math.round(total);
}

export type Totals = {
  total: number;
  discount: number;
  base: number;
  gstAmt: number;
  grand: number;
  itemCount: number;
  agreedTooHigh: boolean;
};

export function totals(sections: Section[], finalCharge: number, gst: number): Totals {
  const total = quoteTotal(sections);
  const tooHigh = agreedTooHigh(total, finalCharge);
  const final = positive(finalCharge);
  const base = final > 0 && !tooHigh ? final : total;
  const discount = Math.max(0, total - base);
  const rate = positive(gst);
  const gstAmt = rate ? Math.round((base * rate) / 100) : 0;
  return { total, discount, base, gstAmt, grand: base + gstAmt, itemCount: itemCount(sections), agreedTooHigh: tooHigh };
}
