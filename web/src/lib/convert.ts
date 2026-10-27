// Mapping between the Convex quote document and the editor's Quote.
import type { Doc } from '../../../convex/_generated/dataModel';
import type { Quote, Status } from './types';
import { DEFAULT_SPEC, DEFAULT_TERMS } from './defaults';
import { totals } from './math';

export function fromDoc(doc: Doc<'quotes'>): Quote {
  const status = (doc.status === 'expired' ? 'sent' : doc.status || 'draft') as Status;
  return {
    id: doc._id,
    version: doc.version ?? 0,
    quoteNo: doc.quoteNo,
    date: doc.date,
    customer: { name: doc.customer.name, phone: doc.customer.phone, address: doc.customer.address },
    clientId: doc.clientId ?? null,
    sections: doc.sections.map((s) => ({ ...s, items: s.items.map((it) => ({ ...it })) })),
    finalCharge: doc.finalCharge || 0,
    gst: doc.gst || 0,
    validityDays: doc.validityDays || 15,
    timeline: doc.timeline || '',
    terms: doc.terms.length ? [...doc.terms] : [...DEFAULT_TERMS],
    spec: doc.spec.length ? doc.spec.map((x) => ({ ...x })) : DEFAULT_SPEC.map((x) => ({ ...x })),
    showDims: doc.showDims !== false,
    showSpec: doc.showSpec !== false,
    status,
  };
}

/** Arguments for quotes:saveQuote. Totals are computed here from the same math the PDF uses. */
export function toPayload(q: Quote, autoBook: boolean) {
  const t = totals(q.sections, q.finalCharge, q.gst);
  return {
    ...(q.id ? { id: q.id } : {}),
    version: q.version,
    ...(q.clientId ? { clientId: q.clientId } : {}),
    quoteNo: q.quoteNo,
    date: q.date,
    customer: { name: q.customer.name.trim(), phone: q.customer.phone.trim(), address: q.customer.address.trim() },
    sections: q.sections.map((s) => ({
      id: s.id,
      name: s.name,
      collapsed: !!s.collapsed,
      items: s.items.map((it) => ({
        id: it.id,
        name: it.name,
        rate: it.rate || 0,
        ...(it.lump ? { lump: true } : { w: it.w ?? null, h: it.h ?? null }),
      })),
    })),
    // An agreed subtotal above the calculated total is never stored as a discount.
    finalCharge: t.agreedTooHigh ? 0 : q.finalCharge || 0,
    gst: q.gst || 0,
    validityDays: q.validityDays || 15,
    timeline: q.timeline,
    terms: q.terms.filter((x) => x.trim()),
    spec: q.spec.filter((x) => x.c.trim() || x.d.trim()),
    showDims: q.showDims,
    showSpec: q.showSpec,
    status: q.status,
    total: t.total,
    discount: t.discount,
    gstAmt: t.gstAmt,
    grand: t.grand,
    itemCount: t.itemCount,
    autoBook,
  };
}

/** A quote is only stored (and given a number) once it has something to quote. */
export function isWorthSaving(q: Quote) {
  return q.sections.some((s) => s.items.length > 0);
}
