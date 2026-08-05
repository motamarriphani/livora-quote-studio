# LIVORA Interiors — Quote Studio 🛋️

A mobile-first **quote builder webapp** for creating interior-work quotations on the go — while talking to clients on a call. Shopping-cart style: pick items, set measurements, watch totals update live, then export a professional quotation template (print → PDF).

## Features

- **Item library** — 20 pre-loaded items (wardrobe box, loft, beds, TV units, pooja mandir, kitchen cabinets, gypsum ceiling, painting, electrical…) with rates & default measurements from the standard LIVORA rate card
- **Rooms / sections** — Master Bedroom, Kitchen, Hall, etc. Add, rename, collapse, delete
- **Live math** — `W × H × rate` auto-calculated per item, per-room subtotals, TOTAL → DISCOUNT → GRAND TOTAL (₹, Indian formatting)
- **Custom items** — lump-sum items (painting, electrical) or measured items, added in seconds
- **Final template** — one tap → professional quotation matching the LIVORA letterhead: company header, customer block, S.NO / DESCRIPTION / W / H / BOX / RATE / AMOUNT table, terms & conditions, material specification, signature blocks. Print → save as PDF (A4)
- **Autosave** — everything persists in the browser (localStorage); export/import JSON as backup
- **Sample quote** 🧪 — loads the reference ₹22L quote for a quick demo

## Usage

| Action | How |
|---|---|
| Add an item | Open a room → **＋ Add item** → tap from library (or **Custom item**) |
| Edit measurements | Tap W / H / Rate fields — totals recalc instantly |
| Final quote | **Preview quote** → **Print / Save PDF** |
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
