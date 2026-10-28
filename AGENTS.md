# AGENTS.md — LIVORA Quote Studio (v3, React)

Mobile-first quote builder for LIVORA Interiors. Designers build quotes on their phones during client calls and download a PDF quotation. Frontend: Vite + React + TypeScript in `web/`. Backend: Convex in `convex/`. Login: Clerk.

This is the **accounts edition**. The original no-login site lives in a separate repo (`livora quotation`, deployed at https://livora-quote.pages.dev). Do not mix the two.

## Principles

- Cut taglines, helper text and secondary labels. If a screen needs them to make sense, fix the layout.
- Make the best decision that will elevate all three: the user experience (UX), developer experience (DX), and agent experience (AX) always, without breaking anything.

## Decisions (keep to these)

- **Online-only.** The cloud copy is the truth; there is no offline/local-first sync. Short connection drops are covered by the Convex client queueing mutations while the page is open, and a banner says so. Don't add IndexedDB, service workers or outbox sync unless asked.
- **One editor owns one quote.** `web/src/lib/useQuoteEditor.ts` autosaves ~1 s after edits and flushes pending saves when you leave. Never share a mutable "current quote" across screens.
- **Quote numbers are issued by the server** on the first save, and a quote is only saved once it has at least one item (no numbers burned by empty drafts; the sample quote is never saved).
- **Client book changes only on explicit actions:** picking/adding a client, or preview/download (`saveQuote` with `autoBook: true`). Autosave sends `autoBook: false`.
- **Sent/accepted/declined quotes are locked** behind "Create a revision" (a new draft copy) or "Edit anyway". Only sent quotes can expire (derived from date + validity, never stored).
- **Money math** lives in `web/src/lib/math.ts`. An agreed subtotal above the calculated total is never used or stored as a discount; the PDF totals block must always reconcile (TOTAL − DISCOUNT = SUBTOTAL, + GST = GRAND TOTAL).
- **Catalog = defaults for new quotes.** Existing quotes keep their own terms/specification; each quote's terms/spec are editable in the builder.

## Structure

- `web/src/main.tsx` — providers (Clerk, Convex, router, UI). Clerk key / Convex URL come from `VITE_CLERK_PUBLISHABLE_KEY` / `VITE_CONVEX_URL`, falling back to the development values.
- `web/src/App.tsx` — sign-in, workspace bootstrap (`company:ensureCompany`), sidebar, routes, connection banner.
- `web/src/pages/` — `Dashboard` (quotes list + stats), `Builder` (editor, preview, version history), `Preview` (PDF preview + sample), `Clients`, `Catalog` (rate card, specifications, default terms), `Trash` (deleted quotes), `Import` (Excel → new quote: column matching on desktop, review on phone).
- `web/src/components/` — client picker/form, item library, number field.
- `web/src/lib/` — `types`, `math`, `format`, `defaults` (letterhead `COMPANY`, seed catalog, sample, new/copy quote, printed terms), `convert` (Convex doc ↔ editor quote, save payload), `pdf` (pdfmake definition + pdf.js preview, both lazy-loaded), `logo` (vector LIVORA mark for the PDF), `importSheet` (spreadsheet rows → quote; pure, tested), `excel` (ExcelJS template + reader, lazy-loaded), `useQuoteEditor`.
- `web/src/styles.css` (design system) + `web/src/app.css` (React-specific additions).
- `convex/` — `schema.ts`, `validators.ts`, `common.ts`, `company.ts`, `catalog.ts`, `clients.ts`, `quotes.ts`. Every function is auth-gated; the tenant is derived from the signed-in user, never from client input.
- `scripts/verify.mjs` — `npm test`.
- `REVIEW-ACCOUNTS.md`, `TESTING-ACCOUNTS.md` — historical notes about the v2 (vanilla JS) app; not current.

## Workflow for changes

1. `npm install`, then `npm run dev` → http://localhost:8130 (backend work: `npm run convex:dev` in a second terminal).
2. `npm test` — typechecks `web/` and `convex/`, runs unit tests (`web/src/**/*.test.ts`), checks backend invariants.
3. Commit and push. **Pushing to `main` deploys** (GitHub Actions) once the repo secrets are set.

## Deploy (IMPORTANT)

- **Frontend** → Cloudflare Pages project `accounts-livora` (https://accounts-livora.pages.dev), a Direct Upload project. `npm run deploy` runs the checks, builds, and uploads **only `web/dist`**. The GitHub workflow (`.github/workflows/deploy.yml`) does the same on push to `main`. Never upload the repo root (it has `.env.local` with the Clerk secret key).
- Cloudflare Pages serves `index.html` for unknown paths (no `404.html` in the build), so client-side routes like `/quotes/<id>` work on reload.
- Verify after deploying: open https://accounts-livora.pages.dev, sign in, open a quote; confirm `https://accounts-livora.pages.dev/.env.local` does not return the secrets file.
- **Backend** → Convex, deployed separately. Note: `.env.local` points `npx convex dev` at the **dev** deployment `careful-badger-891`, which is also what the site uses today, so `convex dev` changes production data's backend immediately. Keep backend changes backwards-compatible with the deployed frontend.
- **Before real production use:** create a Clerk production instance and set its publishable key (repo variable `CLERK_PUBLISHABLE_KEY`); consider a separate Convex production deployment (`CONVEX_URL`).
- Never commit secrets or client PII. `.env.local` is gitignored; keep it that way.
