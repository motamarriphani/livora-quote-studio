import { query, mutation, QueryCtx, MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { requireSubject, getCompanyForUser } from './common';

// Same rule as quotes.ts: only a sent quote can expire.
function effectiveStatus(quote: { status?: string; date: string; validityDays: number }) {
  if (quote.status !== 'sent') return quote.status || 'draft';
  const expiry = new Date(quote.date + 'T23:59:59').getTime() + quote.validityDays * 86400000;
  return expiry < Date.now() ? 'expired' : 'sent';
}
import { clientSummaryValidator } from './validators';

const clientListReturns = v.object({
  clients: v.array(clientSummaryValidator),
  nextCursor: v.union(v.string(), v.null()),
  done: v.boolean(),
});

// Convex allows only one paginated query per query function. listClients uses
// that one pagination slot for the client list, so these per-client counts use
// indexed non-paginated reads instead of attempting nested pagination.
async function countLinkedQuotes(db: QueryCtx['db'], companyId: Id<'companies'>, clientId: Id<'clients'>) {
  const quotes = await db
    .query('quotes')
    .withIndex('by_company_client', (q) => q.eq('companyId', companyId).eq('clientId', clientId))
    .filter((q) => q.eq(q.field('deletedAt'), undefined))
    .collect();
  return quotes.length;
}

// Legacy quotes (no clientId) grouped by lowercased customer name. Some older
// quotes have no customerNameKey, so fall back to the embedded customer name.
// Built ONCE per listClients call and shared by every client's count + rows —
// the old code re-scanned the whole quote table per client (O(clients × quotes)).
async function legacyQuotesByName(db: QueryCtx['db'], companyId: Id<'companies'>) {
  const quotes = await db
    .query('quotes')
    .withIndex('by_company_updated', (q) => q.eq('companyId', companyId))
    .filter((q) => q.eq(q.field('clientId'), undefined))
    .filter((q) => q.eq(q.field('deletedAt'), undefined))
    .collect();
  const byKey = new Map<string, typeof quotes>();
  for (const q of quotes) {
    const key = (q.customerNameKey || q.customer?.name || '').trim().toLowerCase();
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(q);
  }
  return byKey;
}

// Quote rows linked to a client, most recent first.
// New quotes link via clientId; legacy quotes (created before clientId
// existed) match by lowercased name — both are counted so no quote is ever
// invisible from a client's history.
async function linkedQuoteRows(db: QueryCtx['db'], companyId: Id<'companies'>, clientId: Id<'clients'>) {
  return db
    .query('quotes')
    .withIndex('by_company_client_updated', (q) => q.eq('companyId', companyId).eq('clientId', clientId))
    .filter((q) => q.eq(q.field('deletedAt'), undefined))
    .order('desc')
    .take(30);
}

// The auto-saved client book — for the Clients page.
// Cursor-paginated (newest-quoted first) so old clients never silently
// disappear; `search` filters by name/phone/address across the whole book.
export const listClients = query({
  args: {
    cursor: v.optional(v.string()),
    search: v.optional(v.string()),
    archivedOnly: v.optional(v.boolean()),
  },
  returns: clientListReturns,
  handler: async (ctx, { cursor, search, archivedOnly }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    if (!company) return { clients: [], nextCursor: null, done: true };
    const term = (search || '').trim().toLowerCase();
    const pageSize = 30;
    const out: {
      id: Id<'clients'>;
      name: string;
      phone: string;
      address: string;
      lastQuotedAt: number;
      quoteCount: number;
      archivedAt?: number;
      quotes: { id: Id<'quotes'>; quoteNo: string; date: string; grand: number; status: string; updatedAt: number }[];
    }[] = [];
    let cur: string | null = cursor ?? null;
    let isDone = false;
    const legacyByKey = await legacyQuotesByName(ctx.db, company._id);
    while (out.length < pageSize && !isDone) {
      const page = await ctx.db
        .query('clients')
        .withIndex('by_company_lastQuotedAt', (q) => q.eq('companyId', company._id))
        .order('desc')
        .paginate({ numItems: 50, cursor: cur });
      isDone = page.isDone;
      cur = page.continueCursor;
      for (const c of page.page) {
        if (archivedOnly ? !c.archivedAt : c.archivedAt) continue;
        const hay = (c.name || '') + ' ' + (c.phone || '') + ' ' + (c.address || '');
        if (term && !hay.toLowerCase().includes(term)) continue;
        // Accurate counts — never truncated by pagination:
        // quotes linked by clientId + legacy quotes matched by name.
        const legacy = legacyByKey.get(c.nameKey) || [];
        const linkedCount = await countLinkedQuotes(ctx.db, company._id, c._id);
        const linked = await linkedQuoteRows(ctx.db, company._id, c._id);
        const byId = new Map<string, typeof linked[number]>();
        for (const q of [...linked, ...legacy]) if (!byId.has(q._id)) byId.set(q._id, q);
        const rows = [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30);
        out.push({
          id: c._id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          lastQuotedAt: c.lastQuotedAt,
          quoteCount: linkedCount + legacy.length,
          quotes: rows.map((q) => ({
            id: q._id,
            quoteNo: q.quoteNo,
            date: q.date,
            grand: q.grand,
            status: effectiveStatus(q),
            updatedAt: q.updatedAt,
          })),
          archivedAt: c.archivedAt,
        });
        if (out.length >= pageSize) break;
      }
    }
    return { clients: out, nextCursor: isDone ? null : cur, done: isDone };
  },
});

// Re-point every quote linked to `fromId` onto `toId`.
async function moveQuotes(ctxDb: MutationCtx['db'], companyId: Id<'companies'>, fromId: Id<'clients'>, toId: Id<'clients'>) {
  let cursor: string | null = null;
  let done = false;
  while (!done) {
    const page = await ctxDb
      .query('quotes')
      .withIndex('by_company_client', (q) => q.eq('companyId', companyId).eq('clientId', fromId))
      .paginate({ numItems: 200, cursor });
    done = page.isDone;
    cursor = page.continueCursor;
    for (const q of page.page) await ctxDb.patch(q._id, { clientId: toId });
  }
}

// Legacy quotes (no clientId) that carry this client's name — claim them for
// the surviving client during a deliberate merge.
async function moveNameKeyQuotes(ctxDb: MutationCtx['db'], companyId: Id<'companies'>, nameKey: string, toId: Id<'clients'>) {
  let cursor: string | null = null;
  let done = false;
  while (!done) {
    const page = await ctxDb
      .query('quotes')
      .withIndex('by_company_nameKey', (q) => q.eq('companyId', companyId).eq('customerNameKey', nameKey))
      .filter((q) => q.eq(q.field('clientId'), undefined))
      .paginate({ numItems: 200, cursor });
    done = page.isDone;
    cursor = page.continueCursor;
    for (const q of page.page) await ctxDb.patch(q._id, { clientId: toId });
  }
}

// Remove the clientId link from a deleted client's quotes (history keeps the
// customer snapshot embedded, so the quotes survive the deletion).
async function unlinkQuotes(ctxDb: MutationCtx['db'], companyId: Id<'companies'>, clientId: Id<'clients'>) {
  let cursor: string | null = null;
  let done = false;
  while (!done) {
    const page = await ctxDb
      .query('quotes')
      .withIndex('by_company_client', (q) => q.eq('companyId', companyId).eq('clientId', clientId))
      .paginate({ numItems: 200, cursor });
    done = page.isDone;
    cursor = page.continueCursor;
    for (const q of page.page) await ctxDb.patch(q._id, { clientId: undefined });
  }
}

// Manual client add/update from the Clients page.
// Clients are identified by their record id — two people who share a name
// stay separate records. Merging happens ONLY through the explicit
// mergeIntoId option (a deliberate user choice), never by name alone.
export const saveClient = mutation({
  args: {
    id: v.optional(v.id('clients')),
    name: v.string(),
    phone: v.string(),
    address: v.string(),
    mergeIntoId: v.optional(v.id('clients')),
  },
  returns: v.object({ id: v.id('clients') }),
  handler: async (ctx, { id, name, phone, address, mergeIntoId }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    if (!company) throw new Error('No company yet — onboard first');
    const clean = name.trim();
    if (!clean) throw new Error('Client name is required');

    if (id) {
      const existing = await ctx.db.get(id);
      if (!existing || existing.companyId !== company._id) {
        throw new Error('Client not found');
      }
      if (mergeIntoId && mergeIntoId !== id) {
        const target = await ctx.db.get(mergeIntoId);
        if (!target || target.companyId !== company._id) {
          throw new Error('Merge target not found');
        }
        // Deliberate merge: every quote of this client moves to the survivor,
        // the survivor keeps its own name and details (only blanks are filled
        // from this record), and this record dies.
        await moveQuotes(ctx.db, company._id, id, mergeIntoId);
        await moveNameKeyQuotes(ctx.db, company._id, existing.nameKey, mergeIntoId);
        await ctx.db.patch(target._id, {
          phone: target.phone || phone || '',
          address: target.address || address || '',
          lastQuotedAt: Math.max(target.lastQuotedAt, existing.lastQuotedAt),
        });
        await ctx.db.delete(id);
        return { id: mergeIntoId };
      }
      await ctx.db.patch(id, {
        name: clean,
        nameKey: clean.toLowerCase(),
        phone,
        address,
      });
      return { id };
    }

    // New client: always a fresh record. No name-based reuse or merging —
    // the user picks an existing client from the list when they mean one.
    const newId = await ctx.db.insert('clients', {
      companyId: company._id,
      name: clean,
      nameKey: clean.toLowerCase(),
      phone,
      address,
      createdAt: Date.now(),
      lastQuotedAt: Date.now(),
    });
    return { id: newId };
  },
});

// Remove a client from the book — ownership-checked.
export const deleteClient = mutation({
  args: { id: v.id('clients') },
  returns: v.boolean(),
  handler: async (ctx, { id }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    const client = await ctx.db.get(id);
    if (!client || !company || client.companyId !== company._id) {
      throw new Error('Client not found');
    }
    await unlinkQuotes(ctx.db, company._id, id);
    await ctx.db.delete(id);
    return true;
  },
});

// Hide a client from the address book without touching any saved quotes.
export const archiveClient = mutation({
  args: { id: v.id('clients') },
  returns: v.boolean(),
  handler: async (ctx, { id }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    const client = await ctx.db.get(id);
    if (!client || !company || client.companyId !== company._id) throw new Error('Client not found');
    await ctx.db.patch(id, { archivedAt: Date.now() });
    return true;
  },
});

// Bring an archived client back into the active client book.
export const unarchiveClient = mutation({
  args: { id: v.id('clients') },
  returns: v.boolean(),
  handler: async (ctx, { id }) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    const client = await ctx.db.get(id);
    if (!client || !company || client.companyId !== company._id) throw new Error('Client not found');
    await ctx.db.patch(id, { archivedAt: undefined });
    return true;
  },
});

