import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
  catalogItemValidator,
  catalogServiceValidator,
  quoteSectionValidator,
  quoteCustomerValidator,
  quoteStatusValidator,
  specRowValidator,
  quoteContentValidator,
} from './validators';

export default defineSchema({
  // One row per company (LIVORA today, other designers later). The tenant seam.
  // quoteSeq/quoteYear = sequential quote numbering, stored ON the company doc so
  // every claim patches one shared doc → OCC serializes concurrent claims.
  companies: defineTable({
    clerkUserId: v.string(), // owner's Clerk user id
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
    quoteYear: v.optional(v.number()),
    quoteSeq: v.optional(v.number()),
    lastSyncAt: v.optional(v.number()),
  }).index('by_owner', ['clerkUserId']),

  // The designer's editable catalog: services, items, materials, terms.
  catalogs: defineTable({
    companyId: v.id('companies'),
    items: v.array(catalogItemValidator),      // measured items {id,name,rate,w,h,cat}
    services: v.array(catalogServiceValidator), // lump-sum lines {id,name,rate,cat}
    materials: v.array(specRowValidator),       // spec rows {c,d}
    terms: v.array(v.string()),
    updatedAt: v.number(),
  }).index('by_company', ['companyId']),

  // Every quote ever made — history + cloud sync.
  quotes: defineTable({
    companyId: v.id('companies'),
    // Which client-book record this quote belongs to (set when the quote is
    // saved with a picked client, or auto-booked). Legacy quotes (created
    // before clientId existed) carry no link — they match via customerNameKey.
    clientId: v.optional(v.id('clients')),
    quoteNo: v.string(),
    // Stable record identity is the document _id; quoteNo is only the
    // human-facing label and must never be used as the update key.
    version: v.optional(v.number()),
    date: v.string(),
    customer: quoteCustomerValidator,
    // lowercased customer name — lets legacy (unlinked) quotes match the
    // client book so quote counts stay exact even without clientId links
    customerNameKey: v.optional(v.string()),
    sections: v.array(quoteSectionValidator), // rooms -> typed items tree
    finalCharge: v.number(),
    gst: v.number(),
    validityDays: v.number(),
    timeline: v.string(),
    terms: v.array(v.string()),
    spec: v.array(specRowValidator),
    showDims: v.boolean(),
    showSpec: v.boolean(),
    // totals snapshot — history list renders with zero recompute
    total: v.number(),
    discount: v.number(),
    gstAmt: v.number(),
    grand: v.number(),
    itemCount: v.number(),
    status: quoteStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.string()),
  })
    .index('by_company_updated', ['companyId', 'updatedAt'])
    .index('by_company_quoteNo', ['companyId', 'quoteNo'])
    .index('by_company_client', ['companyId', 'clientId'])
    .index('by_company_client_updated', ['companyId', 'clientId', 'updatedAt'])
    .index('by_company_nameKey', ['companyId', 'customerNameKey']),

  // Immutable post-save snapshots for audit, recovery, and disputes.
  quoteVersions: defineTable({
    quoteId: v.id('quotes'),
    companyId: v.id('companies'),
    version: v.number(),
    changedAt: v.number(),
    changedBy: v.string(),
    changeType: v.union(v.literal('created'), v.literal('updated'), v.literal('deleted'), v.literal('restored')),
    snapshot: quoteContentValidator,
  })
    .index('by_quote_version', ['quoteId', 'version'])
    .index('by_company_changedAt', ['companyId', 'changedAt']),

  // Auto-saved client book.
  clients: defineTable({
    companyId: v.id('companies'),
    name: v.string(),
    nameKey: v.string(), // lowercased, for case-insensitive matching
    phone: v.string(),
    address: v.string(),
    createdAt: v.number(),
    lastQuotedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index('by_company_name', ['companyId', 'nameKey'])
    .index('by_company_lastQuotedAt', ['companyId', 'lastQuotedAt']),
});
