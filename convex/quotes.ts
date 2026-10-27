import { query, mutation, MutationCtx } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { requireSubject, getCompanyForUser, assertQuoteLimits } from './common';
import {
  quoteCustomerValidator,
  quoteSectionValidator,
  quoteStatusValidator,
  specRowValidator,
  quoteDocValidator,
  quoteSummaryValidator,
  quoteMutationResultValidator,
  quoteVersionValidator,
} from './validators';

// Sequential, collision-proof quote numbers: LQ-2026-001, LQ-2026-002…
// The counter lives ON the company doc (quoteSeq/quoteYear), so every issue
// patches the same shared doc — Convex OCC serializes concurrent issues and
// auto-retries on conflict. No double-issue, ever.
type Company = Awaited<ReturnType<typeof getCompanyForUser>>;

function effectiveStatus(quote: { status?: string; date: string; validityDays: number }) {
  if (quote.status === 'accepted' || quote.status === 'declined') return quote.status;
  const expiry = new Date(quote.date + 'T23:59:59').getTime() + quote.validityDays * 86400000;
  return expiry < Date.now() ? 'expired' : (quote.status || 'draft');
}

const quoteListReturns = v.object({
  quotes: v.array(quoteSummaryValidator),
  nextCursor: v.union(v.string(), v.null()),
  done: v.boolean(),
});

const saveQuoteReturns = v.object({
  id: v.id('quotes'),
  version: v.number(),
  updatedAt: v.number(),
  quoteNo: v.string(),
  clientId: v.optional(v.id('clients')),
});

const versionListReturns = v.object({
  versions: v.array(quoteVersionValidator),
  nextCursor: v.union(v.string(), v.null()),
  done: v.boolean(),
});

async function issueQuoteNumber(db: MutationCtx['db'], company: NonNullable<Company>) {
  const year = new Date().getFullYear();
  const seq = (company.quoteYear === year ? company.quoteSeq ?? 0 : 0) + 1;
  await db.patch(company._id, {
    quoteYear: year,
    quoteSeq: seq,
    lastSyncAt: Date.now(),
  });
  return 'LQ-' + year + '-' + String(seq).padStart(3, '0');
}

// Resolve which client-book record a quote belongs to.
// Explicit clientId (picked client) → link + refresh contact details.
// Freehand name → auto-book: reuse an existing record only when the quote's
// phone matches, or when both records have no phone; otherwise create a fresh
// client record so two people with the same name stay separate.
async function resolveClient(
  db: MutationCtx['db'],
  company: NonNullable<Company>,
  args: { clientId?: Id<'clients'>; customer: { name: string; phone: string; address: string } },
  updatedAt: number,
) {
  const name = args.customer.name.trim();
  if (!name) return null;
  const nameKey = name.toLowerCase();
  if (args.clientId) {
    const client = await db.get(args.clientId);
    if (!client || client.companyId !== company._id) {
      throw new ConvexError({ code: 'CLIENT_NOT_FOUND', message: 'That client no longer exists — pick another or type the name directly.' });
    }
    const data = {
      name,
      nameKey,
      phone: args.customer.phone || client.phone || '',
      address: args.customer.address || client.address || '',
      lastQuotedAt: updatedAt,
    };
    await db.patch(client._id, data);
    return { id: client._id, ...data };
  }
  const phone = args.customer.phone.trim();
  const existing = await db
    .query('clients')
    .withIndex('by_company_name', (q) => q.eq('companyId', company._id).eq('nameKey', nameKey))
    .first();
  // With no phone number, reuse an existing same-name record instead of
  // creating a new client on every autosave. A phone match remains required
  // when both people supplied phone numbers.
  if (existing && !existing.archivedAt && ((!phone && !existing.phone) || (phone && existing.phone && phone === existing.phone.trim()))) {
    const data = {
      name,
      nameKey,
      phone: args.customer.phone || existing.phone || '',
      address: args.customer.address || existing.address || '',
      lastQuotedAt: updatedAt,
    };
    await db.patch(existing._id, data);
    return { id: existing._id, ...data };
  }
  const newId = await db.insert('clients', {
    companyId: company._id,
    name,
    nameKey,
    phone: args.customer.phone || '',
    address: args.customer.address || '',
    createdAt: updatedAt,
    lastQuotedAt: updatedAt,
  });
  return {
    id: newId,
    name,
    nameKey,
    phone: args.customer.phone || '',
    address: args.customer.address || '',
    lastQuotedAt: updatedAt,
  };
}

