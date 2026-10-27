# LIVORA Interiors — Quote Studio 🛋️

A mobile-first app for building interior-work quotations during client calls: pick rooms and items, enter measurements, agree a final amount, and download a professional PDF quotation. Sign in once and your quotes, clients and catalog are the same on your phone and laptop.

Live: https://accounts-livora.pages.dev

## What it does

- **Quotes** — a list of every quote with search, status filter, and figures for this month (quotes made, awaiting reply, accepted). Open, preview, duplicate or delete any quote; deleted quotes can be restored.
- **Quote builder** — customer (pick from your client book or type), date, validity, timeline, rooms, and items:
  - per-sq-ft items: W × H × rate; lump-sum items: a flat amount
  - **Agreed subtotal** — the amount agreed with the client; the discount is worked out for you. GST is added on top.
  - terms and material specification can be edited for this quote only
  - saves automatically about a second after you stop typing
- **Quote numbers** — `LQ-2026-001`, `LQ-2026-002`, … issued by the server when a quote is first saved (once it has an item).
- **Preview & PDF** — the preview is the actual PDF, page by page. Totals always add up: TOTAL − DISCOUNT = SUBTOTAL, + GST = GRAND TOTAL, with the amount in words. Toggle dimensions and the specification block.
- **Status** — draft, sent, accepted, declined. After downloading, mark it as sent. A sent quote expires after its validity period. Sent and accepted quotes are locked: **Create a revision** makes a new draft copy (or choose **Edit anyway**).
- **Version history** — restore any saved version of a quote.
- **Clients** — your client book: search, add, edit, merge duplicates, archive; see each client's quotes and start a new quote for them.
- **Catalog** — the defaults new quotes start from: **Rate card** (per-sq-ft and lump-sum rates), **Specifications**, **Default terms**. Changing them never alters existing quotes.
- **Sample quote** — the reference LIVORA quote, for demos. It's never saved.

The app needs an internet connection. If the connection drops briefly, a banner appears and your changes are sent as soon as it's back — keep the page open until it reconnects.

## Development

```bash
npm install
npm run dev
```

Opens on http://localhost:8130. Other scripts:

| Script | What it does |
|---|---|
| `npm test` | Typecheck frontend + backend, unit tests, backend checks |
| `npm run build` | Production build into `web/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run deploy` | Test, build, and upload `web/dist` to Cloudflare Pages |
| `npm run convex:dev` | Push backend functions to the Convex dev deployment and watch |

## Tech

- **Frontend:** React + TypeScript + Vite (`web/`), React Router, Convex React hooks, Clerk React. pdfmake (PDF) and pdf.js (preview) load only when needed.
- **Backend:** Convex (`convex/`) — quotes, version snapshots, clients, catalog, quote numbering. Every function checks the signed-in user.
- **Hosting:** Cloudflare Pages (static). Login: Clerk (Google or email code).

See `AGENTS.md` for architecture decisions and deployment details.
