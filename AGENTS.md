# AGENTS.md — LIVORA Quote Studio (accounts edition, v2.2)

Mobile-first quote builder for LIVORA Interiors with accounts and cloud sync. Static frontend (vanilla HTML/CSS/JS, no build step) + Convex backend + Clerk login. Users build quotes on their phones during client calls, then download a PDF quotation.

This is the **accounts edition**. The original no-login site lives in a separate repo (`livora quotation`, deployed at https://livora-quote.pages.dev). Do not mix the two.

## React rewrite (in progress, branch `react-rewrite`)

`web/` is the new frontend: Vite + React + TypeScript, Convex React hooks, Clerk React, pdfmake/pdf.js loaded lazily. It is **online-only** (no local-first sync); the cloud copy is the truth. Scripts: `npm run web:dev` (http://localhost:8131), `web:test`, `web:typecheck`, `web:build` (→ `web/dist`). It talks to the same Convex deployment as the live app, so backend changes must stay backwards-compatible until the old frontend is retired. The old vanilla app (root `index.html`, `app.js`, `cloud.js`) still deploys from `main` unchanged.

## Deploy (IMPORTANT)

- **Frontend** → Cloudflare Pages project `accounts-livora` (https://accounts-livora.pages.dev). It is a **Direct Upload** project (no Git integration), so `git push` alone does NOT deploy. Deploy with `npm run deploy` or the GitHub Actions workflow (`.github/workflows/deploy.yml`, runs on push to `main` once the repo secrets are set).
- **Never deploy the repo root.** It contains `.env.local` (Clerk secret key), `convex/` sources, QA scripts and review notes — anything in the uploaded folder is publicly downloadable. `npm run stage` copies only the browser files (`index.html`, `styles.css`, `app.js`, `cloud.js`, `quote-math.js`, `vendor/`) into `public/`; deploy that folder only.
- **Backend** → Convex, deployed separately: `npm run convex:deploy`.
- Never commit secrets or client PII. `.env.local` is gitignored; keep it that way.

## Workflow for changes

1. Edit files locally.
2. `npm test` (static checks: syntax of app/cloud/convex files, math unit tests).
3. Run locally: `npm run dev` → http://localhost:8130 (backend work: `npm run convex:dev` in a second terminal).
4. Commit and push to `main`.
5. Deploy: `npm run deploy` (stages `public/`, then `wrangler pages deploy`). Verify with `curl -sL -A "Mozilla/5.0" https://accounts-livora.pages.dev/ | grep <changed-marker>`, and confirm `https://accounts-livora.pages.dev/.env.local` does not return the secrets file.
6. If `convex/` changed, also `npm run convex:deploy`.

When changing cached assets, bump the `?v=NN` query strings in `index.html`.

## Structure

- `index.html` — login overlay, app shell (sidebar, dashboard, clients), builder view, quote template view, modals
- `styles.css` — design system + `@media print` A4 rules (the print block MUST stay at the END of the file)
- `app.js` — state, catalog UI, dashboard/clients/history, rendering, totals, pdfmake PDF generation, delegated click handler (`data-action`)
- `cloud.js` — Clerk sign-in + Convex sync bridge (local-first, debounced push, conflict handling)
- `quote-math.js` — pure money math (UMD, shared with the Node tests and the PDF harness)
- `convex/` — backend: `schema.ts`, `validators.ts`, `common.ts`, `company.ts`, `catalog.ts`, `clients.ts`, `quotes.ts` (every function is auth-gated; the tenant is derived from the signed-in user, never from client input)
- `vendor/` — Clerk and Convex browser SDKs, bundled (no CDN for login/cloud; pdfmake still loads from CDN with fallback)
- `scripts/` — `verify.mjs` (`npm test`), `unit.mjs`, `stage-public.mjs` (deploy staging)
- `.qa/` — browser-driven QA phases; `REVIEW-ACCOUNTS.md` / `TESTING-ACCOUNTS.md` — Aug 2026 review and test plan (all review findings verified fixed as of Oct 2026)

## App behavior notes

- Local-first: saves to localStorage on every change, then pushes to Convex after a short debounce. Works offline.
- Quote numbers: `LQ-YYYY-NNN`, issued by the server on first cloud save (counter lives on the company doc, so concurrent issues serialize). The browser only shows a temporary placeholder until then.
- Edits are version-checked; a stale save raises the conflict flow (reload cloud version / keep mine as a copy / merge).
- Quotes have a status (draft, sent, accepted, declined; expiry is derived from date + validity), version snapshots with restore, and soft delete with restore.
- Item math: amount = W × H × rate (sqft); lump items = flat amount. Discount is derived from the agreed final charge; GST is calculated separately on the final amount.
- `?print=1` → print-ready quote; `?preview=1` → interactive preview; both skip login and cloud.
- Data model: sections (rooms) with items {name, w, h, rate, lump}; customer (+ clientId); finalCharge; gst %; validityDays; timeline; terms[]; spec[{c,d}].
