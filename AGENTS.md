# AGENTS.md — LIVORA Quote Studio

Mobile-first quote builder for LIVORA Interiors (interior quotation webapp). Pure static site: HTML/CSS/JS, zero dependencies, no build step. Users prepare quotes on their phones during client calls, then download a PDF quotation.

## Deploy (IMPORTANT)

- **`main` branch = the live site.** Pushing to `main` auto-deploys to **https://livora-quote.pages.dev** via Cloudflare Pages (GitHub integration). Live in ~30 seconds.
- Branch pushes do NOT deploy. Only `main` triggers a build.
- Never commit secrets or client PII (repo is private, but the live site is public).

## Workflow for changes

1. Edit files locally (`index.html`, `styles.css`, `app.js`)
2. Test locally: `python -m http.server 8130` → open http://localhost:8130
3. Commit + push:
   ```bash
   git add .
   git commit -m "description of change"
   git push origin main
   ```
4. Verify: `curl -s https://livora-quote.pages.dev/ | grep <changed-marker>` (Cloudflare bot-blocks python's urllib; use curl with a normal User-Agent)

For bigger changes, iterate on a branch first — the live site won't flinch until it merges to `main`.

## Structure

- `index.html` — builder view, quote (final template) view, modals, sticky bars
- `styles.css` — design system (warm interiors palette) + `@media print` A4 rules (the print block MUST stay at the END of the file — base rules after it would override print rules in the cascade)
- `app.js` — state (localStorage key `livora-quote-v2`), item library, rendering, totals (discount/GST), pdfmake PDF generation (loaded from CDN with jsdelivr fallback), quote template
- `README.md` — human-facing docs

## App behavior notes

- Autosaves to localStorage on every change; no backend.
- Item math: amount = W × H × rate (sqft); lump items = flat amount.
- PDF download uses pdfmake (client-side); Print is a fallback.
- `?print=1` → straight to print-ready quote; `?preview=1` → interactive preview.
- Data model: sections (rooms) with items {name, w, h, rate, lump}; customer; discount ₹; GST %; validityDays; timeline; terms[]; spec[{c,d}].
