import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import math from '../quote-math.js';

const sections = [
  { items: [{ name: 'Wardrobe', w: 5, h: 8, rate: 1500 }, { name: 'Paint', lump: true, rate: 25000 }] },
];
const total = 85000;

assert.equal(math.itemAmount({ w: 5, h: 8, rate: 1500 }), 60000);
assert.equal(math.itemAmount({ lump: true, rate: 25000 }), 25000);
assert.equal(math.sectionTotal(sections[0]), total);
assert.equal(math.quoteTotal(sections), total);
assert.equal(math.taxableBase(total, 80000), 80000);
assert.equal(math.discountAmount(total, 80000), 5000);
assert.equal(math.gstAmount(80000, 5), 4000);
assert.equal(math.grandTotal(total, 80000, 5), 84000);
assert.equal(math.itemCount(sections), 2);

const schema = await readFile(new URL('../convex/schema.ts', import.meta.url), 'utf8');
const quotes = await readFile(new URL('../convex/quotes.ts', import.meta.url), 'utf8');
const catalog = await readFile(new URL('../convex/catalog.ts', import.meta.url), 'utf8');
const company = await readFile(new URL('../convex/company.ts', import.meta.url), 'utf8');

assert.equal(schema.includes('v.any('), false, 'schema must not store untyped values');
assert.equal(quotes.includes('v.any('), false, 'quote endpoint must not accept untyped values');
assert.equal(catalog.includes('v.any('), false, 'catalog endpoint must not accept untyped values');
assert.equal(company.includes('v.any('), false, 'company seed must not accept untyped values');
assert.match(schema, /quoteVersions: defineTable/);
assert.match(schema, /by_company_lastQuotedAt/);
assert.match(quotes, /export const restoreQuote = mutation/);
assert.match(quotes, /export const restoreQuoteVersion = mutation/);
assert.match(quotes, /export const listQuoteVersions = query/);
assert.match(quotes, /!phone && !existing\.phone/);
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
const cloud = await readFile(new URL('../cloud.js', import.meta.url), 'utf8');
assert.equal(cloud.includes('...(cursor ? { cursor } : {})'), true);
assert.match(app, /resetLocalForSignedOut/);
assert.match(app, /state\.cloudId = null;[\s\S]*loadSample/);
assert.match(app, /importJSON[\s\S]*state\.cloudId = null/);
assert.match(app, /function actorLabel/);
assert.match(app, /preview-quote/);
assert.match(app, /quote-menu/);
assert.match(app, /create-client-quote/);
assert.match(app, /client-context/);
assert.match(app, /toggle-profile-menu/);
assert.match(app, /menu-logout/);
assert.match(app, /function quoteRowHtml/);
assert.match(app, /loadClientQuotePage/);
assert.match(app, /function closeQuotePreview/);
assert.match(app, /case 'back-to-builder': closeQuotePreview\(\);/);
assert.match(app, /catAddBtn/);
assert.match(app, /cat-price/);
assert.match(app, /catItemsSearch/);
assert.match(app, /cat-page-next/);
assert.match(app, /open-up/);
assert.match(styles, /\.cat-price \{/);
assert.match(styles, /\.cat-item-row \{/);
assert.match(styles, /\.cat-pager \{/);
assert.match(quotes, /clientId: v\.optional\(v\.id\('clients'\)\)/);
assert.match(cloud, /clientId \? \{ clientId \} : \{\}\)/);
assert.match(styles, /\.section-card\.collapsed \.sec-body/);
assert.match(styles, /grid-template-columns: minmax\(140px/);
for (const [file, source] of [['quotes.ts', quotes], ['catalog.ts', catalog], ['company.ts', company]]) {
  const registered = [...source.matchAll(/export const \w+ = (?:query|mutation)\(\{/g)].length;
  const returns = [...source.matchAll(/\breturns:/g)].length;
  assert.equal(registered, returns, `${file} functions need return validators`);
}

const clients = await readFile(new URL('../convex/clients.ts', import.meta.url), 'utf8');
const clientRegistered = [...clients.matchAll(/export const \w+ = (?:query|mutation)\(\{/g)].length;
const clientReturns = [...clients.matchAll(/\breturns:/g)].length;
assert.equal(clientRegistered, clientReturns, 'clients.ts functions need return validators');

console.log('unit: quote math and backend contracts passed');
