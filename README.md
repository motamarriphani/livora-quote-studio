# LIVORA Interiors — Quote Studio 🛋️

A mobile-first **quote builder webapp** for creating interior-work quotations on the go — while talking to clients on a call. Shopping-cart style: pick items, set measurements, watch totals update live, then export a professional quotation template (print → PDF).

Since **v2.1**, the app is also your **account**: sign in with your email and every quote, catalog change, and client is saved to the cloud automatically — your phone and laptop always show the same data.

## What's new in v2.1

- **Accounts & cloud sync** — sign in with a one-time code sent to your email (no passwords). Quotes save to your device instantly, then sync to the cloud in the background. Works offline, and your phone + laptop share the same data.
- **Your catalog** — a 4-tab screen (Services · Items · Materials · Terms) you can edit. The builder's item sheet and new quotes use it.
- **Quote history** — every quote is saved automatically. Tap one to reopen it, or delete it when you're done.
- **Sequential quote numbers** — `LQ-2026-001`, `LQ-2026-002`, … assigned in order, so no two quotes ever share a number.
- **Client auto-book** — every customer you quote is added to your client list automatically.

## Features

- **Sign in with email** — a one-time code, no password to remember; sign out from the catalog screen
- **Item library** — 20 pre-loaded items (wardrobe box, loft, beds, TV units, pooja mandir, kitchen cabinets, gypsum ceiling, painting, electrical…) with rates & default measurements from the standard LIVORA rate card — this is also what your cloud catalog starts from
- **Rooms / sections** — Master Bedroom, Kitchen, Hall, etc. Add, rename, collapse, delete
- **Live math** — `W × H × rate` auto-calculated per item, per-room subtotals, TOTAL → DISCOUNT → GST → GRAND TOTAL (₹, Indian formatting); lump-sum items (painting, electrical) use a flat amount instead
- **Discount & GST** — set both on the fly in the sticky bar; GST row appears in the totals when set
- **Custom items** — lump-sum items or measured items, added in seconds
- **Final template** — one tap → professional quotation matching the LIVORA letterhead: company header, customer block, S.NO / DESCRIPTION / W / H / BOX / RATE / AMOUNT table with per-room subtotals, TOTAL → DISCOUNT → GST → GRAND TOTAL, **amount in words**, terms & conditions, material specification, validity & timeline, signature blocks
- **Download PDF** — one-tap client-side PDF via pdfmake (crisp vector text, page numbers, A4); **Print** also works as a fallback (browser "Save as PDF")
- **Autosave** — saves instantly to the device (localStorage), then syncs to the cloud; export/import JSON as an extra backup
- **Sample quote** 🧪 — loads the reference ₹22L quote for a quick demo

## Accounts & cloud sync

- **Sign in** — open the app and enter your email; you'll get a one-time code (no password). The app opens straight into the builder once you're in.
- **Every quote auto-saves** — as you type, the quote saves to your device instantly, then quietly syncs to the cloud a moment after you stop (no save button needed).
- **Works offline** — once signed in, you can keep building quotes with no connection; they sync automatically the next time you're online.
- **Phone + laptop share data** — open the same site on both, sign in, and both see your quotes, catalog, and clients. If you edit a quote on one device, the other picks up the newer version.
- **Print / preview links** (`?print=1`, `?preview=1`) skip login and the cloud entirely — they just render the quote template.

## Your catalog (Services · Items · Materials · Terms)

- Open it with the **📚** button in the top bar. Four tabs: **Services** (lump-sum lines like painting & electrical), **Items** (measured items with rate and default W×H), **Materials** (specification rows for the quote), **Terms** (your terms & conditions list).
- **Edit** — tap the ✏️ on any row to change it, or **＋ Add** to create a new one; 🗑 deletes. Changes sync to your account automatically.
- **Where it's used** — the builder's add-item sheet lists your Items/Services when you're signed in (with the built-in library as an offline fallback), and **new** quotes start with your Materials and Terms.
- **Old quotes keep their own snapshot** — a quote you made earlier keeps the exact terms & spec it was built with, even if you've changed the catalog since.

## Quote history

- Every quote is **saved automatically** with its number, date, customer, item count, and totals.
- Open it with the **🕘** button — a sheet lists all your quotes, newest first. **Tap one to reopen it** (edit it, download a fresh PDF), or **🗑 to delete** it from history (PDFs you already sent stay yours).
- History lives in the cloud, so it's the same on every device.

