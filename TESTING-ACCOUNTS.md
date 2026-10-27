# LIVORA Quote Studio — Accounts & Sync Feature Test
### (Login · Catalog · Quote History · Cross-device · Offline)

This is the **staging** version of your app. Nothing here touches your live site.
Work through the tests below **in order**, on your **phone first**, then your **laptop**.
Tick the boxes as you go. When something doesn't match what's described, don't try to fix it —
just note it and tell the assistant what happened (more on that at the end).

---

## 1) Before you start

**Staging address (use this on BOTH devices):**
**https://accounts-livora.pages.dev**

Make sure everything below is done first:

- [ ] The **account connection** is switched on in the Clerk dashboard (the "Convex integration" toggle) — the assistant will confirm this is done before you start.
- [ ] **Email one-time-code login (OTP)** is switched on for your account in the Clerk dashboard.
- [ ] Your phone has good internet and a modern browser (Chrome or Safari).
- [ ] Your laptop is nearby, signed into the **same browser** you'll test with, with the staging address ready.
- [ ] Your phone has a **text message / email app** handy — the login code comes by email.
- [ ] You have about **20–30 minutes** — take your time, this is a client-facing tool.
- [ ] You know which email you'll use. **Use the same email on the phone and the laptop** — that's how the two devices share your data.

> Note: if you've logged in before during earlier testing, you'll see your earlier data —
> that's fine, the tests still work. The "first login" steps below describe the first time only.

---

## 2) Test 1 — First login (phone)

**Goal: sign in for the first time, and make sure your old in-progress quote isn't lost.**

1. On your **phone**, open **https://accounts-livora.pages.dev**
2. You should see the **LIVORA login screen** — the "L" logo, "LIVORA Interiors — Quote Studio", the heading **"Welcome back"**, and a note saying: *"Sign in with your email — a one-time code, no passwords to remember."*
   - [ ] The login screen looks like LIVORA (our colours and branding), not a plain generic page.
3. Type your **email address** and tap **Continue** (or similar).
4. You should receive a **one-time code by email**.
   - [ ] The email arrives within a minute or two.
5. Type the code and sign in.
   - [ ] You get into the app — you should see the quote builder with room sections.
6. **First-login migration check:** if you had a quote in progress in the **old app on this phone**, it should still be here after signing in — nothing lost.
   - [ ] Anything I had in progress on this phone is still here (or, if this phone was never used with the old app, I see the standard empty rooms — either is fine).

**Result of Test 1:**  [ ] ✅ Passed  [ ] ❌ Problem (tell the assistant what happened)

---

## 3) Test 2 — Catalog (📚)

**Goal: your own list of services, items, materials and terms is there, and edits to it
show up where you'd expect — in the "Add item" sheet and in the quote preview.**

1. Tap the **📚** button at the top right.
   - [ ] The **Catalog** screen opens, titled "Your catalog".
2. You should see **4 tabs**: **Services · Items · Materials · Terms**.
   - [ ] All 4 tabs are visible.

3. Tap the **Items** tab.
   - [ ] It shows the pre-seeded LIVORA items — you should see **17 items** (Wardrobe Box, Loft Box, Bed, TV Unit Box, Kitchen boxes, etc.).

4. Tap the **Services** tab.
   - [ ] It shows **3 services** (Gypsum Ceiling, Painting Work, Electrical Wiring & Material).

5. Tap the **Terms** tab.
   - [ ] It shows **8 terms** (the payment schedule — 40% / 30% / 20% / 10%, warranty, etc.).

6. Tap the **Materials** tab.
   - [ ] It shows the **material specification rows** (Plywood / Core Material, Laminates, Kitchen Finish, etc.).

7. **Edit an item's rate:** go to **Items**, tap the **✏️ (pencil)** on any item (e.g. Wardrobe Box). Change the **Rate ₹/sqft** to something noticeable (e.g. **1600**), tap **Save**.
   - [ ] The list shows the new rate.

