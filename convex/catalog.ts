import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireSubject, getCompanyForUser, assertCatalogLimits } from './common';
import {
  catalogDocValidator,
  catalogItemValidator,
  catalogServiceValidator,
  specRowValidator,
} from './validators';

export const getCatalog = query({
  args: {},
  returns: v.union(catalogDocValidator, v.null()),
  handler: async (ctx) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    if (!company) return null;
    return ctx.db
      .query('catalogs')
      .withIndex('by_company', (q) => q.eq('companyId', company._id))
      .first();
  },
});

export const saveCatalog = mutation({
  args: {
    items: v.array(catalogItemValidator),
    services: v.array(catalogServiceValidator),
    materials: v.array(specRowValidator),
    terms: v.array(v.string()),
  },
  returns: v.union(catalogDocValidator, v.null()),
  handler: async (ctx, args) => {
    const subject = await requireSubject(ctx);
    const company = await getCompanyForUser(ctx, subject);
    if (!company) throw new Error('No company yet — onboard first');
    assertCatalogLimits(args);
    const data = {
      companyId: company._id,
      items: args.items,
      services: args.services,
      materials: args.materials,
      terms: args.terms,
      updatedAt: Date.now(),
    };
    const existing = await ctx.db
      .query('catalogs')
      .withIndex('by_company', (q) => q.eq('companyId', company._id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return ctx.db.get(existing._id);
    }
    const id = await ctx.db.insert('catalogs', data);
    return ctx.db.get(id);
  },
});