## Quote numbers

- Quotes get a **sequential number** from the server: `LQ-2026-001`, `LQ-2026-002`, … — one counter per year, so numbers never repeat or collide between devices.
- The **official number is assigned on first cloud save** — the browser never picks the permanent number. While offline the quote shows a temporary placeholder number, which is automatically replaced by the next official `LQ-YYYY-NNN` as soon as the quote syncs.

## Client auto-book

- Every quote you save **adds the customer to your client book automatically** — name, phone, address, and when they were last quoted. No data entry beyond the quote itself.
- Clients are separate records with their own ID — two different people who share a name never merge. Reuse a client by picking them from the list in the builder; merging two records is only ever an explicit choice on the Clients page.

## Usage

| Action | How |
|---|---|
| Sign in | Open the app → enter your email → enter the one-time code |
| Add an item | Open a room → **＋ Add item** → tap from your catalog (or **Custom item**) |
| Edit measurements | Tap W / H / Rate fields — totals recalc instantly |
| Discount / GST | Enter in the bottom bar (GST row appears in totals + amount-in-words updates) |
| Final quote | **Preview quote** → **⬇ Download PDF** (client-side) or **Print** |
| Validity / timeline | Set in the Customer card — appears in the quote header + terms |
| Print-ready link | `index.html?print=1` (bookmarks straight to the template); `index.html?preview=1` for the interactive preview |
| Edit your catalog | **📚** top bar → pick a tab → ✏️ / ＋ / 🗑 |
| Quote history | **🕘** top bar → tap a quote to reopen → 🗑 to delete |
| Sign out | **📚** catalog screen → **Sign out** |
| Backup | ⭳ export JSON / ⭱ import JSON |
| Fresh quote | ✕ reset (the current quote is kept in history) |

## Run locally

```bash
npm install               # once — installs the Convex CLI (needed for cloud work)
python -m http.server 8130   # or: npm run dev
# then open http://localhost:8130
```

No build step — the frontend is plain HTML/CSS/JS served as-is. For **backend work** (the Convex functions in `convex/`), run `npm run convex:dev` (`npx convex dev`) in another terminal.

## Deploy

- **Static site** — pushing to `main` auto-deploys to **https://livora-quote.pages.dev** via Cloudflare Pages; live in ~30 seconds.
- **Backend** — the Convex cloud backend deploys **separately**: `npm run convex:deploy` (`npx convex deploy`).
- **This Accounts branch is staging-only** — it previews at **accounts-livora.pages.dev** until it's merged into `main`. Only `main` is the live site.

## Architecture

- **Frontend** — a static site: vanilla HTML/CSS/JS, zero build step. `index.html` + `styles.css` + `app.js` (builder, quote template, totals, PDF) + `cloud.js` (the bridge to login & cloud).
- **Backend** — Convex (in `convex/`), one table per concern:
  - `companies` — one row per account (the tenant boundary); also holds the quote-number counter so it can never double-issue
  - `catalogs` — your services, items, materials, terms
  - `quotes` — every quote ever made (history + sync)
  - `clients` — the auto-saved client book
- **Quote numbers** — sequential `LQ-2026-001`, `LQ-2026-002`, … per company per year
- **Auth** — Clerk, email one-time-code. Every backend function checks the signed-in user, and each account only ever sees its own data.
- **Local-first sync** — quotes save to the device instantly, then push to the cloud in the background (debounced); if another device edited the same quote, the app asks you to resolve it (reload the cloud version, keep your changes as a copy, or merge).
- **Vendored SDKs** — the Clerk and Convex SDKs are bundled in `vendor/`, so login & cloud need **no CDN**. (The PDF engine, pdfmake, still loads from CDN with an automatic fallback, as before.)

## Structure

```
index.html   — builder view + final template view + modals + login overlay
styles.css   — design system (warm interiors palette) + A4 print styles
app.js       — state, catalog, rendering, quote template, PDF, history & catalog UI
cloud.js     — Clerk sign-in + Convex sync bridge (local-first, debounced push)
convex/      — backend: schema.ts (tables above) + auth-gated functions (company, catalog, quotes, clients, common)
vendor/      — Clerk & Convex SDKs, bundled locally (no CDN dependency)
package.json — convex dependency + npm scripts (dev, convex:dev, convex:deploy)
```
