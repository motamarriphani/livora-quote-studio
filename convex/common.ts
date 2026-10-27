import type { QueryCtx, MutationCtx } from './_generated/server';
import { ConvexError } from 'convex/values';

// Every function is auth-gated: no signed-in user, no data.
export async function requireSubject(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError('Sign in required');
  return identity.subject; // Clerk user id
}

// Find the caller's company (the tenant seam). Null when not onboarded yet.
export async function getCompanyForUser(
  ctx: QueryCtx | MutationCtx,
  subject: string,
) {
  return ctx.db
    .query('companies')
    .withIndex('by_owner', (q) => q.eq('clerkUserId', subject))
    .first();
}

type CatalogItemLimitShape = {
  id: string; name: string; rate: number; w?: number | null; h?: number | null; cat?: string; lump?: boolean;
};
type CatalogServiceLimitShape = { id: string; name: string; rate: number; cat?: string };
type SpecLimitShape = { c: string; d: string };
type QuoteItemLimitShape = {
  id: string; name: string; rate: number; w?: number | null; h?: number | null; lump?: boolean;
};
type QuoteSectionLimitShape = { id: string; name: string; items: QuoteItemLimitShape[] };

function assertText(label: string, value: string, max: number) {
  if (value.length > max) throw new ConvexError(label + ' is too long');
}

function assertNumber(label: string, value: number) {
  if (!Number.isFinite(value) || value < 0) throw new ConvexError(label + ' must be a finite non-negative number');
}

function assertRange(label: string, value: number, min: number, max: number) {
  assertNumber(label, value);
  if (value < min || value > max) throw new ConvexError(`${label} must be between ${min} and ${max}`);
}

export function assertCatalogLimits(data: {
  items: CatalogItemLimitShape[];
  services: CatalogServiceLimitShape[];
  materials: SpecLimitShape[];
  terms: string[];
}) {
  if (data.items.length > 500 || data.services.length > 500 || data.materials.length > 500 || data.terms.length > 200) {
    throw new ConvexError('Catalog is too large');
  }
  for (const item of data.items) {
    assertText('Catalog item id', item.id, 100);
    assertText('Catalog item name', item.name, 200);
    if (item.cat) assertText('Catalog item category', item.cat, 100);
    assertNumber('Catalog item rate', item.rate);
    if (item.w != null) assertNumber('Catalog item width', item.w);
    if (item.h != null) assertNumber('Catalog item height', item.h);
  }
  for (const service of data.services) {
    assertText('Catalog service id', service.id, 100);
    assertText('Catalog service name', service.name, 200);
    if (service.cat) assertText('Catalog service category', service.cat, 100);
    assertNumber('Catalog service rate', service.rate);
  }
  for (const material of data.materials) {
    assertText('Material category', material.c, 200);
    assertText('Material details', material.d, 5000);
  }
  for (const term of data.terms) assertText('Catalog term', term, 2000);
}

export function assertQuoteLimits(data: {
  quoteNo: string;
  date: string;
  timeline: string;
  customer: { name: string; phone: string; address: string };
  sections: QuoteSectionLimitShape[];
  terms: string[];
  spec: SpecLimitShape[];
  finalCharge: number;
  gst: number;
  validityDays: number;
  total: number;
  discount: number;
  gstAmt: number;
  grand: number;
  itemCount: number;
}) {
  if (data.sections.length > 100 || data.terms.length > 200 || data.spec.length > 500) {
    throw new ConvexError('Quote is too large');
  }
  assertText('Quote number', data.quoteNo, 64);
  assertText('Quote date', data.date, 32);
  assertText('Quote timeline', data.timeline, 500);
  assertText('Customer name', data.customer.name, 200);
  assertText('Customer phone', data.customer.phone, 64);
  assertText('Customer address', data.customer.address, 2000);
  for (const section of data.sections) {
    assertText('Section id', section.id, 100);
    assertText('Section name', section.name, 200);
    if (section.items.length > 200) throw new ConvexError('A quote section has too many items');
    for (const item of section.items) {
      assertText('Quote item id', item.id, 100);
      assertText('Quote item name', item.name, 300);
     assertRange('Quote item rate', item.rate, 0, 10000000);
     if (item.w != null) assertRange('Quote item width', item.w, 0, 1000);
     if (item.h != null) assertRange('Quote item height', item.h, 0, 1000);
    }
  }
  if (data.sections.reduce((count, section) => count + section.items.length, 0) > 1000) {
    throw new ConvexError('Quote has too many items');
  }
  for (const term of data.terms) assertText('Quote term', term, 2000);
  for (const material of data.spec) {
    assertText('Quote specification category', material.c, 200);
    assertText('Quote specification details', material.d, 5000);
  }
  const actualItemCount = data.sections.reduce((count, section) => count + section.items.length, 0);
  if (data.itemCount !== actualItemCount) throw new ConvexError('Quote item count does not match its sections');
  assertRange('Final charge', data.finalCharge, 0, 100000000);
  assertRange('GST', data.gst, 0, 100);
  assertRange('Validity days', data.validityDays, 1, 365);
  [
    ['Total', data.total], ['Discount', data.discount], ['GST amount', data.gstAmt],
    ['Grand total', data.grand], ['Item count', data.itemCount],
  ].forEach(([label, value]) => assertNumber(String(label), Number(value)));
}