8. **Add a new service:** go to **Services**, tap **＋ Add**. Fill in a name (e.g. "Modular Kitchen Work"), a category, and a flat rate (e.g. 50000). Tap **Save**.
   - [ ] The new service appears in the Services list.

9. **Delete a material:** go to **Materials**, tap the **🗑 (bin)** on any row. A confirmation pops up — tap **OK**.
   - [ ] The material row disappears.

10. **Edit a term:** go to **Terms**, tap the **✏️** on any term. Change the wording slightly, tap **Save**.
    - [ ] The edited term shows in the Terms list.

11. **Close the catalog** (✕ at the top left).

12. **Check the "Add item" sheet:** in the builder, tap **＋ Add item** inside any room.
    - [ ] The **Item library** sheet opens.
    - [ ] The item you edited in step 7 shows its **new rate** (1600).
    - [ ] The **new service** you added in step 8 is in the list (it appears as a lump-sum line, no W×H boxes).
    - [ ] Close the sheet (✕).

13. **Check the quote preview:** tap **Preview** (bottom bar), then tap **⚙** (display options) — make sure "Show material specifications" is on — then close the options.
    - [ ] The **Terms & Conditions** section in the preview shows your **edited term** from step 10.
    - [ ] The **Material Specification** section no longer shows the **deleted material** from step 9.
    - [ ] Close the preview (✕).

**Result of Test 2:**  [ ] ✅ Passed  [ ] ❌ Problem (tell the assistant what happened)

---

## 4) Test 3 — Quote history (🕘)

**Goal: every quote you build is saved automatically, gets a proper number, and can be
opened again or deleted.**

1. Build a **small quote**: add a couple of items to one room (tap **＋ Add item**, pick anything), and type a customer name in the **Customer** field (e.g. "Test Client").
   - [ ] The items appear and the total at the bottom updates.
2. Tap **✕ Clear quote** (bottom of the page). A message says: *"Start a fresh quote? The current quote is saved to your history."* — tap **OK**.
   - [ ] The builder empties.
   - [ ] The **Quote No** field now shows a proper sequential number like **LQ-2026-001** (the first one of the year), then **LQ-2026-002** next time, and so on.
3. Build another small quote (one item is enough), then **Clear quote** again.
   - [ ] The number advanced (e.g. from LQ-2026-001 to LQ-2026-002).
4. Tap **🕘** (top right).
   - [ ] The **Quote history** screen opens.
   - [ ] It lists the quotes you just cleared (with customer name or "—", the quote number, date, item count, and total).
5. **Reopen a quote:** tap on one of the quotes. It asks *"Open this quote? The current quote will be replaced."* — tap **OK**.
   - [ ] The quote's contents come back exactly as you built them (items, customer name, totals).
6. **Delete a quote:** open **🕘** again, tap the **🗑** on one quote. It asks *"Delete this quote from history? (PDFs you already sent stay yours.)"* — tap **OK**.
   - [ ] The quote disappears from the list.
   - [ ] Close the history (✕).

**Result of Test 3:**  [ ] ✅ Passed  [ ] ❌ Problem (tell the assistant what happened)

---

## 5) Test 4 — Cross-device (phone ↔ laptop)

**Goal: a quote you build on one device is available on the other. This is the heart of the feature.**

1. On your **phone**, build a small quote and type a customer name (e.g. "Sync Test").
2. On your **laptop**, open **https://accounts-livora.pages.dev** and sign in with the **same email**.
   - [ ] You get into the app on the laptop.
3. On the laptop, tap **🕘**.
   - [ ] The quote you built on the phone is listed here (same customer name, number, total).
4. Tap it to open it.
   - [ ] The contents match what you built on the phone.