// History list — summaries only, newest first (zero client-side math).
// Cursor-paginated so old quotes never silently disappear; `search` filters
// by customer name / quote number across the whole history (not just the
// first page).
export const listQuotes = query({
  args: {
    cursor: v.optional(v.string()),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    // Scope the list to one client (linked by clientId, plus legacy quotes
    // matched by the client's name). The dashboard omits this → all quotes.
    clientId: v.optional(v.id('clients')),
  },
  returns: quoteListReturns,
  handler: async (ctx, { cursor, search, status, clientId }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    if (!company) return { quotes: [], nextCursor: null, done: true };
    let client = null;
    if (clientId) {
      client = await ctx.db.get(clientId);
      if (!client || client.companyId !== company._id) {
        return { quotes: [], nextCursor: null, done: true };
      }
    }
    const clientNameKey = client ? client.nameKey : '';
    const term = (search || '').trim().toLowerCase();
    const pageSize = 30;
    const matched: {
      id: Id<'quotes'>;
      quoteNo: string;
      date: string;
      customerName: string;
      total: number;
      discount: number;
      gstAmt: number;
      grand: number;
      itemCount: number;
      status: string;
      updatedAt: number;
    }[] = [];
    let cur: string | null = cursor ?? null;
    let isDone = false;
    while (matched.length < pageSize && !isDone) {
      const page = await ctx.db
        .query('quotes')
        .withIndex('by_company_updated', (q) => q.eq('companyId', company._id))
        .order('desc')
        .paginate({ numItems: 50, cursor: cur });
      isDone = page.isDone;
      cur = page.continueCursor;
      for (const q of page.page) {
        if (q.deletedAt) continue;
        if (client) {
          const linked = q.clientId === client._id;
          const legacy = !q.clientId && (q.customerNameKey || '') === clientNameKey;
          if (!linked && !legacy) continue;
        }
        const name = (q.customer?.name || '').toLowerCase();
        if (term && !name.includes(term) && !(q.quoteNo || '').toLowerCase().includes(term)) continue;
        const currentStatus = effectiveStatus(q);
        if (status && currentStatus !== status) continue;
        matched.push({
          id: q._id,
          quoteNo: q.quoteNo,
          date: q.date,
          customerName: q.customer?.name || '',
          total: q.total,
          discount: q.discount,
          gstAmt: q.gstAmt,
          grand: q.grand,
          itemCount: q.itemCount,
          status: currentStatus,
          updatedAt: q.updatedAt,
        });
        if (matched.length >= pageSize) break;
      }
    }
    return { quotes: matched, nextCursor: isDone ? null : cur, done: isDone };
  },
});

// Dashboard stats — computed over ALL quotes (never truncated by pagination).
export const getStats = query({
  args: { month: v.string() }, // client-local YYYY-MM (server clock may be UTC)
  returns: v.object({ monthCount: v.number(), monthValue: v.number(), openCount: v.number() }),
  handler: async (ctx, { month }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    if (!company) return { monthCount: 0, monthValue: 0, openCount: 0 };
    let monthCount = 0;
    let monthValue = 0;
    let openCount = 0;
    let cursor: string | null = null;
    let done = false;
    while (!done) {
      const page = await ctx.db
        .query('quotes')
        .withIndex('by_company_updated', (q) => q.eq('companyId', company._id))
        .order('desc')
        .paginate({ numItems: 500, cursor });
      done = page.isDone;
      cursor = page.continueCursor;
      for (const q of page.page) {
        if (q.deletedAt) continue;
        if ((q.date || '').startsWith(month)) {
          monthCount++;
          monthValue += q.grand || 0;
        }
        if (effectiveStatus(q) === 'draft' || effectiveStatus(q) === 'sent') openCount++;
      }
    }
    return { monthCount, monthValue, openCount };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id('quotes'),
    status: v.union(v.literal('draft'), v.literal('sent'), v.literal('accepted'), v.literal('declined')),
  },
  returns: v.object({ id: v.id('quotes'), version: v.number(), updatedAt: v.number() }),
  handler: async (ctx, { id, status }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    const quote = await ctx.db.get(id);
    if (!quote || quote.deletedAt || !company || quote.companyId !== company._id) throw new Error('Quote not found');
    const updatedAt = Date.now();
    const version = (quote.version ?? 0) + 1;
    await ctx.db.patch(id, { status, version, updatedAt, updatedBy: subject });
    await ctx.db.insert('quoteVersions', {
      quoteId: id, companyId: company._id, version, changedAt: updatedAt, changedBy: subject, changeType: 'updated',
      snapshot: { clientId: quote.clientId, quoteNo: quote.quoteNo, date: quote.date, customer: quote.customer,
        customerNameKey: quote.customerNameKey, sections: quote.sections, finalCharge: quote.finalCharge, gst: quote.gst,
        validityDays: quote.validityDays, timeline: quote.timeline, terms: quote.terms, spec: quote.spec,
        showDims: quote.showDims, showSpec: quote.showSpec, total: quote.total, discount: quote.discount,
        gstAmt: quote.gstAmt, grand: quote.grand, itemCount: quote.itemCount, status },
    });
    return { id, version, updatedAt };
  },
});

