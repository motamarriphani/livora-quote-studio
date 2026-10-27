import { v } from 'convex/values';

const nullableNumber = v.union(v.number(), v.null());

export const catalogItemValidator = v.object({
  id: v.string(),
  name: v.string(),
  rate: v.number(),
  w: v.optional(nullableNumber),
  h: v.optional(nullableNumber),
  cat: v.optional(v.string()),
  lump: v.optional(v.boolean()),
});

export const catalogServiceValidator = v.object({
  id: v.string(),
  name: v.string(),
  rate: v.number(),
  cat: v.optional(v.string()),
});

export const specRowValidator = v.object({
  c: v.string(),
  d: v.string(),
});

export const quoteItemValidator = v.object({
  id: v.string(),
  name: v.string(),
  w: v.optional(nullableNumber),
  h: v.optional(nullableNumber),
  rate: v.number(),
  lump: v.optional(v.boolean()),
});

export const quoteSectionValidator = v.object({
  id: v.string(),
  name: v.string(),
  items: v.array(quoteItemValidator),
  collapsed: v.optional(v.boolean()),
});

export const quoteCustomerValidator = v.object({
  name: v.string(),
  phone: v.string(),
  address: v.string(),
});

export const quoteStatusValidator = v.optional(v.union(
  v.literal('draft'),
  v.literal('sent'),
  v.literal('accepted'),
  v.literal('declined'),
  v.literal('expired'),
));

// The reusable quote payload stored in a version snapshot. Audit metadata
// lives on the quote/version document, not inside this business payload.
export const quoteContentValidator = v.object({
  clientId: v.optional(v.id('clients')),
  quoteNo: v.string(),
  date: v.string(),
  customer: quoteCustomerValidator,
  customerNameKey: v.optional(v.string()),
  sections: v.array(quoteSectionValidator),
  finalCharge: v.number(),
  gst: v.number(),
  validityDays: v.number(),
  timeline: v.string(),
  terms: v.array(v.string()),
  spec: v.array(specRowValidator),
  showDims: v.boolean(),
  showSpec: v.boolean(),
  total: v.number(),
  discount: v.number(),
  gstAmt: v.number(),
  grand: v.number(),
  itemCount: v.number(),
  status: quoteStatusValidator,
});

export const catalogDocValidator = v.object({
  _id: v.id('catalogs'),
  _creationTime: v.number(),
  companyId: v.id('companies'),
  items: v.array(catalogItemValidator),
  services: v.array(catalogServiceValidator),
  materials: v.array(specRowValidator),
  terms: v.array(v.string()),
  updatedAt: v.number(),
});

export const quoteDocValidator = v.object({
  _id: v.id('quotes'),
  _creationTime: v.number(),
  companyId: v.id('companies'),
  ...quoteContentValidator.fields,
  version: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.optional(v.string()),
  updatedBy: v.optional(v.string()),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.string()),
});

export const quoteSummaryValidator = v.object({
  id: v.id('quotes'),
  quoteNo: v.string(),
  date: v.string(),
  customerName: v.string(),
  total: v.number(),
  discount: v.number(),
  gstAmt: v.number(),
  grand: v.number(),
  itemCount: v.number(),
  status: v.string(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
});

export const quoteMutationResultValidator = v.object({
  id: v.id('quotes'),
  version: v.number(),
  updatedAt: v.number(),
});

export const quoteVersionValidator = v.object({
  id: v.id('quoteVersions'),
  quoteId: v.id('quotes'),
  version: v.number(),
  changedAt: v.number(),
  changedBy: v.string(),
  changeType: v.union(v.literal('created'), v.literal('updated'), v.literal('deleted'), v.literal('restored')),
  snapshot: quoteContentValidator,
});

export const clientQuoteSummaryValidator = v.object({
  id: v.id('quotes'),
  quoteNo: v.string(),
  date: v.string(),
  grand: v.number(),
  status: v.string(),
  updatedAt: v.number(),
});

export const clientSummaryValidator = v.object({
  id: v.id('clients'),
  name: v.string(),
  phone: v.string(),
  address: v.string(),
  lastQuotedAt: v.number(),
  quoteCount: v.number(),
  quotes: v.array(clientQuoteSummaryValidator),
  archivedAt: v.optional(v.number()),
});