5. Now the other way: on the **laptop**, edit the quote (change an item rate, or add an item).
6. Go back to your **phone** and tap **🕘**.
   - [ ] The updated quote (with the laptop's edit) is there.
7. Tap it on the phone to open it.
   - [ ] The laptop's edit is visible on the phone.

**Result of Test 4:**  [ ] ✅ Passed  [ ] ❌ Problem (tell the assistant what happened)

---

## 6) Test 5 — Offline (phone)

**Goal: you can keep working even if the network drops mid-call — nothing is lost,
and it catches up when you're back online.**

> Do this after you're signed in — don't close the app while offline.

1. On your **phone**, make sure you're signed in and the app is open.
2. Turn on **Airplane mode** (or switch off Wi-Fi + mobile data).
3. Build or edit a quote: add an item, change a rate, type a customer name.
   - [ ] Everything still works — editing, totals, preview — no errors.
4. (Optional) Tap **✕ Clear quote** while offline.
   - [ ] It still clears. The new quote number may look like a temporary random one (e.g. LQ-260810-123) — that's expected while offline.
5. Turn **Airplane mode off** and wait a few seconds for the internet to come back.
6. Open **🕘** on the phone (or reload the page — you may need to sign in again).
   - [ ] The edits you made while offline are still there and saved to your account.
7. On the **laptop**, open **🕘**.
   - [ ] The offline edits from the phone show up here too (synced across).

> Note: if you *reload* the app while still offline, you'll see a message like
> *"Can't reach the login service. Check your connection and reload."* — that's expected.
> Reconnect and reload and you're back in.

**Result of Test 5:**  [ ] ✅ Passed  [ ] ❌ Problem (tell the assistant what happened)

---

## 7) Test 6 — Regression (the old stuff still works)

**Goal: everything you already rely on keeps working exactly as before.**

1. **Sample quote:** tap **🧪** (top right). It asks *"Load the sample quote from the LIVORA PDF? (replaces current data)"* — tap **OK**.
   - [ ] The full sample loads (Master Bedroom, GBR/CBR Bedroom, Hall, Crockery Unit, Pooja Mandir, Kitchen, False Ceiling, Painting, Electrical).
2. **Math check:** tap **Preview**.
   - [ ] **TOTAL** equals the sum of all the item amounts.
   - [ ] Enter a **Final amount ₹** in the builder's bottom bar (e.g. 2000000) → preview shows a **DISCOUNT** row (TOTAL minus final amount).
   - [ ] Set **GST %** to e.g. 5 → preview shows **GST @ 5%** calculated on the final amount, and **GRAND TOTAL = final amount + GST**.
3. **PDF download:** in the preview, tap **⬇ Download Quote**.
   - [ ] A PDF downloads and opens — check it shows the quote number, date, customer, the item table, TOTAL / DISCOUNT / GST / GRAND TOTAL, terms, material spec, and signatures.
4. **Print:** in the preview, use your phone's browser menu → **Print** (or "Save as PDF").
   - [ ] The print preview shows the formatted quotation.
5. **?print=1:** on either device, open **https://accounts-livora.pages.dev/?print=1**
   - [ ] It opens **straight to the quote** — no login screen, that's expected — and shows the current quote (or the sample if nothing is built).

**Result of Test 6:**  [ ] ✅ Passed  [ ] ❌ Problem (tell the assistant what happened)

---

## 8) Test 7 — Sign out

1. Tap **📚**.
2. Scroll to the bottom of the catalog screen and tap **Sign out**.
   - [ ] You're taken back to the **login screen** ("Welcome back").
3. Sign back in with the same email.
   - [ ] You get back in, and your data is still there.

**Result of Test 7:**  [ ] ✅ Passed  [ ] ❌ Problem (tell the assistant what happened)

---

## 9) Finish — what happens next

- **Your live site is untouched.** All of this testing happened on the staging copy
  (accounts-livora.pages.dev). The real site (livora-quote.pages.dev) keeps working
  exactly as it does today — nothing changes until **you** approve.
- When all tests pass, tell the assistant and the feature gets merged to the live site.

### How to report a problem

Just tell the assistant, in your own words:

1. **Which test** and **which step** you were on (e.g. "Test 2, step 7").
2. **What you tapped** and **what you expected** to happen.
3. **What actually happened** (or what you saw on screen).

That's it — no need to investigate or fix anything yourself. Every problem gets
looked into before the feature goes live.
