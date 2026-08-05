# LIVORA Interiors — Quote Studio 🛋️

A mobile-first **quote builder webapp** for creating interior-work quotations on the go — while talking to clients on a call. Shopping-cart style: pick items, set measurements, watch totals update live, then export a professional quotation template (print → PDF).

## Features

- **Item library** — 20 pre-loaded items (wardrobe box, loft, beds, TV units, pooja mandir, kitchen cabinets, gypsum ceiling, painting, electrical…) with rates & default measurements from the standard LIVORA rate card
- **Rooms / sections** — Master Bedroom, Kitchen, Hall, etc. Add, rename, collapse, delete
- **Live math** — `W × H × rate` auto-calculated per item, per-room subtotals, TOTAL → DISCOUNT → GST → GRAND TOTAL (₹, Indian formatting)
- **Discount & GST** — set both on the fly in the sticky bar; GST row appears in the totals when set
- **Custom items** — lump-sum items (painting, electrical) or measured items, added in seconds
- **Final template** — one tap → professional quotation matching the LIVORA letterhead: company header, customer block, S.NO / DESCRIPTION / W / H / BOX / RATE / AMOUNT table with per-room subtotals, TOTAL → DISCOUNT → GST → GRAND TOTAL, **amount in words**, terms & conditions, material specification, validity & timeline, signature blocks
- **Download PDF** — one-tap client-side PDF via pdfmake (crisp vector text, page numbers, A4); **Print** also works as a fallback (browser "Save as PDF")
- **Autosave** — everything persists in the browser (localStorage); export/import JSON as backup
- **Sample quote** 🧪 — loads the reference ₹22L quote for a quick demo

## Usage

| Action | How |
|---|---|
| Add an item | Open a room → **＋ Add item** → tap from library (or **Custom item**) |
| Edit measurements | Tap W / H / Rate fields — totals recalc instantly |
| Discount / GST | Enter in the bottom bar (GST row appears in totals + amount-in-words updates) |
| Final quote | **Preview quote** → **⬇ Download PDF** (client-side) or **Print** |
| Validity / timeline | Set in the Customer card — appears in the quote header + terms |
| Print-ready link | `index.html?print=1` (bookmarks straight to the template) |
| Backup | ⭳ export JSON / ⭱ import JSON |
| Fresh quote | ✕ reset |

## Run locally

```bash
# from this folder
python -m http.server 8130
# then open http://localhost:8130
```

No build step, no dependencies — vanilla HTML/CSS/JS.

## Stack

- Vanilla JS + localStorage (zero dependencies)
- Inter + Fraunces (Google Fonts)
- Print via `@media print` + browser "Save as PDF"

## Structure

```
index.html   — builder view + final template view + modals
styles.css   — design system (warm interiors palette) + A4 print styles
app.js       — state, item library, rendering, quote template, persistence
```
