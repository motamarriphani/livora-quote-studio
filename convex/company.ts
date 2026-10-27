import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireSubject, getCompanyForUser, assertCatalogLimits } from './common';
import { catalogDocValidator, catalogItemValidator, catalogServiceValidator, specRowValidator } from './validators';

// First-login onboarding: create the user's company + seed their catalog
// with the client-supplied defaults (the app's built-in items/services/
// materials/terms stay the single source of that seed data).
export const ensureCompany = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    seed: v.object({
      items: v.array(catalogItemValidator),
      services: v.array(catalogServiceValidator),
      materials: v.array(specRowValidator),
      terms: v.array(v.string()),
    }),
  },
  returns: v.object({
    companyId: v.id('companies'),
    catalog: v.union(catalogDocValidator, v.null()),
    created: v.boolean(),
  }),
  handler: async (ctx, { name, slug, seed }) => {
    const subject = await requireSubject(ctx);
    assertCatalogLimits(seed);
    let company = await getCompanyForUser(ctx, subject);
    if (company) {
      const existingCompany = company;
      const catalog = await ctx.db
        .query('catalogs')
        .withIndex('by_company', (q) => q.eq('companyId', existingCompany._id))
        .first();
      return { companyId: existingCompany._id, catalog: catalog ?? null, created: false };
    }
    const companyId = await ctx.db.insert('companies', {
      clerkUserId: subject,
      name,
      slug,
      createdAt: Date.now(),
      lastSyncAt: Date.now(),
    });
    // Lost a parallel-tab double-insert race? Drop mine, use the survivor.
    company = await getCompanyForUser(ctx, subject);
    if (company && company._id !== companyId) {
      await ctx.db.delete(companyId);
      const catalog = await ctx.db
        .query('catalogs')
        .withIndex('by_company', (q) => q.eq('companyId', company._id))
        .first();
      return { companyId: company._id, catalog: catalog ?? null, created: false };
    }
    const catalogId = await ctx.db.insert('catalogs', {
      companyId,
      items: seed.items,
      services: seed.services,
      materials: seed.materials,
      terms: seed.terms,
      updatedAt: Date.now(),
    });
    const catalog = await ctx.db.get(catalogId);
    return { companyId, catalog: catalog ?? null, created: true };
  },
});