// Load one quote — ownership-checked.
export const getQuote = query({
  args: { id: v.id('quotes') },
  returns: v.union(quoteDocValidator, v.null()),
  handler: async (ctx, { id }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    const quote = await ctx.db.get(id);
    if (!quote || quote.deletedAt || !company || quote.companyId !== company._id) return null;
    return quote;
  },
});

// Cloud sync: upsert by document id. The OFFICIAL quote number is assigned
// here on first save (server-side, sequential) — the browser never claims or
// picks the permanent number, so offline/temporary numbers can never stick.
// Also auto-saves the client book.
export const saveQuote = mutation({
  args: {
    id: v.optional(v.id('quotes')),
    version: v.optional(v.number()),
    clientId: v.optional(v.id('clients')),
    quoteNo: v.string(), // only ever a temporary display number — ignored for new quotes
    date: v.string(),
    customer: quoteCustomerValidator,
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
  },
  returns: saveQuoteReturns,
  handler: async (ctx, args) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    if (!company) throw new Error('No company yet — onboard first');
    assertQuoteLimits(args);

    // Serialize concurrent saves: every save touches the shared company doc,
    // so two devices saving the same new quote conflict → OCC auto-retry
    // → the retried run sees the first insert and patches instead of duplicating.
    await ctx.db.patch(company._id, { lastSyncAt: Date.now() });

    const updatedAt = Date.now();
    const existing = args.id ? await ctx.db.get(args.id) : null;
    if (existing && existing.companyId !== company._id) throw new ConvexError('Quote not found');
    if (existing?.deletedAt) throw new ConvexError('This quote is deleted. Restore it before editing.');
    if (existing && args.version !== (existing.version ?? 0)) {
      throw new ConvexError({
        code: 'QUOTE_CONFLICT',
        id: existing._id,
        cloudVersion: existing.version ?? 0,
        message: 'This quote was changed on another device. Reload it before saving.',
      });
    }

    // First save: the server issues the official sequential number. A legacy
    // quote may already hold that number (manually typed in the past), so
    // re-issue until the number is actually free.
    let quoteNo: string | null = null;
    if (!existing) {
      for (let i = 0; i < 10; i++) {
        const candidate = await issueQuoteNumber(ctx.db, company);
        const clash = await ctx.db
          .query('quotes')
          .withIndex('by_company_quoteNo', (q) => q.eq('companyId', company._id).eq('quoteNo', candidate))
          .first();
        if (!clash) { quoteNo = candidate; break; }
      }
      if (!quoteNo) throw new ConvexError('Could not reserve a quote number');
    }
    const issuedNo = existing?.quoteNo ?? (quoteNo as string);

    const client = await resolveClient(ctx.db, company, args, updatedAt);

    const data = {
      companyId: company._id,
      clientId: client?.id ?? existing?.clientId,
      quoteNo: issuedNo,
      customerNameKey: args.customer.name.trim().toLowerCase() || undefined,
      date: args.date,
      customer: args.customer,
      sections: args.sections,
      finalCharge: args.finalCharge,
      gst: args.gst,
      validityDays: args.validityDays,
      timeline: args.timeline,
      terms: args.terms,
      spec: args.spec,
      showDims: args.showDims,
      showSpec: args.showSpec,
      total: args.total,
      discount: args.discount,
      gstAmt: args.gstAmt,
      grand: args.grand,
      itemCount: args.itemCount,
      status: args.status ?? 'draft',
      createdAt: existing?.createdAt ?? updatedAt,
      updatedAt,
      version: (existing?.version ?? 0) + 1,
      createdBy: existing?.createdBy ?? subject,
      updatedBy: subject,
    };
    const quoteId = existing ? existing._id : await ctx.db.insert('quotes', data);
    if (existing) await ctx.db.patch(existing._id, data);
    // Snapshot cooldown: autosave fires on every debounced keystroke, so storing
    // a full snapshot on each save floods quoteVersions with near-duplicate rows
    // and makes "restore version" useless. Always snapshot a creation; for
    // updates, snapshot only when the previous one is older than the cooldown.
    // Version numbers still increment every save (they drive OCC) — snapshots
    // are just sparse audit points.
    const SNAPSHOT_COOLDOWN_MS = 60_000;
    let writeSnapshot = !existing;
    if (existing) {
      const last = await ctx.db
        .query('quoteVersions')
        .withIndex('by_quote_version', (q) => q.eq('quoteId', quoteId))
        .order('desc')
        .first();
      writeSnapshot = !last || updatedAt - last.changedAt >= SNAPSHOT_COOLDOWN_MS;
    }
    if (writeSnapshot) await ctx.db.insert('quoteVersions', {
      quoteId,
      companyId: company._id,
      version: data.version,
      changedAt: updatedAt,
      changedBy: subject,
      changeType: existing ? 'updated' : 'created',
      snapshot: {
        clientId: data.clientId,
        quoteNo: data.quoteNo,
        date: data.date,
        customer: data.customer,
        customerNameKey: data.customerNameKey,
        sections: data.sections,
        finalCharge: data.finalCharge,
        gst: data.gst,
        validityDays: data.validityDays,
        timeline: data.timeline,
        terms: data.terms,
        spec: data.spec,
        showDims: data.showDims,
        showSpec: data.showSpec,
        total: data.total,
        discount: data.discount,
        gstAmt: data.gstAmt,
        grand: data.grand,
        itemCount: data.itemCount,
        status: data.status,
      },
    });
    return {
      id: quoteId,
      version: data.version,
      updatedAt,
      quoteNo: data.quoteNo,
      clientId: data.clientId,
    };
  },
});

// Remove a quote from history — ownership-checked.
export const deleteQuote = mutation({
  args: { id: v.id('quotes') },
  returns: quoteMutationResultValidator,
  handler: async (ctx, { id }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    const quote = await ctx.db.get(id);
    if (!quote || quote.deletedAt || !company || quote.companyId !== company._id) {
      throw new Error('Quote not found');
    }
    const updatedAt = Date.now();
    const version = (quote.version ?? 0) + 1;
    await ctx.db.patch(id, {
      deletedAt: updatedAt,
      deletedBy: subject,
      updatedAt,
      updatedBy: subject,
      version,
    });
    await ctx.db.insert('quoteVersions', {
      quoteId: id,
      companyId: company._id,
      version,
      changedAt: updatedAt,
      changedBy: subject,
      changeType: 'deleted',
      snapshot: {
        clientId: quote.clientId,
        quoteNo: quote.quoteNo,
        date: quote.date,
        customer: quote.customer,
        customerNameKey: quote.customerNameKey,
        sections: quote.sections,
        finalCharge: quote.finalCharge,
        gst: quote.gst,
        validityDays: quote.validityDays,
        timeline: quote.timeline,
        terms: quote.terms,
        spec: quote.spec,
        showDims: quote.showDims,
        showSpec: quote.showSpec,
        total: quote.total,
        discount: quote.discount,
        gstAmt: quote.gstAmt,
        grand: quote.grand,
        itemCount: quote.itemCount,
        status: quote.status,
      },
    });
    return { id, version, updatedAt };
  },
});

// Deleted quotes remain recoverable and auditable instead of disappearing.
export const listDeletedQuotes = query({
  args: {
    cursor: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  returns: quoteListReturns,
  handler: async (ctx, { cursor, search }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    if (!company) return { quotes: [], nextCursor: null, done: true };
    const term = (search || '').trim().toLowerCase();
    const matched = [] as Array<{
      id: Id<'quotes'>; quoteNo: string; date: string; customerName: string;
      total: number; discount: number; gstAmt: number; grand: number;
      itemCount: number; status: string; updatedAt: number; deletedAt?: number;
    }>;
    let cur: string | null = cursor ?? null;
    let isDone = false;
    while (matched.length < 30 && !isDone) {
      const page = await ctx.db
        .query('quotes')
        .withIndex('by_company_updated', (q) => q.eq('companyId', company._id))
        .order('desc')
        .paginate({ numItems: 50, cursor: cur });
      isDone = page.isDone;
      cur = page.continueCursor;
      for (const q of page.page) {
        if (!q.deletedAt) continue;
        const name = (q.customer?.name || '').toLowerCase();
        if (term && !name.includes(term) && !q.quoteNo.toLowerCase().includes(term)) continue;
        matched.push({
          id: q._id,
          quoteNo: q.quoteNo,
          date: q.date,
          customerName: q.customer?.name || '',
          total: q.total,
          discount: q.discount,
          gstAmt: q.gstAmt,
          grand: q.grand,
          itemCount: q.itemCount,
          status: q.status || 'draft',
          updatedAt: q.updatedAt,
          deletedAt: q.deletedAt,
        });
        if (matched.length >= 30) break;
      }
    }
    return { quotes: matched, nextCursor: isDone ? null : cur, done: isDone };
  },
});

export const restoreQuote = mutation({
  args: { id: v.id('quotes') },
  returns: quoteMutationResultValidator,
  handler: async (ctx, { id }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    const quote = await ctx.db.get(id);
    if (!quote || !company || quote.companyId !== company._id) throw new Error('Quote not found');
    if (!quote.deletedAt) return { id, version: quote.version ?? 0, updatedAt: quote.updatedAt };
    const updatedAt = Date.now();
    const version = (quote.version ?? 0) + 1;
    await ctx.db.patch(id, {
      deletedAt: undefined,
      deletedBy: undefined,
      updatedAt,
      updatedBy: subject,
      version,
    });
    await ctx.db.insert('quoteVersions', {
      quoteId: id,
      companyId: company._id,
      version,
      changedAt: updatedAt,
      changedBy: subject,
      changeType: 'restored',
      snapshot: {
        clientId: quote.clientId,
        quoteNo: quote.quoteNo,
        date: quote.date,
        customer: quote.customer,
        customerNameKey: quote.customerNameKey,
        sections: quote.sections,
        finalCharge: quote.finalCharge,
        gst: quote.gst,
        validityDays: quote.validityDays,
        timeline: quote.timeline,
        terms: quote.terms,
        spec: quote.spec,
        showDims: quote.showDims,
        showSpec: quote.showSpec,
        total: quote.total,
        discount: quote.discount,
        gstAmt: quote.gstAmt,
        grand: quote.grand,
        itemCount: quote.itemCount,
        status: quote.status,
      },
    });
    return { id, version, updatedAt };
  },
});

export const restoreQuoteVersion = mutation({
  args: {
    quoteId: v.id('quotes'),
    version: v.number(),
  },
  returns: quoteMutationResultValidator,
  handler: async (ctx, { quoteId, version: requestedVersion }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    const quote = await ctx.db.get(quoteId);
    if (!company || !quote || quote.companyId !== company._id) throw new Error('Quote not found');
    const historical = await ctx.db
      .query('quoteVersions')
      .withIndex('by_quote_version', (q) => q.eq('quoteId', quoteId).eq('version', requestedVersion))
      .first();
    if (!historical) throw new Error('Quote version not found');
    const updatedAt = Date.now();
    const version = (quote.version ?? 0) + 1;
    const snapshot = historical.snapshot;
    await ctx.db.patch(quoteId, {
      clientId: snapshot.clientId,
      quoteNo: snapshot.quoteNo,
      date: snapshot.date,
      customer: snapshot.customer,
      customerNameKey: snapshot.customerNameKey,
      sections: snapshot.sections,
      finalCharge: snapshot.finalCharge,
      gst: snapshot.gst,
      validityDays: snapshot.validityDays,
      timeline: snapshot.timeline,
      terms: snapshot.terms,
      spec: snapshot.spec,
      showDims: snapshot.showDims,
      showSpec: snapshot.showSpec,
      total: snapshot.total,
      discount: snapshot.discount,
      gstAmt: snapshot.gstAmt,
      grand: snapshot.grand,
      itemCount: snapshot.itemCount,
      status: snapshot.status,
      deletedAt: undefined,
      deletedBy: undefined,
      updatedAt,
      updatedBy: subject,
      version,
    });
    await ctx.db.insert('quoteVersions', {
      quoteId,
      companyId: company._id,
      version,
      changedAt: updatedAt,
      changedBy: subject,
      changeType: 'restored',
      snapshot,
    });
    return { id: quoteId, version, updatedAt };
  },
});

export const listQuoteVersions = query({
  args: {
    quoteId: v.id('quotes'),
    cursor: v.optional(v.string()),
  },
  returns: versionListReturns,
  handler: async (ctx, { quoteId, cursor }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    const quote = await ctx.db.get(quoteId);
    if (!company || !quote || quote.companyId !== company._id) throw new Error('Quote not found');
    const page = await ctx.db
      .query('quoteVersions')
      .withIndex('by_quote_version', (q) => q.eq('quoteId', quoteId))
      .order('desc')
      .paginate({ numItems: 30, cursor: cursor ?? null });
    return {
      versions: page.page.map((version) => ({
        id: version._id,
        quoteId: version.quoteId,
        version: version.version,
        changedAt: version.changedAt,
        changedBy: version.changedBy,
        changeType: version.changeType,
        snapshot: version.snapshot,
      })),
      nextCursor: page.isDone ? null : page.continueCursor,
      done: page.isDone,
    };
  },
});
