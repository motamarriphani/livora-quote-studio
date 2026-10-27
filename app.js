/* ═══════════════ LIVORA Quote Studio — app logic ═══════════════ */
'use strict';

const LS_KEY = 'livora-quote-v2';

/* ── Item library (rates & default dims from the original LIVORA quote) ── */
const LIBRARY = [
  { id: 'wardrobe',    name: 'Wardrobe Box',            rate: 1500, w: 5,   h: 8,   cat: 'Woodwork' },
  { id: 'loft',        name: 'Loft Box',                rate: 1200, w: 12,  h: 7,   cat: 'Woodwork' },
  { id: 'loft-wall',   name: 'Loft & Wall Unit Box',    rate: 1200, w: 24,  h: 10,  cat: 'Woodwork' },
  { id: 'bed',         name: 'Bed',                     rate: 1200, w: 7,   h: 6,   cat: 'Woodwork' },
  { id: 'headboard',   name: 'Headboard',               rate: 600,  w: 8,   h: 4,   cat: 'Woodwork' },
  { id: 'wallpanel',   name: 'Wall Panelling',          rate: 800,  w: 8,   h: 5,   cat: 'Woodwork' },
  { id: 'toiletbox',   name: 'Toilet Box',              rate: 1500, w: 2,   h: 1,   cat: 'Woodwork' },
  { id: 'dresser',     name: 'Dresser with Mirror',     rate: 1500, w: 3,   h: 6,   cat: 'Woodwork' },
  { id: 'tvunit',      name: 'TV Unit Box',             rate: 1500, w: 3,   h: 8,   cat: 'Woodwork' },
  { id: 'tvtrolley',   name: 'TV Trolley Unit Box',     rate: 1500, w: 1.5, h: 8,   cat: 'Woodwork' },
  { id: 'tvpanel',     name: 'TV Panelling Work',       rate: 900,  w: 6,   h: 8,   cat: 'Woodwork' },
  { id: 'crockery',    name: 'Crockery Unit Box',       rate: 1500, w: 6,   h: 7,   cat: 'Woodwork' },
  { id: 'puja',        name: 'Pooja Mandir Box',        rate: 1500, w: 6,   h: 2,   cat: 'Woodwork' },
  { id: 'pujapanel',   name: 'Pooja Mandir Panelling',  rate: 1200, w: 6,   h: 6,   cat: 'Woodwork' },
  { id: 'pujadoor',    name: 'Pooja Mandir Door',       rate: 450,  w: 3,   h: 7,   cat: 'Woodwork' },
  { id: 'kitchlow',    name: 'Lower Cabinet Box',       rate: 1500, w: 30,  h: 11,  cat: 'Kitchen' },
  { id: 'kitchloft',   name: 'Kitchen Loft Box',        rate: 1200, w: 34,  h: 10,  cat: 'Kitchen' },
  { id: 'gypsum',      name: 'Gypsum Ceiling',          rate: 83500, lump: true, cat: 'False Ceiling' },
  { id: 'paint',       name: 'Painting Work',           rate: 115000, lump: true, cat: 'Finishes' },
  { id: 'electrical',  name: 'Electrical Wiring & Material', rate: 100000, lump: true, cat: 'Electrical' },
];

const DEFAULT_SECTIONS = [
  { name: 'Master Bedroom' }, { name: 'GBR Bedroom' }, { name: 'CBR Bedroom' },
  { name: 'Hall' }, { name: 'Crockery Unit' }, { name: 'Pooja Mandir' },
  { name: 'Kitchen' }, { name: 'False Ceiling' }, { name: 'Painting' }, { name: 'Electrical' },
];

const DEFAULT_TERMS = [
  'Décor items not included',
  '40% payment as the project starts',
  '30% at mid way of the project',
  '20% at the time of handle installation',
  '10% at the time of final handover after snag list clearance',
  'Full payment to be released at the time of handover',
  'Any extra work other than the mentioned in the quote will be charged accordingly and should be paid in full (executed only after written approval)',
  'Workmanship warranty of 1 year from the date of handover (excludes damage caused by misuse)',
];

const DEFAULT_SPEC = [
  { c: 'Plywood / Core Material', d: 'Premium 710 Grade BWP Plywood – Century Club Prime / Greenply, 16mm & 6mm thickness, as per design and application.' },
  { c: 'Laminates', d: 'Premium 1mm Merino / Greenlam Laminates – HGL / Matte / Fluted finishes, as per client-approved design and colour selection (internal laminate 0.8mm).' },
  { c: 'Kitchen Finish', d: 'Premium Acrylic finish for kitchen shutters, as per approved design and colour.' },
  { c: 'Kitchen Accessories', d: 'Premium modular kitchen accessories – baskets, cutlery unit, bottle pull-out, tandem units and required fittings, as per approved BOQ / scope of work.' },
  { c: 'Hardware & Fittings', d: 'Premium branded soft-close hinges, channels and fittings, as per approved specifications.' },
  { c: 'Wardrobes & Other Units', d: 'Century / Greenply 710 Grade BWP plywood with Merino / Greenlam 1mm laminate, internal storage and fittings as per approved design.' },
  { c: 'Kitchen', d: 'HDMR (High Density Moisture Resistant) board for kitchen carcass, as per approved design.' },
];

/* ── State ── */
let state = {
  company: { name: 'LIVORA INTERIORS', address: 'Miyapur, Hyderabad, Telangana 502034', phone: '8886767991' },
  customer: { name: '', phone: '', address: '', clientId: null },
  quoteNo: '', cloudId: null, version: 0, date: todayStr(),
  sections: [],
  finalCharge: 0,  // the amount we'll charge the client (grand total); discount is derived
  gst: 0,
  status: 'draft',
  validityDays: 15,
  timeline: '',
  terms: [...DEFAULT_TERMS],
  spec: DEFAULT_SPEC,
  showDims: true,   // show H×W columns in quote table (preview + PDF)
  showSpec: true,   // show Material Specification block (preview + PDF)
};

let libTarget = null; // section id receiving library adds
const INPUT_LIMITS = {
  w: { min: 0, max: 1000, label: 'Width' },
  h: { min: 0, max: 1000, label: 'Height' },
  rate: { min: 0, max: 10000000, label: 'Rate' },
  finalCharge: { min: 0, max: 100000000, label: 'Agreed subtotal' },
  gst: { min: 0, max: 100, label: 'GST' },
  validityDays: { min: 1, max: 365, label: 'Validity' },
};

/* ── Helpers ── */
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9);
const num = v => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; };
const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
// ₹ can overlap the first digit in Inter — keep a hair of space in stat/total displays
const fmtRs = n => '₹\u2009' + Math.round(n).toLocaleString('en-IN');
function todayStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}
function itemAmount(it) { return window.LivoraMath.itemAmount(it); }
function sectionTotal(sec) { return window.LivoraMath.sectionTotal(sec); }
function quoteTotal() { return window.LivoraMath.quoteTotal(state.sections); }
// The client-facing number is the FINAL CHARGE — the agreed amount AFTER discount,
// BEFORE GST (e.g. ₹22,00,000). Discount is derived (total − final), GST is
// calculated separately on the final amount, exactly like the printed quotation.
function taxableBase() {
  return window.LivoraMath.taxableBase(quoteTotal(), state.finalCharge);
}
function discountAmount() {
  return window.LivoraMath.discountAmount(quoteTotal(), state.finalCharge);
}
function gstAmount() {
  return window.LivoraMath.gstAmount(taxableBase(), state.gst);
}
function grandTotal() { return taxableBase() + gstAmount(); }
function itemCount() { return window.LivoraMath.itemCount(state.sections); }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function getTerms() {
  const t = [...state.terms];
  const g = num(state.gst);
  if (g > 0) t.push('GST @ ' + g + '% extra (included in the grand total)');
  else t.push('GST (if applicable) charged extra at the prevailing rate');
  t.push('Validity of this quotation: ' + (num(state.validityDays) || 15) + ' days from the date of issue');
  if (state.timeline) t.push('Project timeline: approximately ' + state.timeline + ' from the start date');
  return t;
}
function amountInWords(n) {
  if (!isFinite(n) || n <= 0) return 'Rupees Zero Only';
  n = Math.round(n);
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = n => n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  const three = n => (n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? two(n % 100) : '');
  let out = '';
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) out += three(crore) + ' Crore ';
  if (lakh) out += two(lakh) + ' Lakh ';
  if (thousand) out += two(thousand) + ' Thousand ';
  if (n) out += three(n);
  return 'Rupees ' + out.trim() + ' Only';
}

function validateBoundedInput(el, key) {
  const rule = INPUT_LIMITS[key];
  if (!el || !rule) return true;
  const raw = el.value.trim();
  const n = Number(raw);
  const valid = raw === '' || (Number.isFinite(n) && n >= rule.min && n <= rule.max);
  const message = valid ? '' : `${rule.label} must be between ${rule.min} and ${rule.max}.`;
  el.classList.toggle('input-invalid', !valid);
  el.setAttribute('aria-invalid', String(!valid));
  el.setCustomValidity(message);
  const error = document.getElementById(el.id + 'Error') || el.parentElement?.querySelector('.input-error');
  if (error) error.textContent = message;
  return valid;
}

/* ── Small UI feedback primitives ── */
let _toastTimer = null;
let _dialogResolver = null;
const _pendingOps = new Set();
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function showToast(message, options = {}) {
  const region = $('#toastRegion');
  if (!region) return;
  clearTimeout(_toastTimer);
  const type = options.type || 'info';
  region.innerHTML = `<div class="toast toast-${type}"><span>${esc(message)}</span>${options.actionLabel ? `<button type="button" class="toast-action">${esc(options.actionLabel)}</button>` : ''}</div>`;
  region.classList.remove('hidden');
  const action = region.querySelector('.toast-action');
  if (action && options.onAction) {
    action.addEventListener('click', () => {
      hideToast();
      options.onAction();
    }, { once: true });
  }
  _toastTimer = setTimeout(hideToast, options.duration || 4500);
}

function hideToast() {
  const region = $('#toastRegion');
  if (region) { region.classList.add('hidden'); region.innerHTML = ''; }
  clearTimeout(_toastTimer);
}

function closeAppDialog(result = false) {
  const modal = $('#appDialog');
  if (modal) modal.classList.add('hidden');
  const resolve = _dialogResolver;
  _dialogResolver = null;
  if (resolve) resolve(result);
}

function askConfirm(message, options = {}) {
  const modal = $('#appDialog');
  if (!modal) return Promise.resolve(false);
  if (_dialogResolver) closeAppDialog(false);
  $('#appDialogTitle').textContent = options.title || 'Please confirm';
  $('#appDialogMessage').textContent = message;
  $('#appDialogConfirm').textContent = options.confirmLabel || 'Continue';
  $('#appDialogConfirm').className = 'btn full ' + (options.danger ? 'danger-btn' : 'primary');
  $('#appDialogCancel').textContent = options.cancelLabel || 'Cancel';
  modal.classList.remove('hidden');
  return new Promise(resolve => { _dialogResolver = resolve; });
}

function setQuoteSyncStatus(status) {
  const el = $('#quoteSyncStatus');
  if (!el) return;
  const labels = {
    saving: 'Saving…',
    saved: 'Saved just now',
    offline: 'Offline — saved on this device',
    attention: 'Sync needs attention',
    local: 'Saved on this device',
  };
  const label = labels[status] || labels.local;
  el.textContent = label;
  el.className = 'quote-sync-status ' + status;
  el.setAttribute('aria-label', label);
}

function setPendingButton(button, pending, label) {
  if (!button) return;
  if (pending) {
    if (!button.dataset.restoreText) button.dataset.restoreText = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    if (label) button.textContent = label;
  } else {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (button.dataset.restoreText) {
      button.textContent = button.dataset.restoreText;
      delete button.dataset.restoreText;
    }
  }
}

function beginPending(key, element) {
  if (_pendingOps.has(key)) return false;
  _pendingOps.add(key);
  if (element) {
    element.classList.add('is-pending');
    element.setAttribute('aria-busy', 'true');
    if ('disabled' in element) element.disabled = true;
  }
  return true;
}

function endPending(key, element) {
  _pendingOps.delete(key);
  if (element) {
    element.classList.remove('is-pending');
    element.removeAttribute('aria-busy');
    if ('disabled' in element) element.disabled = false;
  }
}

function openModalFocus(modal) {
  if (!modal || modal.classList.contains('hidden')) return;
  const sheet = modal.querySelector('.modal-sheet');
  const target = sheet && (sheet.querySelector('input:not([type="hidden"]), textarea, select, [autofocus]') || sheet.querySelector(FOCUSABLE)) || sheet;
  if (target) target.focus();
}

function closeModalFromKeyboard(modal) {
  if (!modal) return;
  if (modal.id === 'appDialog') { closeAppDialog(false); return; }
  const close = modal.querySelector('[data-action^="close-"]');
  if (close) close.click();
  else modal.classList.add('hidden');
}

function initModalAccessibility() {
  const observer = new MutationObserver(records => {
    records.forEach(record => {
      if (record.type !== 'attributes' || !record.target.matches('.modal')) return;
      const modal = record.target;
      if (!modal.classList.contains('hidden')) {
        if (!modal._previousFocus) modal._previousFocus = document.activeElement;
        setTimeout(() => openModalFocus(modal), 0);
      } else if (modal._previousFocus && typeof modal._previousFocus.focus === 'function') {
        const previous = modal._previousFocus;
        modal._previousFocus = null;
        setTimeout(() => previous.focus(), 0);
      }
    });
  });
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
}

/* ── Persistence ── */
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  // cloud sync — debounced push (instant locally, syncs right after)
  if (window.Cloud) window.Cloud.markDirty();
}
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (s && Array.isArray(s.sections)) {
      state = Object.assign(state, s);
      state.gst = num(state.gst);
      if (!['draft', 'sent', 'accepted', 'declined', 'expired'].includes(state.status)) state.status = 'draft';
      state.validityDays = num(state.validityDays) || 15;
      state.timeline = state.timeline || '';
      if (!Array.isArray(state.terms) || state.terms.length < 8) state.terms = [...DEFAULT_TERMS];
      if (!Array.isArray(state.spec) || !state.spec.length) state.spec = DEFAULT_SPEC.map(x => ({ ...x }));
      // legacy migration: old quotes stored a manual discount → convert to final charge
      if ('discount' in s && !('finalCharge' in s)) {
        const base = Math.max(0, quoteTotal() - num(s.discount));
        state.finalCharge = Math.round(base * (1 + num(state.gst) / 100));
      }
      delete state.discount;
      if (typeof state.finalCharge !== 'number' || !isFinite(state.finalCharge)) state.finalCharge = 0;
      if (typeof state.showDims !== 'boolean') state.showDims = true;
      if (typeof state.showSpec !== 'boolean') state.showSpec = true;
      return true;
    }
  } catch (e) {}
  return false;
}

/* ── Render: sections ── */
function render() {
  const wrap = $('#sections');
  wrap.innerHTML = state.sections.map(sec => {
    const tot = sectionTotal(sec);
    const rows = sec.items.map((it, i) => `
      <div class="item-row${it.lump ? ' lump' : ''}" data-sec="${esc(sec.id)}" data-item="${esc(it.id)}">
        <div class="item-top">
          <input class="item-desc" value="${esc(it.name)}" data-k="name" placeholder="Item name">
          <button class="item-del" data-action="del-item" title="Remove">✕</button>
        </div>
        <div class="item-dims">
          ${it.lump ? '' : `
          <div class="dim-field"><label>W</label><input class="dim" type="number" step="0.1" min="0" max="1000" value="${it.w || ''}" data-k="w" placeholder="0"><small class="input-error"></small></div>
          <div class="dim-field"><label>H</label><input class="dim" type="number" step="0.1" min="0" max="1000" value="${it.h || ''}" data-k="h" placeholder="0"><small class="input-error"></small></div>`}
          <div class="dim-field"><label>Rate</label><input class="dim" type="number" step="1" min="0" max="10000000" value="${it.rate || ''}" data-k="rate" placeholder="0"><small class="input-error"></small></div>
          <div class="item-amount"><span class="amount-box">${fmt(itemAmount(it))}</span></div>
        </div>
      </div>`).join('');
    return `
      <div class="card section-card ${sec.collapsed ? 'collapsed' : ''}" data-sec="${esc(sec.id)}">
        <div class="sec-head" data-action="toggle-sec">
          <div class="sec-title-row">
            <span class="chev">▼</span>
            <div>
              <input class="sec-name" value="${esc(sec.name)}" data-k="name" data-sec="${esc(sec.id)}" placeholder="Room name">
              <div class="sec-sub">${sec.items.length} item${sec.items.length === 1 ? '' : 's'} · ${fmt(tot)}</div>
            </div>
          </div>
          <button class="icon-btn" data-action="del-section" title="Delete section">🗑</button>
        </div>
        <div class="sec-body">
          ${rows || '<div style="color:var(--faint);font-size:12.5px;padding:10px 0 4px">No items yet — add from the library below.</div>'}
          <button class="add-item-btn" data-action="add-item">＋ Add item</button>
        </div>
      </div>`;
  }).join('');
  renderSummary();
}

function renderSummary() {
  $('#sumCount').textContent = itemCount() + ' item' + (itemCount() === 1 ? '' : 's');
  $('#sumCalculated').textContent = fmt(quoteTotal());
  $('#sumGst').textContent = fmt(gstAmount());
  $('#sumGrand').textContent = fmt(grandTotal());
  const warning = num(state.finalCharge) > quoteTotal() ? 'Agreed subtotal is higher than calculated total.' : '';
  const warningEl = $('#sumWarning');
  if (warningEl) warningEl.textContent = warning;
  const fEl = $('#finalCharge'), gEl = $('#gst');
  if (fEl && document.activeElement !== fEl) fEl.value = state.finalCharge || '';
  if (gEl && document.activeElement !== gEl) gEl.value = state.gst || '';
  if (fEl) fEl.title = warning;
}

/* ── Render: library modal (from YOUR catalog — same source as the catalog tabs) ── */
function renderLibrary(q = '') {
  const grid = $('#libGrid');
  const cat = catList(); // cloud catalog → local mirror → built-in defaults
  const pool = [...cat.items, ...cat.services.map(s => ({ ...s, lump: true }))];
  const list = pool.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));
  grid.innerHTML = list.map(i => `
    <button class="lib-item" data-lib="${esc(i.id)}">
      <div class="lib-name">${esc(i.name)}</div>
      <div class="lib-cat">${esc(i.cat)}</div>
      <div class="lib-rate">${i.lump ? fmt(i.rate) : fmt(i.rate) + ' <small>/sqft</small>'}</div>
    </button>`).join('') || '<div style="color:var(--faint);padding:16px;text-align:center;grid-column:1/-1">No matching items</div>';
}

/* lookup in the same catalog source; built-in library as last resort */
function libLookup(id) {
  const cat = catList();
  const it = cat.items.find(x => x.id === id);
  if (it) return { name: it.name, w: it.w ?? null, h: it.h ?? null, rate: it.rate, lump: false };
  const sv = cat.services.find(x => x.id === id);
  if (sv) return { name: sv.name, w: null, h: null, rate: sv.rate, lump: true };
  const lib = LIBRARY.find(i => i.id === id);
  if (lib) return { name: lib.name, w: lib.w ?? null, h: lib.h ?? null, rate: lib.rate, lump: !!lib.lump };
  return null;
}

/* ── Mutations ── */
function addSection(name = '') {
  const sec = { id: uid(), name: name || 'New Section', items: [], collapsed: false };
  state.sections.push(sec);
  state.finalCharge = 0;   // item set changed → stale final amount must go
  save(); render();
  // jump straight into renaming the new room
  const el = document.querySelector(`.section-card[data-sec="${sec.id}"] .sec-name`);
  if (el) { el.focus(); el.select(); }
  return sec;
}
function addItemFromLib(libId) {
  const lib = libLookup(libId);
  if (!lib || !libTarget) return;
  const sec = state.sections.find(s => s.id === libTarget);
  if (!sec) return;
  sec.items.push({ id: uid(), name: lib.name, w: lib.w ?? null, h: lib.h ?? null, rate: lib.rate, lump: !!lib.lump });
  state.finalCharge = 0;   // item set changed → stale final amount must go
  save(); render();
  showToast('Added “' + lib.name + '” to ' + sec.name + '.', { type: 'success', duration: 1800 });
}
function addCustomItem() {
  const name = $('#cName').value.trim() || 'Custom Item';
  const lump = $('#cLump').checked;
  if (!validateBoundedInput($('#cRate'), 'rate') || (!lump && (!validateBoundedInput($('#cW'), 'w') || !validateBoundedInput($('#cH'), 'h')))) {
    showToast('Fix the highlighted item values first.', { type: 'error' });
    return;
  }
  const item = { id: uid(), name, lump, rate: num($('#cRate').value) };
  if (!lump) { item.w = num($('#cW').value) || null; item.h = num($('#cH').value) || null; }
  const sec = state.sections.find(s => s.id === libTarget);
  if (sec) sec.items.push(item);
  closeCustom();
  $('#libraryModal').classList.add('hidden');
  state.finalCharge = 0;   // item set changed → stale final amount must go
  save(); render();
  showToast('Added “' + name + '” to the quote.', { type: 'success', duration: 1800 });
}

/* ── Quote template (final document) ── */
function renderQuote() {
  const c = state.company, cu = state.customer;
  const showDims = state.showDims !== false, showSpec = state.showSpec !== false;
  const COLS = showDims ? 7 : 5;      // W+H columns removed → 5 cols
  const SPAN = showDims ? 6 : 4;      // label span for subtotal/total rows
  let rows = '', sno = 0;
  state.sections.forEach(sec => {
    if (!sec.items.length) return;
    rows += `<tr class="room-row"><td colspan="${COLS}">${esc(sec.name)}</td></tr>`;
    sec.items.forEach(it => {
      sno++;
      const box = it.lump ? '—' : (num(it.w) * num(it.h)).toLocaleString('en-IN', { maximumFractionDigits: 1 });
      rows += `<tr${it.lump ? ' class="lump-row"' : ''}>
        <td>${sno}</td>
        <td class="desc">${esc(it.name)}</td>
        ${showDims ? `<td class="num">${it.lump ? '—' : esc(it.w)}</td>
        <td class="num">${it.lump ? '—' : esc(it.h)}</td>` : ''}
        <td class="num">${box}</td>
        <td class="num">${fmt(it.rate)}</td>
        <td class="num">${fmt(itemAmount(it))}</td>
      </tr>`;
    });
    rows += `<tr class="subtotal-row"><td colspan="${SPAN}" style="text-align:right">Subtotal — ${esc(sec.name)} :</td><td class="num">${fmt(sectionTotal(sec))}</td></tr>`;
  });
  const disc = discountAmount();
  const gst = num(state.gst);
  const total = quoteTotal();
  const gstAmt = gstAmount();
  const grand = grandTotal();
  const allTerms = getTerms();

  $('#quoteSheet').innerHTML = `
    <div class="qs-header">
      <div>
        <div class="qs-brand">${esc(c.name.split(' ')[0])} <span>${esc(c.name.split(' ').slice(1).join(' '))}</span></div>
        <div class="qs-company">${esc(c.address)}<br>Ph No : ${esc(c.phone)}</div>
      </div>
      <div style="text-align:right">
        <div class="qs-brand" style="font-size:15px">QUOTATION</div>
      </div>
    </div>
    <div class="qs-meta">
      <div><b>DATE :</b> ${esc(fmtDate(state.date))}</div>
      <div><b>QUOTE NO :</b> ${esc(state.quoteNo || '—')}</div>
      <div><b>VALIDITY :</b> ${num(state.validityDays) || 15} days</div>
      ${state.timeline ? `<div><b>DELIVERY :</b> ${esc(state.timeline)}</div>` : ''}
    </div>
    <div class="qs-cust"><span class="lbl">CUSTOMER NAME &amp; ADDRESS :</span> ${esc([cu.name, cu.address].filter(Boolean).join(', '))}${cu.phone ? ' — Ph: ' + esc(cu.phone) : ''}</div>
    <table class="qs-table">
      <thead><tr><th style="width:36px">S.No</th><th>Description</th>${showDims ? '<th style="width:44px">W</th><th style="width:44px">H</th>' : ''}<th style="width:56px">BOX</th><th style="width:74px">Rate</th><th style="width:86px">Amount</th></tr></thead>
      <tbody>${rows}
        <tr class="qs-total-row"><td colspan="${SPAN}" style="text-align:right">TOTAL :</td><td class="num">${fmt(total)}</td></tr>
        ${disc ? `<tr class="qs-total-row"><td colspan="${SPAN}" style="text-align:right">DISCOUNT :</td><td class="num">− ${fmt(disc)}</td></tr>` : ''}
        ${gst ? `<tr class="qs-total-row"><td colspan="${SPAN}" style="text-align:right">GST @ ${gst}% :</td><td class="num">+ ${fmt(gstAmt)}</td></tr>` : ''}
        <tr class="qs-grand"><td colspan="${SPAN}" style="text-align:right">GRAND TOTAL :</td><td class="num">${fmt(grand)}</td></tr>
      </tbody>
    </table>
    <div class="qs-words"><span class="lbl">AMOUNT IN WORDS :</span> ${esc(amountInWords(grand))}</div>
    ${showSpec ? `
    <div class="qs-spec">
      <h4>Material Specification</h4>
      <table class="qs-spec-table">
        ${state.spec.map(s => `<tr><td class="spec-c">${esc(s.c)}</td><td>${esc(s.d)}</td></tr>`).join('')}
      </table>
    </div>` : ''}
    <div class="qs-note">
      <h4>Note — Terms &amp; Conditions</h4>
      <ol class="qs-terms">${allTerms.map((t, i) => `<li><span class="n">${i + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol>
    </div>
    <div class="qs-sigs">
      <div class="qs-sig">CUSTOMER NAME<small>Signature</small></div>
      <div class="qs-sig">For ${esc(c.name)}<small>Authorized Signatory</small></div>
    </div>
    <div class="qs-foot">${esc(c.name)} · ${esc(c.address)} · ${esc(c.phone)}</div>`;
}

/* ── PDF generation (pdfmake — client-side, no server) ── */
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = () => rej(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}
async function ensurePdfmake() {
  if (window.pdfMake) return;
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/';
  const JSD = 'https://cdn.jsdelivr.net/npm/pdfmake@0.2.10/build/';
  const core = [CDN + 'pdfmake.min.js', JSD + 'pdfmake.min.js'];
  let ok = false;
  for (const u of core) { try { await loadScript(u); ok = true; break; } catch (e) {} }
  if (!ok) throw new Error('pdfmake core unavailable');
  const fonts = [CDN + 'vfs_fonts.min.js', JSD + 'vfs_fonts.min.js'];
  ok = false;
  for (const u of fonts) { try { await loadScript(u); ok = true; break; } catch (e) {} }
  if (!ok || !window.pdfMake) throw new Error('pdfmake fonts unavailable');
}

// pdf.js (page renderer) — loaded lazily so the builder never pays for it.
async function ensurePdfjs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  const JSD = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/';
  const core = [CDN + 'pdf.min.js', JSD + 'pdf.min.js'];
  let src = null;
  for (const u of core) { try { await loadScript(u); src = u; break; } catch (e) {} }
  if (!src || !window.pdfjsLib) throw new Error('pdf.js unavailable');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = src.replace('pdf.min.js', 'pdf.worker.min.js');
  return window.pdfjsLib;
}

function buildPdfDef() {
  const c = state.company, cu = state.customer;
  const gst = num(state.gst), disc = discountAmount();
  const showDims = state.showDims !== false, showSpec = state.showSpec !== false;
  const total = quoteTotal();
  const gstAmt = gstAmount();
  const grand = grandTotal();
  const INK = '#241d16', ACCENT = '#a05a2c', ACCENT_BG = '#f3e7db';
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const SPAN = showDims ? 6 : 4;      // label span for subtotal/total rows

  // Terms flow freely so pages fill naturally; the LAST few travel WITH the
  // signature block as one unbreakable unit. Whatever the current term count /
  // spec size, the document always ends: …last terms → 2in gap → signatures.
  const allTerms = getTerms();
  const tailN = Math.min(3, allTerms.length);
  const tailTerms = allTerms.slice(allTerms.length - tailN);
  const flowTerms = allTerms.slice(0, allTerms.length - tailN);
  const termItem = t => ({ text: t, fontSize: 8.5, margin: [0, 1.2, 0, 1.2] });

  const body = [];
  let sno = 0;
  state.sections.forEach(sec => {
    if (!sec.items.length) return;
    const secCells = showDims ? 7 : 5;
    body.push([{ text: sec.name.toUpperCase(), colSpan: secCells, fillColor: ACCENT_BG, bold: true, fontSize: 8.5, color: INK, margin: [0, 3, 0, 3] }, ...Array(secCells - 1).fill({})]);
    sec.items.forEach(it => {
      sno++;
      const box = it.lump ? '—' : (num(it.w) * num(it.h)).toLocaleString('en-IN', { maximumFractionDigits: 1 });
      const row = [
        { text: String(sno), alignment: 'center' },
        { text: it.name },
      ];
      if (showDims) {
        row.push(
          { text: it.lump ? '—' : (it.w ?? ''), alignment: 'center' },
          { text: it.lump ? '—' : (it.h ?? ''), alignment: 'center' },
        );
      }
      row.push(
        { text: box, alignment: 'center' },
        { text: inr(it.rate), alignment: 'right' },
        { text: inr(itemAmount(it)), alignment: 'right', bold: true },
      );
      body.push(row);
    });
    body.push([{ text: 'Subtotal — ' + sec.name, colSpan: SPAN, alignment: 'right', bold: true, italics: true, fontSize: 8 }, ...Array(SPAN - 1).fill({}), { text: inr(sectionTotal(sec)), alignment: 'right', bold: true }]);
  });

  body.push([{ text: 'TOTAL', colSpan: SPAN, alignment: 'right', bold: true }, ...Array(SPAN - 1).fill({}), { text: inr(total), alignment: 'right', bold: true }]);
  if (disc) body.push([{ text: 'DISCOUNT', colSpan: SPAN, alignment: 'right', bold: true }, ...Array(SPAN - 1).fill({}), { text: '− ' + inr(disc), alignment: 'right', bold: true }]);
  if (gst) body.push([{ text: 'GST @ ' + gst + '%', colSpan: SPAN, alignment: 'right', bold: true }, ...Array(SPAN - 1).fill({}), { text: '+ ' + inr(gstAmt), alignment: 'right', bold: true }]);
  body.push([{ text: 'GRAND TOTAL', colSpan: SPAN, alignment: 'right', bold: true, color: '#fff', fillColor: INK }, ...Array(SPAN - 1).fill({}), { text: inr(grand), alignment: 'right', bold: true, color: '#fff', fillColor: INK }]);

  return {
    pageSize: 'A4',
    pageMargins: [36, 40, 36, 48],
    info: {
      title: 'Quotation ' + (state.quoteNo || ''),
      author: c.name,
      subject: 'Quotation — ' + (cu.name || ''),
    },
    footer: (current, count) => ({
      columns: [
        { text: c.name + ' · ' + c.address + ' · ' + c.phone, fontSize: 7, color: '#8a7d6f' },
        { text: 'Page ' + current + ' of ' + count, fontSize: 7, color: '#8a7d6f', alignment: 'right' },
      ],
      margin: [36, 10, 36, 0],
    }),
    content: [
      { columns: [
        { width: '*', stack: [
          { text: c.name, fontSize: 20, bold: true, characterSpacing: 1, color: INK },
          { text: c.address, fontSize: 8.5, color: '#4c4238', margin: [0, 3, 0, 0] },
          { text: 'Ph No : ' + c.phone, fontSize: 8.5, color: '#4c4238' },
        ] },
        { width: 'auto', stack: [
          { text: 'QUOTATION', fontSize: 16, bold: true, characterSpacing: 4, color: ACCENT, alignment: 'right' },
          { text: 'DATE : ' + fmtDate(state.date), fontSize: 8.5, alignment: 'right', margin: [0, 7, 0, 0] },
          { text: 'QUOTE NO : ' + (state.quoteNo || '—'), fontSize: 8.5, alignment: 'right' },
          { text: 'VALIDITY : ' + (num(state.validityDays) || 15) + ' days', fontSize: 8.5, alignment: 'right' },
          ...(state.timeline ? [{ text: 'DELIVERY : ' + state.timeline, fontSize: 8.5, alignment: 'right' }] : []),
        ] },
      ], margin: [0, 0, 0, 10] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 518, y2: 0, lineWidth: 1.6, lineColor: INK }], margin: [0, 0, 0, 8] },
      { table: { widths: ['*'], body: [[{ text: 'CUSTOMER NAME & ADDRESS : ' + [cu.name, cu.address].filter(Boolean).join(', ') + (cu.phone ? ' — Ph: ' + cu.phone : ''), fontSize: 9, margin: [6, 5, 6, 5] }]] },
        layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => INK, vLineColor: () => INK },
        margin: [0, 0, 0, 10] },
      { table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: showDims ? [24, '*', 28, 28, 42, 62, 80] : [24, '*', 42, 62, 80],
          body: [
            showDims
              ? [{ text: 'S.NO', style: 'th' }, { text: 'DESCRIPTION', style: 'th' }, { text: 'W', style: 'th', alignment: 'center' }, { text: 'H', style: 'th', alignment: 'center' }, { text: 'BOX', style: 'th', alignment: 'center' }, { text: 'FRAME RATE', style: 'th', alignment: 'right' }, { text: 'AMOUNT', style: 'th', alignment: 'right' }]
              : [{ text: 'S.NO', style: 'th' }, { text: 'DESCRIPTION', style: 'th' }, { text: 'BOX', style: 'th', alignment: 'center' }, { text: 'FRAME RATE', style: 'th', alignment: 'right' }, { text: 'AMOUNT', style: 'th', alignment: 'right' }],
            ...body,
          ],
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: () => '#c9bfb2',
          vLineColor: () => '#c9bfb2',
          paddingTop: () => 3.5,
          paddingBottom: () => 3.5,
          paddingLeft: () => 5,
          paddingRight: () => 5,
        },
        margin: [0, 0, 0, 10] },
      { text: 'AMOUNT IN WORDS : ' + amountInWords(grand), fontSize: 9.5, bold: true, margin: [0, 0, 0, 6] },
      ...(showSpec ? [
        { text: 'MATERIAL SPECIFICATION', id: 'specHeading', fontSize: 10, bold: true, characterSpacing: 1, margin: [0, 2, 0, 3] },
        { table: {
            dontBreakRows: true,
            widths: [118, '*'],
            body: state.spec.map(s => [
              { text: s.c.toUpperCase(), bold: true, fontSize: 7.8, fillColor: ACCENT_BG, color: INK, margin: [4, 3, 4, 3] },
              { text: s.d, fontSize: 8.2, margin: [4, 3, 4, 3] },
            ]),
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#c9bfb2',
            vLineColor: () => '#c9bfb2',
            paddingTop: () => 0,
            paddingBottom: () => 0,
            paddingLeft: () => 0,
            paddingRight: () => 0,
          },
          margin: [0, 0, 0, 6] },
      ] : []),
      { text: 'NOTE — TERMS & CONDITIONS', id: 'termsHeading', fontSize: 10, bold: true, characterSpacing: 1, margin: [0, 2, 0, 3] },
      ...(flowTerms.length ? [{ ol: flowTerms.map(termItem), margin: [0, 0, 0, 4] }] : []),
      // Signature unit: the last few terms travel WITH the signatures as one
      // unbreakable block — either everything fits below the content, or the
      // whole unit moves to the top of the next page together.
      { unbreakable: true, stack: [
        ...(tailTerms.length ? [{ ol: tailTerms.map(termItem), start: flowTerms.length + 1, margin: [0, 0, 0, 0] }] : []),
        { columns: [
          { width: '*', stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: INK }], margin: [0, 144, 0, 5] },
            { text: 'CUSTOMER NAME', alignment: 'center', fontSize: 9, bold: true },
            { text: 'Signature', alignment: 'center', fontSize: 7.5, color: '#8a7d6f' },
          ] },
          { width: '*', stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.8, lineColor: INK }], margin: [0, 144, 0, 5] },
            { text: 'For ' + c.name, alignment: 'center', fontSize: 9, bold: true },
            { text: 'Authorized Signatory', alignment: 'center', fontSize: 7.5, color: '#8a7d6f' },
          ] },
        ], columnGap: 30 },
      ] },
    ],
    styles: { th: { bold: true, color: '#fff', fillColor: INK, fontSize: 8 } },
  };
}

async function downloadPdf() {
  const btn = document.querySelector('[data-action="download-pdf"]');
  if (btn) { btn.textContent = '⏳ Preparing…'; btn.disabled = true; }
  try {
    // Download the exact file shown in the preview (or generate it fresh if
    // the preview never ran), so what you see is what you get.
    let blob = _previewPdf && _previewPdf.blob;
    if (!blob) {
      await ensurePdfmake();
      const dd = buildPdfDef();
      blob = await new Promise((res, rej) => {
        try { pdfMake.createPdf(dd).getBlob(b => res(b)); } catch (e) { rej(e); }
      });
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = pdfFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  } catch (e) {
    console.error(e);
    showToast('Could not generate the PDF. Opening print instead.', { type: 'error' });
    window.print();
  } finally {
    if (btn) { btn.textContent = '⬇ Download PDF'; btn.disabled = false; }
  }
}

/* ── Smart PDF filename: LIVORA-Quotation-<client or quote no>-<DD-MM-YYYY>.pdf ── */
// No client name? Use the quote no — multiple quotes per day must not collide.
function pdfFileName() {
  const d = fmtDate(state.date) || todayStr();
  const id = (state.customer.name || state.quoteNo || '').trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  return 'LIVORA-Quotation' + (id ? '-' + id : '') + '-' + d + '.pdf';
}

/* ── View switching ── */
function updateQuoteBar() {
  const g = grandTotal(), t = quoteTotal();
  $('#quoteTotal').textContent = fmt(g);
  const extra = `Calculated ${fmt(t)} · Agreed subtotal ${fmt(taxableBase())} · GST ${fmt(gstAmount())} · Grand total ${fmt(g)}`;
  $('#quoteBreakdown').textContent = extra;
}
/* ── PDF preview: render the actual generated file in the browser viewer ── */
let _previewPdf = null;   // { url, blob, pageCount } for the PDF currently shown
let _pdfGen = 0;          // guards against out-of-order async renders

function showQuote() {
  renderQuote();          // HTML fallback (used by print)
  updateQuoteBar();
  showView('quote');
  renderPdfPreview();     // async: generate + show the real PDF
}
function showBuilder() {
  showView('builder');
}

// Build the PDF from the current state and render every page with pdf.js, so
// the preview is page-for-page identical to the downloaded file but styled to
// match the site (no browser PDF-viewer chrome).
async function renderPdfPreview() {
  const gen = ++_pdfGen;
  const view = $('#quote');
  const container = $('#quotePdf');
  const countEl = $('#quotePageCount');
  try {
    if (countEl) { countEl.textContent = 'Preparing…'; countEl.classList.remove('hidden'); }
    await ensurePdfmake();
    const dd = buildPdfDef();
    const blob = await new Promise((res, rej) => {
      try { pdfMake.createPdf(dd).getBlob(b => res(b)); } catch (e) { rej(e); }
    });
    if (gen !== _pdfGen) return; // a newer render superseded this one
    if (_previewPdf && _previewPdf.url) URL.revokeObjectURL(_previewPdf.url);
    const url = URL.createObjectURL(blob);
    _previewPdf = { url, blob, pageCount: 0 };
    if (countEl) countEl.textContent = 'Rendering…';
    const pdfjs = await ensurePdfjs();
    const pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
    if (gen !== _pdfGen) return;
    const pageCount = pdf.numPages;
    _previewPdf.pageCount = pageCount;
    const RENDER_WIDTH = 1000; // crisp on retina; CSS scales the canvas to fit
    const frag = document.createDocumentFragment();
    for (let p = 1; p <= pageCount; p++) {
      const page = await pdf.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: RENDER_WIDTH / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.className = 'quote-pdf-canvas';
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      if (gen !== _pdfGen) return;
      const sheet = document.createElement('div');
      sheet.className = 'quote-pdf-sheet';
      const num = document.createElement('div');
      num.className = 'quote-pdf-sheet-num';
      num.textContent = 'Page ' + p + ' of ' + pageCount;
      sheet.appendChild(canvas);
      sheet.appendChild(num);
      frag.appendChild(sheet);
    }
    if (container) { container.innerHTML = ''; container.appendChild(frag); }
    if (view) view.classList.add('pdf-mode');
    if (countEl) countEl.textContent = pageCount + (pageCount === 1 ? ' page' : ' pages');
  } catch (e) {
    console.error('PDF preview failed', e);
    if (countEl) countEl.classList.add('hidden');
    // fall back to the HTML sheet (already rendered by showQuote)
  }
}

/* Preview is a temporary view: closing it returns to where it was opened
   from (builder / dashboard / clients). _previewClientId keeps the client
   panel context so Client → Quote → Preview → Close lands back on the
   same client with its quotes expanded. */
let _previewReturn = 'dashboard';
let _previewClientId = null;
let _previewRestoreState = null;   // working-quote snapshot to restore when a preview closes

function closeQuotePreview() {
  const back = _previewReturn || 'dashboard';
  _previewReturn = null;
  const clientId = _previewClientId;
  _previewClientId = null;
  const restore = _previewRestoreState;
  _previewRestoreState = null;
  showView(back);
  if (restore) {
    // Preview is read-only: put the working quote back (in memory + storage)
    // without triggering a cloud push.
    state = restore;
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
    bindFields(); render();
  }
  if (back === 'clients' && clientId) {
    const panel = document.querySelector(`[data-panel="${clientId}"]`);
    if (panel && panel.classList.contains('hidden')) {
      panel.classList.remove('hidden');
      _activeClientPanelId = clientId;
      renderClientQuoteRows(clientId);
    }
    const row = panel ? panel.closest('.client-row') : null;
    if (row) row.scrollIntoView({ block: 'nearest' });
  }
}

/* ── Export / import ── */
function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'livora-quote-' + (state.quoteNo || state.date) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
function importJSON(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (!s || !Array.isArray(s.sections)) throw 0;
      // An imported backup is a new draft, never an attached cloud record.
      // Otherwise restoring an old file could overwrite today's quote.
      state = Object.assign(state, s, {
        cloudId: null,
        version: 0,
        quoteNo: autoQuoteNo(),
        customer: { ...(s.customer || {}), clientId: undefined },
      });
      save(); render(); bindFields();
      showToast('Quote imported as a new draft.', { type: 'success' });
    } catch (e) { showToast('That quote file is not valid.', { type: 'error' }); }
  };
  r.readAsText(file);
}

/* ── Sample (the original LIVORA quote, to demo) ── */
function loadSample() {
  // The sample is a demonstration, never an edit to the currently loaded
  // cloud quote. Detach it so autosave creates a separate draft.
  state.cloudId = null;
  state.version = 0;
  state.quoteNo = autoQuoteNo();
  state.status = 'draft';
  state.sections = [
    { id: uid(), name: 'Master Bedroom', collapsed: false, items: [
      { id: uid(), name: 'Wardrobe Box', w: 5, h: 8, rate: 1500 },
      { id: uid(), name: 'MBR Bed', w: 7, h: 6, rate: 1200 },
      { id: uid(), name: 'Head Board', w: 8, h: 4, rate: 600 },
      { id: uid(), name: 'Wall Panelling', w: 8, h: 5, rate: 800 },
      { id: uid(), name: 'Toilet Box', w: 2, h: 1, rate: 1500 },
    ]},
    { id: uid(), name: 'GBR Bedroom', collapsed: false, items: [
      { id: uid(), name: 'Wardrobe Box', w: 7, h: 8, rate: 1500 },
      { id: uid(), name: 'Dresser With Mirror', w: 3, h: 6, rate: 1500 },
      { id: uid(), name: 'Toilet Box', w: 2, h: 1, rate: 1500 },
    ]},
    { id: uid(), name: 'CBR Bedroom', collapsed: false, items: [
      { id: uid(), name: 'Wardrobe Box', w: 11.9, h: 7, rate: 1500 },
      { id: uid(), name: 'Loft Box', w: 11.9, h: 3, rate: 1200 },
      { id: uid(), name: 'Toilet Box', w: 2, h: 1, rate: 1500 },
    ]},
    { id: uid(), name: 'Hall', collapsed: false, items: [
      { id: uid(), name: 'TV Unit Box', w: 3, h: 8, rate: 1500 },
      { id: uid(), name: 'TV Trolley Unit Box', w: 1.5, h: 8, rate: 1500 },
      { id: uid(), name: 'TV Panelling Work', w: 6, h: 8, rate: 900 },
    ]},
    { id: uid(), name: 'Crockery Unit', collapsed: false, items: [
      { id: uid(), name: 'Crockery Unit Box', w: 6, h: 7, rate: 1500 },
    ]},
    { id: uid(), name: 'Pooja Mandir', collapsed: false, items: [
      { id: uid(), name: 'Pooja Mandir Box', w: 6, h: 2, rate: 1500 },
      { id: uid(), name: 'Pooja Mandir Panelling', w: 6, h: 6, rate: 1200 },
      { id: uid(), name: 'Pooja Mandir Door', w: 3, h: 7, rate: 450 },
    ]},
    { id: uid(), name: 'Kitchen', collapsed: false, items: [
      { id: uid(), name: 'Lower Cabinet Box', w: 30.6, h: 11.2, rate: 1500 },
      { id: uid(), name: 'Loft & Wall Unit Box', w: 24.3, h: 10, rate: 1200 },
      { id: uid(), name: 'Loft Box', w: 34.6, h: 10.9, rate: 1200 },
    ]},
    { id: uid(), name: 'False Ceiling', collapsed: false, items: [
      { id: uid(), name: 'Gypsum Ceiling', lump: true, rate: 83500 },
    ]},
    { id: uid(), name: 'Painting', collapsed: false, items: [
      { id: uid(), name: 'Painting Work', lump: true, rate: 115000 },
    ]},
    { id: uid(), name: 'Electrical', collapsed: false, items: [
      { id: uid(), name: 'Electrical Wiring & Material', lump: true, rate: 100000 },
    ]},
  ];
  state.finalCharge = 2200000;   // sample: ₹22,00,000 final → derived discount = 36,988
  state.customer = { name: '', phone: '', address: '', clientId: null };
  save(); render();
}

/* ── Catalog (your services · items · materials · terms) ── */
let catTab = 'services';
let catEditIdx = null;
let _termsEditing = false; // Terms tab: read-only "drag" mode by default; ✏️ Edit toggles inline editing

// Catalog source of truth, in priority order:
//   1. Cloud.catalog (server) once it exists
//   2. a local mirror (so edits stick even offline / pre-first-sync)
//   3. the built-in defaults (LIBRARY items, DEFAULT_SPEC, DEFAULT_TERMS) —
//      the "hardcoded" catalog, now editable like everything else
const CAT_KEY = 'livora-catalog-v2';
let _localCatalog = null;

function defaultCatalog() {
  const seed = (window.AppHooks && window.AppHooks.seed) ? window.AppHooks.seed() : { items: [], services: [], materials: [], terms: [] };
  return {
    items: (seed.items || []).map(x => ({ ...x })),
    services: (seed.services || []).map(x => ({ ...x })),
    materials: (seed.materials || []).map(x => ({ ...x })),
    terms: [...(seed.terms || [])],
  };
}

function catList() {
  if (window.Cloud && window.Cloud.catalog) return window.Cloud.catalog;
  if (!_localCatalog) {
    try {
      const raw = localStorage.getItem(CAT_KEY);
      if (raw) {
        const m = JSON.parse(raw);
        if (m && Array.isArray(m.items)) _localCatalog = m;
      }
    } catch (e) {}
  }
  if (!_localCatalog) _localCatalog = defaultCatalog();
  return _localCatalog;
}

function saveLocalCatalog() {
  try { localStorage.setItem(CAT_KEY, JSON.stringify(catList())); } catch (e) {}
}
function catArray() {
  const cat = catList();
  return catTab === 'services' ? cat.services : catTab === 'items' ? cat.items : catTab === 'materials' ? cat.materials : cat.terms;
}

/* ── Items tab: search + category filter + pagination (25/page) ── */
const CAT_PAGE_SIZE = 25;
let _catItemsSearch = '';
let _catItemsCat = '';
let _catItemsPage = 0;

function itemRowHtml(x, i) {
  const dims = x.w && x.h ? x.w + '×' + x.h : '';
  const sub = [x.cat, dims].filter(Boolean).join(' · ');
  return `<div class="cat-row cat-item-row">
    <div class="cat-item-name">${esc(x.name)}</div>
    <div class="cat-item-price">${x.rate ? fmtRs(x.rate) + '/sqft' : ''}</div>
    <div class="cat-item-sub">${esc(sub)}</div>
    <div class="cat-row-actions">
      <button class="icon-btn" data-action="cat-edit" data-idx="${i}" title="Edit">✏️</button>
      <button class="icon-btn danger" data-action="cat-del" data-idx="${i}" title="Delete">🗑</button>
    </div>
  </div>`;
}

function renderCatTab() {
  const arr = catArray();
  const list = $('#catList');
  const filters = $('#catFilters');
  const pager = $('#catPager');
  const isItems = catTab === 'items';
  if (filters) filters.classList.toggle('hidden', !isItems);
  if (pager) pager.classList.toggle('hidden', !isItems);
  if (isItems) {
    let indexed = arr.map((x, i) => ({ x, i }));
    const term = (_catItemsSearch || '').trim().toLowerCase();
    if (term) indexed = indexed.filter(({ x }) => (x.name || '').toLowerCase().includes(term) || (x.cat || '').toLowerCase().includes(term));
    if (_catItemsCat) indexed = indexed.filter(({ x }) => x.cat === _catItemsCat);
    const sel = $('#catItemsCat');
    if (sel) {
      const cats = [...new Set(arr.map(x => x.cat).filter(Boolean))];
      sel.innerHTML = '<option value="">All categories</option>' + cats.map(c => `<option value="${esc(c)}"${c === _catItemsCat ? ' selected' : ''}>${esc(c)}</option>`).join('');
    }
    const totalPages = Math.max(1, Math.ceil(indexed.length / CAT_PAGE_SIZE));
    if (_catItemsPage >= totalPages) _catItemsPage = totalPages - 1;
    const start = _catItemsPage * CAT_PAGE_SIZE;
    const pageRows = indexed.slice(start, start + CAT_PAGE_SIZE);
    if (pager) {
      const from = indexed.length ? start + 1 : 0;
      const to = Math.min(start + CAT_PAGE_SIZE, indexed.length);
      pager.innerHTML = `<button class="btn ghost" data-action="cat-page-prev"${_catItemsPage === 0 ? ' disabled' : ''}>‹ Prev</button>
        <span>${from}–${to} of ${indexed.length}</span>
        <button class="btn ghost" data-action="cat-page-next"${_catItemsPage >= totalPages - 1 ? ' disabled' : ''}>Next ›</button>`;
    }
    if (!pageRows.length) {
      list.innerHTML = indexed.length
        ? '<div class="cat-empty">No items match your search.</div>'
        : '<div class="cat-empty">Nothing here yet — tap ＋ Add to create one.</div>';
      return;
    }
    list.innerHTML = pageRows.map(({ x, i }) => itemRowHtml(x, i)).join('');
    return;
  }
  if (catTab === 'terms') {
    const editing = _termsEditing;
    list.innerHTML = arr.map((x, i) => editing ? `
      <div class="cat-row term-row term-row-edit" data-idx="${i}">
        <div class="cat-term-n">${i + 1}</div>
        <textarea class="cat-term-input" data-idx="${i}" rows="1" aria-label="Term ${i + 1}">${esc(x)}</textarea>
        <button class="icon-btn danger" data-action="cat-del" data-idx="${i}" title="Delete" aria-label="Delete term">🗑</button>
      </div>` : `
      <div class="cat-row term-row term-row-view" data-idx="${i}">
        <div class="term-drag" aria-hidden="true" title="Drag to reorder">⋮⋮</div>
        <div class="cat-term-n">${i + 1}</div>
        <div class="cat-term-t">${esc(x)}</div>
      </div>`).join('') || '<div class="cat-empty">Nothing here yet — tap ＋ Add to create one.</div>';
    requestAnimationFrame(() => {
      if (editing) list.querySelectorAll('.cat-term-input').forEach(autoGrow);
      // Always call — in edit mode this tears down any stale Sortable instance
      // so the textareas stay freely editable; in view mode it (re)creates it.
      initTermSortable();
      updateTermsHeader();
    });
    return;
  }
  if (!arr.length) { list.innerHTML = '<div class="cat-empty">Nothing here yet — tap ＋ Add to create one.</div>'; return; }
  list.innerHTML = arr.map((x, i) => {
    let body;
    if (catTab === 'terms') body = `<div class="cat-term-n">${i + 1}</div><div class="cat-term-t">${esc(x)}</div>`;
    else if (catTab === 'materials') body = `<div class="cat-mat-c">${esc(x.c)}</div><div class="cat-mat-d">${esc(x.d)}</div>`;
    else if (catTab === 'services') body = `<div class="cat-name">${esc(x.name)}</div><div class="cat-sub">${esc(x.cat || '')}</div>`;
    else body = `<div class="cat-name">${esc(x.name)}</div><div class="cat-sub">${esc(x.cat || '')}${x.rate ? ' · ' + fmt(x.rate) + '/sqft' : ''}${x.w && x.h ? ' · ' + x.w + '×' + x.h : ''}</div>`;
    const priceCell = catTab === 'services' ? `<div class="cat-price">${fmtRs(x.rate || 0)}</div>` : '';
    return `<div class="cat-row${catTab === 'services' ? ' cat-row-priced' : ''}">
      <div class="cat-row-body">${body}</div>
      ${priceCell}
      <div class="cat-row-actions">
        <button class="icon-btn" data-action="cat-edit" data-idx="${i}" title="Edit">✏️</button>
        <button class="icon-btn danger" data-action="cat-del" data-idx="${i}" title="Delete">🗑</button>
      </div>
    </div>`;
  }).join('');
}

let _catalogSavePromise = null;
let _catalogSaveQueued = false;
function pushCatalog() {
  const cat = catList();
  saveLocalCatalog(); // edits stick locally even before/without a cloud round-trip
  if (!window.Cloud || !window.Cloud.saveCatalog) return Promise.resolve(null);
  if (_catalogSavePromise) { _catalogSaveQueued = true; return _catalogSavePromise; }
  _catalogSavePromise = Promise.resolve(window.Cloud.saveCatalog({
    items: cat.items, services: cat.services, materials: cat.materials, terms: cat.terms,
  })).catch(e => {
    if (window.Cloud && window.Cloud.setError) window.Cloud.setError(e);
    showToast('Catalog changes could not sync.', { type: 'error' });
    return null;
  }).finally(() => {
    _catalogSavePromise = null;
    if (_catalogSaveQueued) {
      _catalogSaveQueued = false;
      pushCatalog();
    }
  });
  return _catalogSavePromise;
}

// Inline term editing: grow the textarea to fit its content.
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// Debounced save for inline term edits — persists locally instantly, syncs to
// the cloud a moment after typing stops.
let _termSaveTimer = null;
function scheduleTermSave() {
  saveLocalCatalog();
  clearTimeout(_termSaveTimer);
  _termSaveTimer = setTimeout(() => pushCatalog(), 700);
}

// SortableJS (drag-to-reorder) — loaded lazily like pdfmake/pdf.js.
async function ensureSortable() {
  if (window.Sortable) return window.Sortable;
  const urls = [
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.3/Sortable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.3/Sortable.min.js',
  ];
  for (const u of urls) { try { await loadScript(u); break; } catch (e) {} }
  if (!window.Sortable) throw new Error('SortableJS unavailable');
  return window.Sortable;
}

// Notion-style drag-to-reorder for the Terms list. Active only in view mode
// (read-only cards) — the whole card is the drag target. Edit mode disables
// it so the textareas stay editable. On touch, a short hold starts the drag
// so the list still scrolls normally with a quick swipe.
let _termsSortable = null;
async function initTermSortable() {
  const list = $('#catList');
  // Tear down any existing instance first — it may be bound to stale rows.
  if (_termsSortable) { try { _termsSortable.destroy(); } catch (e) {} _termsSortable = null; }
  if (!list || catTab !== 'terms' || _termsEditing) return;
  try {
    await ensureSortable();
    if (catTab !== 'terms' || _termsEditing || !list.isConnected) return;
    _termsSortable = window.Sortable.create(list, {
      animation: 150,
      ghostClass: 'term-ghost',
      chosenClass: 'term-chosen',
      delay: 200,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      onEnd: () => {
        // Rebuild the terms array from the new DOM order, save, then renumber.
        const order = [...list.querySelectorAll('.term-row')].map(r => parseInt(r.dataset.idx, 10));
        const terms = catList().terms;
        catList().terms = order.map(oi => terms[oi]).filter(x => x !== undefined);
        pushCatalog();
        setTimeout(() => renderCatTab(), 0);
      },
    });
  } catch (e) { console.error('Sortable init failed', e); }
}

// Show/hide the header buttons for the Terms tab: read-only "drag" mode vs
// explicit "edit" mode (✏️ Edit ↔ ✓ Done). Add is an edit-time action.
function updateTermsHeader() {
  const editBtn = $('#termsEditBtn');
  const addBtn = $('#catAddBtn');
  const isTerms = catTab === 'terms';
  if (editBtn) editBtn.classList.toggle('hidden', !isTerms);
  if (addBtn) {
    if (isTerms) addBtn.classList.toggle('hidden', !_termsEditing);
    else addBtn.classList.remove('hidden');
  }
  if (editBtn && isTerms) editBtn.textContent = _termsEditing ? '✓ Done' : '✏️ Edit';
}

function openCatEdit(idx) {
  catEditIdx = idx;
  $('#catEditErr').classList.add('hidden');
  const arr = catArray();
  const item = idx === null ? null : arr[idx];
  $('#catEditTitle').textContent = (idx === null ? 'Add ' : 'Edit ') +
    (catTab === 'terms' ? 'term' : catTab === 'materials' ? 'material' : catTab === 'services' ? 'service' : 'item');
  const f = (label, id, val, ph, multi) => `
    <label class="cat-field"><span>${label}</span>
      ${multi
        ? `<textarea id="${id}" rows="3" placeholder="${ph}">${esc(val || '')}</textarea>`
        : `<input id="${id}" class="field" value="${esc(val || '')}" placeholder="${ph}">`}
    </label>`;
  // Category tag picker: tap a tag to select, or type a new one (Enter / ＋).
  const fCat = (label, id, val, ph) => `
    <label class="cat-field"><span>${label}</span>
      <div class="cat-tag-box">
        <input id="${id}" class="field" value="${esc(val || '')}" placeholder="${ph}" autocomplete="off">
        <div class="cat-tags" id="${id}Tags"></div>
      </div>
    </label>`;
  let html = '';
  if (catTab === 'terms') html = f('Term', 'ceText', item, 'e.g. 40% payment as the project starts', true);
  else if (catTab === 'materials') html = f('Category', 'ceC', item && item.c, 'e.g. Plywood / Core Material') + f('Material details', 'ceD', item && item.d, 'e.g. Premium 710 Grade BWP Plywood…', true);
  else if (catTab === 'services') html = f('Service name', 'ceName', item && item.name, 'e.g. Painting Work') + fCat('Category', 'ceCat', item && item.cat, 'Type or pick a category') + f('Flat rate ₹ (optional)', 'ceRate', item && item.rate, 'Leave blank to set in the quote');
  else html = f('Item name', 'ceName', item && item.name, 'e.g. Wardrobe Box') + fCat('Category', 'ceCat', item && item.cat, 'Type or pick a category') + f('Rate ₹/sqft (optional)', 'ceRate', item && item.rate, 'Leave blank to set in the quote') +
    `<div class="grid-2">${f('Default W', 'ceW', item && item.w, '0')}${f('Default H', 'ceH', item && item.h, '0')}</div>`;
  $('#catEditFields').innerHTML = html;
  initCatTagPicker('ceCat', item && item.cat);
  $('#catEditModal').classList.remove('hidden');
}

// Category suggestions: categories already in the catalog + common trades.
// Deduped, sorted — keeps the picker short and useful.
function catSuggestions() {
  const seen = new Set();
  const cat = catList();
  [...(cat.services || []), ...(cat.items || [])].forEach(x => { if (x.cat) seen.add(x.cat.trim()); });
  ['Woodwork', 'Kitchen', 'Finishes', 'Fabrication', 'Lighting', 'Painting', 'Flooring', 'False Ceiling', 'Electrical', 'Plumbing', 'Upholstery', 'Curtains & Blinds'].forEach(c => seen.add(c));
  return [...seen].sort((a, b) => a.localeCompare(b));
}

// Notion-style tag picker: existing categories as tappable tags; typing a new
// one offers "＋ New". Enter or tapping the ＋ tag commits the typed category.
function initCatTagPicker(inputId, current) {
  const input = $(inputId);
  const tagsEl = $(inputId + 'Tags');
  if (!input || !tagsEl) return;
  const all = catSuggestions();
  let active = (current || '').trim();

  const render = () => {
    const q = input.value.trim().toLowerCase();
    const matches = all.filter(c => !q || c.toLowerCase().includes(q));
    tagsEl.innerHTML = matches
      .map(c => `<button type="button" class="cat-tag${c === active ? ' sel' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`)
      .join('');
    const typed = input.value.trim();
    if (typed && !all.some(c => c.toLowerCase() === typed.toLowerCase())) {
      tagsEl.insertAdjacentHTML('beforeend', `<button type="button" class="cat-tag create" data-cat-create="1">＋ "${esc(typed)}"</button>`);
    }
  };

  const pick = c => { active = c; input.value = c; render(); input.focus(); };

  tagsEl.addEventListener('click', e => {
    const tag = e.target.closest('[data-cat]');
    if (tag) { pick(tag.dataset.cat); return; }
    const create = e.target.closest('[data-cat-create]');
    if (create) pick(input.value.trim());
  });
  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = input.value.trim();
      if (v) pick(v);
    }
  });
  render();
}

async function saveCatEdit() {
  const arr = catArray();
  const val = s => $(s).value.trim();
  const err = m => {
    const el = $('#catEditErr');
    if (el) { el.textContent = m; el.classList.remove('hidden'); }
  };
  let entry;
  if (catTab === 'terms') { if (!val('#ceText')) { err('Enter the term text'); return; } entry = val('#ceText'); }
  else if (catTab === 'materials') {
    const c = val('#ceC'), d = val('#ceD');
    if (!c || !d) { err('Enter both the category and the material details'); return; }
    entry = { c, d };
  } else {
    const name = val('#ceName'), cat = val('#ceCat');
    if (!name) { err('Enter the name'); return; }
    if (!cat) { err('Pick or type a category'); return; }
    const rate = num($('#ceRate').value);
    if (catTab === 'services') entry = { id: (catEditIdx !== null && arr[catEditIdx] && arr[catEditIdx].id) || uid(), name, cat, rate };
    else entry = { id: (catEditIdx !== null && arr[catEditIdx] && arr[catEditIdx].id) || uid(), name, cat, rate, w: num($('#ceW').value) || null, h: num($('#ceH').value) || null };
  }
  const btn = document.querySelector('[data-action="cat-save"]');
  if (!beginPending('catalog-save', btn)) return;
  setPendingButton(btn, true, 'Saving…');
  try {
    if (catEditIdx === null) arr.push(entry); else arr[catEditIdx] = entry;
    renderCatTab();
    await pushCatalog();
    $('#catEditModal').classList.add('hidden');
  } finally {
    setPendingButton(btn, false);
    endPending('catalog-save', btn);
  }
}

async function delCatEntry(idx) {
  const arr = catArray();
  const name = catTab === 'terms' ? 'this term' : catTab === 'materials' ? 'this material' : (arr[idx] && arr[idx].name) || 'this entry';
  if (!await askConfirm('Delete ' + name + ' from your catalog?', { title: 'Delete catalog entry', confirmLabel: 'Delete', danger: true })) return;
  const key = 'catalog-delete:' + catTab + ':' + idx;
  if (!beginPending(key)) return;
  try {
    arr.splice(idx, 1);
    renderCatTab();
    await pushCatalog();
  } finally {
    endPending(key);
  }
}

/* ── View router (app shell) ── */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById(name);
  if (el) el.classList.remove('hidden');
  // sidebar active state (services/items/materials/terms map to catalog view)
  const active = name === 'catalog' ? catTab : name;
  document.querySelectorAll('.side-item').forEach(b => {
    b.classList.toggle('active', b.dataset.view === active);
  });
  document.body.classList.remove('side-open');
  window.scrollTo(0, 0);
  if (name === 'dashboard') renderDashboard();
  if (name === 'clients') {
    if (_clientsLoadedOnce) renderClientRows();
    else renderClients();
  }
  if (name === 'catalog') renderCatTab();
}

function navTo(view) {
  if (['services', 'items', 'materials', 'terms'].includes(view)) {
    catTab = view;
    _termsEditing = false;
    const t = $('#catHeadTitle');
    if (t) t.textContent = view.charAt(0).toUpperCase() + view.slice(1);
    const addBtn = $('#catAddBtn');
    if (addBtn) {
      const label = view === 'services' ? 'Service' : view === 'items' ? 'Item' : view === 'materials' ? 'Material' : 'Term';
      addBtn.textContent = '＋ Add ' + label;
    }
    updateTermsHeader();
    if (view === 'items') _catItemsPage = 0;
    showView('catalog');
    return;
  }
  showView(view);
}

/* ── Dashboard: stats + previous-quotes table ── */
let _dashQuotes = [];
let _dashCursor = null;
let _dashDone = true;
let _dashSearchTimer = null;
let _dashLoading = false;
let _dashLoadingMore = false;
let _dashError = null;
let _dashRequestSeq = 0;

async function renderDashboard() {
  const requestSeq = ++_dashRequestSeq;
  const search = (($('#dashSearch') || {}).value || '').trim();
  const status = (($('#dashStatus') || {}).value || '').trim();
  _dashQuotes = [];
  _dashCursor = null;
  _dashDone = false;
  _dashLoading = true;
  _dashLoadingMore = false;
  _dashError = null;
  if ($('#statMonth')) $('#statMonth').textContent = '…';
  if ($('#statValue')) $('#statValue').textContent = '…';
  if ($('#statOpen')) $('#statOpen').textContent = '…';
  renderDashRows();
  try {
    const [res, stats] = await Promise.all([
      window.Cloud
        ? window.Cloud.loadQuotes({ search, status })
        : Promise.resolve({ quotes: [], nextCursor: null, done: true }),
      window.Cloud
        ? window.Cloud.loadStats(todayStr().slice(0, 7))
        : Promise.resolve({ monthCount: 0, monthValue: 0, openCount: 0 }),
    ]);
    if (requestSeq !== _dashRequestSeq) return;
    if (res.error) _dashError = res.error;
    _dashQuotes = res.quotes;
    _dashCursor = res.nextCursor;
    _dashDone = res.done;
    $('#statMonth').textContent = stats.monthCount;
    $('#statValue').textContent = fmtRs(stats.monthValue);
    $('#statOpen').textContent = stats.openCount;
    if (stats.error) showToast('Dashboard totals could not be refreshed.', { type: 'error', actionLabel: 'Retry', onAction: () => renderDashboard() });
  } catch (e) {
    if (requestSeq === _dashRequestSeq) _dashError = e;
  } finally {
    if (requestSeq === _dashRequestSeq) {
      _dashLoading = false;
      renderDashRows();
    }
  }
}

// Single quote-row renderer — shared by the Dashboard and the per-client
// quotes panel so both always offer the exact same UI and actions.
function quoteRowHtml(q) {
  const st = q.status || 'draft';
  return `
    <div class="dash-row" data-action="dash-open" data-id="${q.id}">
      <div class="c-qno">${esc(q.quoteNo)}</div>
      <div class="c-client">${esc(q.customerName || '—')}<small>${q.itemCount} item${q.itemCount === 1 ? '' : 's'}</small></div>
      <div class="c-date">${esc(fmtDate(q.date))}</div>
      <div class="c-total">${fmtRs(q.grand)}</div>
      <div class="c-status"><select class="status-select status-${esc(st)}" data-action="status-change" data-id="${q.id}" aria-label="Quote status">
        ${['draft', 'sent', 'accepted', 'declined'].map(s => `<option value="${s}"${st === s ? ' selected' : ''}>${s.toUpperCase()}</option>`).join('')}
        ${q.status === 'expired' ? '<option value="expired" selected>EXPIRED</option>' : ''}
      </select></div>
      <div class="c-act">
        <button class="row-action" data-action="preview-quote" data-id="${q.id}" title="Preview quote" aria-label="Preview quote">↗</button>
        <button class="row-action" data-action="edit-quote" data-id="${q.id}" title="Edit quote" aria-label="Edit quote">✎</button>
        <div class="row-menu">
          <button class="row-action menu-trigger" data-action="quote-menu" data-id="${q.id}" title="More quote actions" aria-label="More quote actions">⋯</button>
          <div class="row-menu-popover hidden" data-menu="${q.id}">
            <button data-action="duplicate-quote" data-id="${q.id}">⧉ Duplicate</button>
            <button class="danger-menu" data-action="dash-del" data-id="${q.id}">🗑 Delete</button>
          </div>
        </div>
      </div>
    </div>`;
}

function renderDashRows() {
  const cont = $('#dashList');
  const moreBtn = $('#dashMore');
  if (cont) cont.setAttribute('aria-busy', String(_dashLoading || _dashLoadingMore));
  if (_dashLoading) {
    if (moreBtn) moreBtn.classList.add('hidden');
    cont.innerHTML = Array.from({ length: 5 }, () => '<div class="skeleton-row" aria-hidden="true"></div>').join('');
    return;
  }
  if (_dashError) {
    if (moreBtn) moreBtn.classList.add('hidden');
    cont.innerHTML = '<div class="load-error"><b>Could not load quotes</b><span>Check your connection and try again.</span><button class="btn ghost" data-action="retry-dashboard">Try again</button></div>';
    return;
  }
  if (moreBtn) {
    moreBtn.classList.toggle('hidden', _dashDone);
    setPendingButton(moreBtn, _dashLoadingMore, 'Loading…');
  }
  if (!_dashQuotes.length) {
    cont.innerHTML = '<div class="dash-empty"><b>No quotes yet</b><span>Hit ＋ New Quote — every quote you build lands here automatically.</span></div>';
    return;
  }
  cont.innerHTML = _dashQuotes.map(quoteRowHtml).join('');
}

async function loadMoreDash() {
  if (_dashDone || _dashLoading || _dashLoadingMore || !window.Cloud) return;
  const requestSeq = _dashRequestSeq;
  const search = (($('#dashSearch') || {}).value || '').trim();
  const status = (($('#dashStatus') || {}).value || '').trim();
  _dashLoadingMore = true;
  renderDashRows();
  try {
    const res = await window.Cloud.loadQuotes({ cursor: _dashCursor, search, status });
    if (requestSeq !== _dashRequestSeq) return;
    if (res.error) throw res.error;
    _dashQuotes = _dashQuotes.concat(res.quotes);
    _dashCursor = res.nextCursor;
    _dashDone = res.done;
  } catch (e) {
    showToast('Could not load more quotes.', { type: 'error', actionLabel: 'Retry', onAction: () => loadMoreDash() });
  } finally {
    _dashLoadingMore = false;
    renderDashRows();
  }
}

async function changeQuoteStatus(id, status, source) {
  if (status === 'expired') return;
  const key = 'quote-status:' + id;
  if (!beginPending(key, source)) return;
  try {
    const res = await window.Cloud.updateQuoteStatus(id, status);
    if (state.cloudId === id) {
      state.status = status;
      state.version = res.version;   // server bumped it — keep OCC in sync or the next autosave looks like a conflict
      save();
    }
    showToast('Quote marked ' + status + '.', { type: 'success' });
    await renderDashboard();
    refreshActiveClientPanel();
  } catch (e) {
    showToast('Could not update quote status.', { type: 'error' });
    await renderDashboard();
  } finally {
    endPending(key, source);
  }
}

let _deletedQuotes = [];
let _deletedQuotesLoading = false;
let _deletedQuotesError = false;

function renderDeletedQuotes() {
  const list = $('#deletedQuotesList');
  if (!list) return;
  if (_deletedQuotesLoading) {
    list.innerHTML = Array.from({ length: 3 }, () => '<div class="skeleton-card" aria-hidden="true"></div>').join('');
    return;
  }
  if (_deletedQuotesError) {
    list.innerHTML = '<div class="load-error"><b>Could not load deleted quotes</b><button class="btn ghost" data-action="deleted-quotes">Try again</button></div>';
    return;
  }
  if (!_deletedQuotes.length) {
    list.innerHTML = '<div class="client-empty">No deleted quotes.</div>';
    return;
  }
  list.innerHTML = _deletedQuotes.map(q => `
    <div class="deleted-quote-row">
      <div class="deleted-quote-main">
        <div class="deleted-quote-no">${esc(q.quoteNo)}</div>
        <div class="deleted-quote-sub">${esc(q.customerName || '—')} · deleted ${esc(new Date(q.deletedAt || q.updatedAt).toLocaleDateString('en-IN'))}</div>
      </div>
      <button class="btn ghost" data-action="restore-quote" data-id="${q.id}">Restore</button>
    </div>`).join('');
}

async function openDeletedQuotes() {
  if (_deletedQuotesLoading) return;
  const modal = $('#deletedQuotesModal');
  if (modal) modal.classList.remove('hidden');
  _deletedQuotesLoading = true;
  _deletedQuotesError = false;
  renderDeletedQuotes();
  try {
    const res = await window.Cloud.loadDeletedQuotes();
    if (res.error) throw res.error;
    _deletedQuotes = res.quotes;
  } catch (e) {
    _deletedQuotes = [];
    _deletedQuotesError = true;
  } finally {
    _deletedQuotesLoading = false;
    renderDeletedQuotes();
  }
}

async function restoreDeletedQuote(id, source, confirmed = false) {
  if (!confirmed && !await askConfirm('This puts the quote back in your active history.', { title: 'Restore quote?', confirmLabel: 'Restore quote' })) return;
  const key = 'quote-restore:' + id;
  if (!beginPending(key, source)) return;
  if (source) setPendingButton(source, true, 'Restoring…');
  try {
    await window.Cloud.restoreQuote(id);
    showToast('Quote restored.', { type: 'success' });
    await openDeletedQuotes();
    await renderDashboard();
  } catch (e) {
    showToast('Could not restore the quote.', { type: 'error', actionLabel: 'Try again', onAction: () => restoreDeletedQuote(id, source, true) });
  } finally {
    if (source) setPendingButton(source, false);
    endPending(key, source);
  }
}

let _quoteVersionsQuoteId = null;
let _quoteVersions = [];
let _quoteVersionsLoading = false;
let _quoteVersionsError = false;

function renderQuoteVersions() {
  const list = $('#quoteVersionsList');
  if (!list) return;
  if (_quoteVersionsLoading) {
    list.innerHTML = Array.from({ length: 4 }, () => '<div class="skeleton-card" aria-hidden="true"></div>').join('');
    return;
  }
  if (_quoteVersionsError) {
    list.innerHTML = '<div class="load-error"><b>Could not load quote history</b><button class="btn ghost" data-action="quote-history" data-id="' + esc(_quoteVersionsQuoteId || '') + '">Try again</button></div>';
    return;
  }
  if (!_quoteVersions.length) {
    list.innerHTML = '<div class="client-empty">No saved versions yet.</div>';
    return;
  }
  list.innerHTML = _quoteVersions.map(vr => `
    <div class="quote-version-row">
      <div class="quote-version-head"><span class="quote-version-label">Version ${vr.version}</span><span class="quote-version-date">${esc(new Date(vr.changedAt).toLocaleString('en-IN'))}</span></div>
      <div class="quote-version-sub">${esc(vr.changeType)} by ${esc(actorLabel(vr.changedBy))}</div>
      <button class="btn ghost" data-action="restore-quote-version" data-id="${vr.quoteId}" data-version="${vr.version}">Restore this version</button>
    </div>`).join('');
}

async function openQuoteVersions(quoteId) {
  if (_quoteVersionsLoading) return;
  _quoteVersionsQuoteId = quoteId;
  _quoteVersionsLoading = true;
  _quoteVersionsError = false;
  $('#quoteVersionsModal').classList.remove('hidden');
  renderQuoteVersions();
  try {
    const res = await window.Cloud.loadQuoteVersions(quoteId);
    if (res.error) throw res.error;
    _quoteVersions = res.versions;
  } catch (e) {
    _quoteVersions = [];
    _quoteVersionsError = true;
  } finally {
    _quoteVersionsLoading = false;
    renderQuoteVersions();
  }
}

async function restoreQuoteVersion(quoteId, version, source, confirmed = false) {
  if (!confirmed && !await askConfirm('Replace the current quote with version ' + version + '? A new audit entry will be created.', { title: 'Restore saved version?', confirmLabel: 'Restore version' })) return;
  const key = 'quote-version-restore:' + quoteId + ':' + version;
  if (!beginPending(key, source)) return;
  if (source) setPendingButton(source, true, 'Restoring…');
  try {
    await window.Cloud.restoreQuoteVersion(quoteId, Number(version));
    await window.Cloud.openQuote(quoteId);
    showToast('Quote version restored.', { type: 'success' });
    await openQuoteVersions(quoteId);
    await renderDashboard();
  } catch (e) {
    showToast('Could not restore that version.', { type: 'error', actionLabel: 'Try again', onAction: () => restoreQuoteVersion(quoteId, version, source, true) });
  } finally {
    if (source) setPendingButton(source, false);
    endPending(key, source);
  }
}

function toggleQuoteMenu(id) {
  document.querySelectorAll('.row-menu-popover').forEach(menu => {
    const willShow = menu.dataset.menu === id && menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !willShow);
    if (willShow) {
      // Last-row menus open downward past their clipping container
      // (.dash-table has overflow:hidden, so the popover gets cut off at
      // the table edge) — flip them upward instead.
      menu.classList.remove('open-up');
      const rect = menu.getBoundingClientRect();
      let clip = menu.parentElement;
      while (clip && clip !== document.body && !/(auto|scroll|hidden)/.test(getComputedStyle(clip).overflowY)) {
        clip = clip.parentElement;
      }
      const limit = clip && clip !== document.body
        ? clip.getBoundingClientRect().bottom - 4
        : window.innerHeight - 8;
      if (rect.bottom > limit) menu.classList.add('open-up');
    }
  });
}

async function previewDashQuote(id, source) {
  const key = 'quote-preview:' + id;
  if (!beginPending(key, source)) return;
  try {
    // Preview is read-only: snapshot the working quote so closing the preview
    // restores it, and load the quote WITHOUT persisting (no cloud write).
    const restore = JSON.parse(JSON.stringify(state));
    const opened = await window.Cloud.openQuote(id, false);
    if (!opened) throw new Error('Quote not found');
    _previewRestoreState = restore;
    // Remember where preview was opened from so closing it returns here.
    const clientList = source && source.closest('[data-client-list]');
    _previewReturn = clientList ? 'clients' : 'dashboard';
    _previewClientId = clientList ? clientList.dataset.clientList : null;
    showQuote();
  } catch (e) {
    showToast('Could not preview the quote.', { type: 'error' });
  } finally {
    endPending(key, source);
  }
}

async function duplicateDashQuote(id, source, confirmed = false) {
  if (!confirmed && !await askConfirm('Create a new editable copy of this quote?', { title: 'Duplicate quote', confirmLabel: 'Create copy' })) return;
  const key = 'quote-duplicate:' + id;
  if (!beginPending(key, source)) return;
  if (source) setPendingButton(source, true, 'Copying…');
  try {
    const doc = await window.Cloud.getQuote(id);
    if (!doc) throw new Error('Quote not found');
    window.AppHooks.applyQuote(doc);
    state.cloudId = null;
    state.version = 0;
    state.quoteNo = autoQuoteNo();
    state.status = 'draft';
    state.customer.clientId = undefined;
    save(); render(); showView('builder');
    showToast('Created a new quote copy.', { type: 'success' });
    refreshActiveClientPanel();
  } catch (e) {
    showToast('Could not duplicate the quote.', { type: 'error' });
  } finally {
    if (source) setPendingButton(source, false);
    endPending(key, source);
  }
}

async function openDashQuote(id, source, confirmed = false) {
  if (!confirmed && !await askConfirm('The current quote will be replaced by this saved quote.', { title: 'Open saved quote', confirmLabel: 'Open quote' })) return;
  const key = 'quote-open:' + id;
  if (!beginPending(key, source)) return;
  showToast('Opening quote…', { duration: 1200 });
  try {
    const opened = await window.Cloud.openQuote(id);
    if (!opened) throw new Error('Quote not found');
    hideToast();
    showView('builder');
  } catch (e) {
    showToast('Could not open the quote.', { type: 'error', actionLabel: 'Try again', onAction: () => openDashQuote(id, source, true) });
  } finally {
    endPending(key, source);
  }
}

async function delDashQuote(id, source, confirmed = false) {
  if (!confirmed && !await askConfirm('This removes the quote from history. PDFs you already sent stay yours.', { title: 'Delete quote?', confirmLabel: 'Delete quote', danger: true })) return;
  const key = 'quote-delete:' + id;
  if (!beginPending(key, source)) return;
  if (source) setPendingButton(source, true, 'Deleting…');
  try {
    await window.Cloud.deleteQuote(id);
    showToast('Quote deleted.', { type: 'success' });
    await renderDashboard();
    refreshActiveClientPanel();
  } catch (e) {
    showToast('Could not delete the quote.', { type: 'error', actionLabel: 'Try again', onAction: () => delDashQuote(id, source, true) });
  } finally {
    if (source) setPendingButton(source, false);
    endPending(key, source);
  }
}

/* ── Clients page ── */
let _allClients = [];
let _clientVisibleClients = [];
let _clientEditId = null;
let _clientsCursor = null;
let _clientsDone = true;
let _clientsSearchTimer = null;
let _clientsLoading = false;
let _clientsLoadingMore = false;
let _clientsError = null;
let _clientsSearchLoading = false;
let _clientsSearchResults = null;
let _clientsSearchCursor = null;
let _clientsSearchDone = true;
let _clientsSearchSeq = 0;
let _clientsRequestSeq = 0;
let _clientsLoadedOnce = false;
let _showArchived = false;

function clientMatches(client, term) {
  const hay = [client.name, client.phone, client.address].filter(Boolean).join(' ').toLowerCase();
  return !term || hay.includes(term.toLowerCase());
}

function clientSearchTerm() {
  return (($('#clientSearch') || {}).value || '').trim();
}

async function renderClients() {
  const requestSeq = ++_clientsRequestSeq;
  _clientsSearchSeq += 1;
  _clientsLoadedOnce = false;
  _allClients = [];
  _clientVisibleClients = [];
  _clientsCursor = null;
  _clientsDone = false;
  _clientsLoading = true;
  _clientsLoadingMore = false;
  _clientsError = null;
  _clientsSearchResults = null;
  _clientsSearchCursor = null;
  _clientsSearchDone = true;
  _clientsSearchLoading = false;
  renderClientRows();
  try {
    const res = window.Cloud
      ? await window.Cloud.loadClients({ archivedOnly: _showArchived })
      : { clients: [], nextCursor: null, done: true };
    if (requestSeq !== _clientsRequestSeq) return;
    if (res.error) _clientsError = res.error;
    _allClients = res.clients;
    _clientsCursor = res.nextCursor;
    _clientsDone = res.done;
  } catch (e) {
    if (requestSeq === _clientsRequestSeq) _clientsError = e;
  } finally {
    if (requestSeq === _clientsRequestSeq) {
      _clientsLoading = false;
      _clientsLoadedOnce = true;
      applyClientSearch(clientSearchTerm(), true, !!_clientsError);
    }
  }
}

function applyClientSearch(term, scheduleServer = true, preserveError = false) {
  const q = String(term || '').trim();
  clearTimeout(_clientsSearchTimer);
  _clientsSearchSeq += 1;
  if (!preserveError) _clientsError = null;
  _clientsSearchResults = null;
  _clientsSearchCursor = null;
  _clientsSearchDone = true;
  _clientsSearchLoading = false;
  _clientVisibleClients = _allClients.filter(c => clientMatches(c, q));
  renderClientRows();
  const needsServer = scheduleServer && q.length >= 2 && !_clientsDone;
  if (!needsServer || !window.Cloud) return;
  const searchSeq = _clientsSearchSeq;
  _clientsSearchTimer = setTimeout(() => searchClientsServer(q, searchSeq), 350);
}

async function searchClientsServer(term, searchSeq) {
  if (searchSeq !== _clientsSearchSeq || !window.Cloud) return;
  _clientsSearchLoading = true;
  renderClientRows();
  try {
    const res = await window.Cloud.loadClients({ search: term, archivedOnly: _showArchived });
    if (searchSeq !== _clientsSearchSeq) return;
    if (res.error) throw res.error;
    _clientsError = null;
    _clientsSearchResults = res.clients;
    _clientsSearchCursor = res.nextCursor;
    _clientsSearchDone = res.done;
    _clientVisibleClients = res.clients;
  } catch (e) {
    if (searchSeq === _clientsSearchSeq) {
      _clientsError = e;
      showToast('Could not search clients.', { type: 'error', actionLabel: 'Retry', onAction: () => searchClientsServer(term, _clientsSearchSeq) });
    }
  } finally {
    if (searchSeq === _clientsSearchSeq) {
      _clientsSearchLoading = false;
      renderClientRows();
    }
  }
}

async function loadMoreClients() {
  if (_clientsLoading || _clientsLoadingMore || !window.Cloud) return;
  const requestSeq = _clientsRequestSeq;
  const searchSeq = _clientsSearchSeq;
  const q = clientSearchTerm();
  const searching = q.length >= 2 && _clientsSearchResults;
  if (searching ? _clientsSearchDone : _clientsDone) return;
  _clientsLoadingMore = true;
  renderClientRows();
  try {
    const res = await window.Cloud.loadClients({ cursor: searching ? _clientsSearchCursor : _clientsCursor, ...(searching ? { search: q } : {}), archivedOnly: _showArchived });
    if (requestSeq !== _clientsRequestSeq || searchSeq !== _clientsSearchSeq) return;
    if (res.error) throw res.error;
    if (searching) {
      _clientsSearchResults = _clientsSearchResults.concat(res.clients);
      _clientVisibleClients = _clientsSearchResults;
      _clientsSearchCursor = res.nextCursor;
      _clientsSearchDone = res.done;
    } else {
      _allClients = _allClients.concat(res.clients);
      _clientVisibleClients = _allClients.filter(c => clientMatches(c, q));
      _clientsCursor = res.nextCursor;
      _clientsDone = res.done;
    }
  } catch (e) {
    showToast('Could not load more clients.', { type: 'error', actionLabel: 'Retry', onAction: () => loadMoreClients() });
  } finally {
    if (requestSeq === _clientsRequestSeq && searchSeq === _clientsSearchSeq) {
      _clientsLoadingMore = false;
      renderClientRows();
    }
  }
}

function renderClientRows() {
  const moreBtn = $('#clientsMore');
  const searching = clientSearchTerm().length >= 2 && _clientsSearchResults;
  const canLoadMore = searching ? !_clientsSearchDone : !_clientsDone;
  if (moreBtn) {
    moreBtn.classList.toggle('hidden', !canLoadMore || _clientsLoading || _clientsSearchLoading || !!_clientsError);
    setPendingButton(moreBtn, _clientsLoadingMore, 'Loading…');
  }
  const cont = $('#clientList');
  if (cont) cont.setAttribute('aria-busy', String(_clientsLoading || _clientsLoadingMore || _clientsSearchLoading));
  if (_clientsLoading) {
    cont.innerHTML = Array.from({ length: 5 }, () => '<div class="skeleton-card" aria-hidden="true"></div>').join('');
    return;
  }
  if (_clientsError && !_clientVisibleClients.length) {
    cont.innerHTML = '<div class="load-error"><b>Could not load clients</b><span>Check your connection and try again.</span><button class="btn ghost" data-action="retry-clients">Try again</button></div>';
    return;
  }
  if (_clientsSearchLoading) {
    cont.innerHTML = '<div class="list-loading-note">Searching older clients…</div>' + (_clientVisibleClients.length ? '' : '<div class="skeleton-card" aria-hidden="true"></div>');
  } else cont.innerHTML = '';
  if (!_clientVisibleClients.length) {
    cont.innerHTML += `<div class="client-empty">${clientSearchTerm() ? 'No matching clients.' : 'No clients yet — add one manually, or every customer you add to a quote is saved here automatically.'}</div>`;
    return;
  }
  cont.innerHTML += _clientVisibleClients.map(c => {
    const initials = (c.name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
    const hasQuotes = (c.quoteCount || 0) > 0;
    const latestQuote = (c.quotes || [])[0] || null;
    const clientContext = latestQuote
      ? `<span class="client-context-label">Latest quote</span><b>${fmtRs(latestQuote.grand || 0)}</b>`
      : '<span class="client-context-empty">No quotes yet · Create the first one</span>';
    return `<div class="client-row${hasQuotes ? ' has-q' : ''}${_showArchived ? ' archived' : ''}" data-action="toggle-client-quotes" data-id="${c.id}">
      <div class="client-avatar">${esc(initials)}</div>
      <div class="client-main">
        <div class="client-name">${esc(c.name)}</div>
        <div class="client-sub">${esc([c.phone, c.address].filter(Boolean).join(' · ') || 'No contact saved')}</div>
      </div>
      <div class="client-context">${clientContext}</div>
      <div class="client-quotes">
        <div class="client-qn">${c.quoteCount}</div>
        <div class="client-ql">quote${c.quoteCount === 1 ? '' : 's'}</div>
      </div>
      <div class="client-actions">
        ${_showArchived ? '' : `<button class="btn ghost client-quick" data-action="create-client-quote" data-id="${c.id}" title="Create a new quote for ${esc(c.name)}">＋ Quote</button>`}
        <button class="icon-btn" data-action="edit-client" data-id="${c.id}" title="Edit">✏️</button>
        <div class="row-menu">
          <button class="icon-btn" data-action="quote-menu" data-id="${c.id}" title="More client actions" aria-label="More client actions">⋯</button>
          <div class="row-menu-popover hidden" data-menu="${c.id}">
            ${_showArchived ? `<button data-action="unarchive-client" data-id="${c.id}">↩ Restore client</button>` : `<button class="danger-menu" data-action="archive-client" data-id="${c.id}">📦 Archive client</button>`}
          </div>
        </div>
        </div>
      </div>
      <div class="client-quotes-panel hidden" data-panel="${c.id}">
        <div class="dash-list" data-client-list="${c.id}"></div>
        <button class="btn ghost full load-more hidden" data-action="client-quotes-more" data-id="${c.id}">Load more quotes</button>
      </div>
    </div>`;
  }).join('');
}

/* ── Per-client quote table (same component as the Dashboard, scoped by clientId) ── */
const _clientQuotePanels = {};   // clientId → {quotes, cursor, done, search, status, loading, loadingMore, error}
let _activeClientPanelId = null;

async function toggleClientQuotes(id) {
  const panel = document.querySelector(`[data-panel="${id}"]`);
  if (!panel) return;
  const opening = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !opening);
  if (opening) {
    _activeClientPanelId = id;
    if (!_clientQuotePanels[id]) {
      _clientQuotePanels[id] = { quotes: [], cursor: null, done: false, search: '', status: '', loading: false, loadingMore: false, error: null };
    }
    renderClientQuoteRows(id);
    if (!_clientQuotePanels[id].quotes.length) loadClientQuotePage(id, true);
  } else if (_activeClientPanelId === id) {
    _activeClientPanelId = null;
  }
}

async function loadClientQuotePage(id, reset = false) {
  const st = _clientQuotePanels[id];
  if (!st || st.loading) return;
  if (reset) { st.quotes = []; st.cursor = null; st.done = false; st.error = null; }
  if (st.done && !reset) return;
  st.loading = true;
  st.loadingMore = !reset && st.quotes.length > 0;
  renderClientQuoteRows(id);
  try {
    const res = await window.Cloud.loadQuotes({
      cursor: reset ? null : st.cursor, search: st.search, status: st.status, clientId: id,
    });
    if (res.error) throw res.error;
    st.quotes = reset ? res.quotes : st.quotes.concat(res.quotes);
    st.cursor = res.nextCursor;
    st.done = res.done;
  } catch (e) {
    st.error = e;
  } finally {
    st.loading = false;
    st.loadingMore = false;
    renderClientQuoteRows(id);
  }
}

function renderClientQuoteRows(id) {
  const st = _clientQuotePanels[id];
  const list = document.querySelector(`[data-client-list="${id}"]`);
  const moreBtn = document.querySelector(`[data-action="client-quotes-more"][data-id="${id}"]`);
  if (!st || !list) return;
  list.setAttribute('aria-busy', String(st.loading || st.loadingMore));
  if (st.loading && !st.quotes.length) {
    if (moreBtn) moreBtn.classList.add('hidden');
    list.innerHTML = Array.from({ length: 3 }, () => '<div class="skeleton-row" aria-hidden="true"></div>').join('');
    return;
  }
  if (st.error && !st.quotes.length) {
    if (moreBtn) moreBtn.classList.add('hidden');
    list.innerHTML = `<div class="load-error"><b>Could not load quotes</b><span>Check your connection and try again.</span><button class="btn ghost" data-action="retry-client-quotes" data-id="${esc(id)}">Try again</button></div>`;
    return;
  }
  if (moreBtn) {
    moreBtn.classList.toggle('hidden', st.done);
    setPendingButton(moreBtn, st.loadingMore, 'Loading…');
  }
  if (!st.quotes.length) {
    list.innerHTML = '<div class="dash-empty"><b>No quotes yet</b><span>Hit ＋ Quote to create the first quote for this client.</span></div>';
    return;
  }
  list.innerHTML = st.quotes.map(quoteRowHtml).join('');
}

// After a mutation on a quote that belongs to the open client panel, reload it
// so the panel stays in sync with the Dashboard.
function refreshActiveClientPanel() {
  if (_activeClientPanelId && _clientQuotePanels[_activeClientPanelId]) {
    loadClientQuotePage(_activeClientPanelId, true);
  }
}

function openClientModal(client) {
  _clientEditId = client ? client.id : null;
  $('#clientModalTitle').textContent = client ? 'Edit client' : 'Add client';
  $('#clName').value = client ? client.name : '';
  $('#clPhone').value = client ? client.phone || '' : '';
  $('#clAddress').value = client ? client.address || '' : '';
  const draftRow = $('#clDraftRow');
  const draftCheck = $('#clUpdateDraft');
  if (draftRow) draftRow.classList.toggle('hidden', !client);
  if (draftCheck) draftCheck.checked = !!client && _pickFromBuilder;
  // deliberate merge: only offered when editing an EXISTING client, listing
  // the other records — never automatic.
  const mergeRow = $('#clMergeRow');
  const mergeSel = $('#clMerge');
  if (client && mergeSel) {
    const pool = [..._allClients, ...(_clientsSearchResults || [])];
    const others = [...new Map(pool.map(c => [c.id, c])).values()].filter(c => c.id !== client.id);
    mergeSel.innerHTML = '<option value="">— Merge with another client… —</option>' + others.map(c =>
      `<option value="${esc(c.id)}">${esc(c.name)}${c.phone ? ' · ' + esc(c.phone) : ''}</option>`).join('');
    if (mergeRow) mergeRow.classList.remove('hidden');
  } else if (mergeRow) {
    mergeRow.classList.add('hidden');
    if (mergeSel) mergeSel.innerHTML = '';
  }
  $('#clientModal').classList.remove('hidden');
  setTimeout(() => $('#clName').focus(), 50);
}

function closeClientModal() {
  $('#clientModal').classList.add('hidden');
  _clientEditId = null;
  _pickFromBuilder = false;
  if ($('#clDraftRow')) $('#clDraftRow').classList.add('hidden');
  if ($('#clUpdateDraft')) $('#clUpdateDraft').checked = false;
  ['#clName', '#clPhone', '#clAddress'].forEach(s => $(s).value = '');
}

async function saveClientForm() {
  const name = $('#clName').value.trim();
  if (!name) { showToast('Enter the client name.', { type: 'error' }); return; }
  const phone = $('#clPhone').value.trim();
  const address = $('#clAddress').value.trim();
  const mergeSel = $('#clMerge');
  const mergeIntoId = mergeSel && mergeSel.value ? mergeSel.value : undefined;
  if (mergeIntoId) {
    const targetName = mergeSel.options[mergeSel.selectedIndex] ? mergeSel.options[mergeSel.selectedIndex].text : 'that client';
    if (!await askConfirm('All of ' + name + '\'s quotes move to ' + targetName + ' and this record is deleted. This cannot be undone.', { title: 'Merge clients?', confirmLabel: 'Merge clients', danger: true })) return;
  }
  const btn = document.querySelector('[data-action="save-client"]');
  if (!beginPending('client-save', btn)) return;
  setPendingButton(btn, true, 'Saving…');
  try {
    const res = await window.Cloud.saveClient({
      id: _clientEditId || undefined,
      name,
      phone,
      address,
      mergeIntoId,
    });
    const fromBuilder = _pickFromBuilder; // capture BEFORE close resets the flag
    const updateDraft = !!$('#clUpdateDraft').checked;
    closeClientModal();
    if (fromBuilder && updateDraft) {
      // The modal came from the builder picker → apply the new/edited client
      // to the quote right away (name, phone, address) and refresh the label.
      state.customer = { name, phone, address, clientId: res.id };
      save(); bindFields(); syncClientPickLabel();
    } else {
      await renderClients();
    }
  } catch (e) {
    const extra = window.Cloud && window.Cloud.lastError ? window.Cloud.lastError() : null;
    showToast('Could not save the client.' + (extra ? ' ' + extra : ''), { type: 'error' });
  } finally {
    setPendingButton(btn, false);
    endPending('client-save', btn);
  }
}

async function createQuoteForClient(id) {
  const client = _clientVisibleClients.find(x => x.id === id) || _allClients.find(x => x.id === id);
  if (!client) return;
  if (!await askConfirm('The current quote is saved to history. Start a new quote for ' + client.name + '?', { title: 'New quote', confirmLabel: 'Start quote' })) return;
  const customer = {
    name: client.name || '',
    phone: client.phone || '',
    address: client.address || '',
    clientId: client.id,
  };
  state.sections = [];
  state.finalCharge = 0;
  state.status = 'draft';
  const cat = window.Cloud && window.Cloud.catalog;
  state.terms = cat && cat.terms.length ? [...cat.terms] : [...DEFAULT_TERMS];
  state.spec = cat && cat.materials.length ? cat.materials.map(x => ({ ...x })) : DEFAULT_SPEC.map(x => ({ ...x }));
  state.customer = customer;
  state.quoteNo = '';
  claimFreshNumber();
  state.customer = customer;
  save(); bindFields(); render(); showView('builder');
  showToast('New quote started for ' + client.name + '.', { type: 'success' });
}

async function editClientById(id) {
  const c = _clientVisibleClients.find(x => x.id === id) || _allClients.find(x => x.id === id);
  if (c) openClientModal(c);
}

async function archiveClientById(id, source, confirmed = false) {
  const c = _clientVisibleClients.find(x => x.id === id) || _allClients.find(x => x.id === id);
  if (!confirmed && !await askConfirm('Archive this client? They will be hidden from the client book, but all their saved quotations will remain safe in history.', { title: 'Archive client?', confirmLabel: 'Archive client' })) return;
  const key = 'client-archive:' + id;
  if (!beginPending(key, source)) return;
  if (source) setPendingButton(source, true, 'Archiving…');
  try {
    await window.Cloud.archiveClient(id);
    showToast((c ? c.name : 'Client') + ' archived. Saved quotes remain in history.', { type: 'success' });
    await renderClients();
  } catch (e) {
    showToast('Could not archive the client.', { type: 'error', actionLabel: 'Try again', onAction: () => archiveClientById(id, source, true) });
  } finally {
    if (source) setPendingButton(source, false);
    endPending(key, source);
  }
}

async function unarchiveClientById(id, source) {
  const key = 'client-unarchive:' + id;
  if (!beginPending(key, source)) return;
  if (source) setPendingButton(source, true, 'Restoring…');
  try {
    await window.Cloud.unarchiveClient(id);
    showToast('Client restored.', { type: 'success' });
    await renderClients();
  } catch (e) {
    showToast('Could not restore the client.', { type: 'error' });
  } finally {
    if (source) setPendingButton(source, false);
    endPending(key, source);
  }
}

/* ── Builder client picker ── */
let _pickClients = [];          // cached client list for the builder picker
let _pickFromBuilder = false;   // true when the client modal was opened from the picker
let _clientPickerLoading = false;
let _clientPickSearchTimer = null;
let _clientPickSearchSeq = 0;

async function toggleClientPick() {
  const list = $('#clientPickList');
  if (!list.classList.contains('hidden')) { list.classList.add('hidden'); return; }
  // Open immediately, even while the cloud request is running. This keeps
  // “Add new client” usable when the network is slow or unavailable.
  list.classList.remove('hidden');
  const search = $('#clientPickSearch');
  if (search) { search.value = ''; setTimeout(() => search.focus(), 0); }
  renderClientPick();
  if (_clientPickerLoading) return;
  _clientPickerLoading = true;
  const rows = $('#clientPickRows');
  if (rows) rows.insertAdjacentHTML('afterbegin', '<div class="list-loading-note" data-picker-loading>Loading clients…</div>');
  try {
    const res = window.Cloud ? await window.Cloud.loadClients() : { clients: [] };
    if (res.error) throw res.error;
    _pickClients = res.clients || [];
  }
  catch (e) {
    _pickClients = [];
    showToast('Could not load clients. You can still add a new client.', { type: 'error' });
  } finally {
    _clientPickerLoading = false;
    renderClientPick(search ? search.value : '');
  }
}

function renderClientPick(term = '') {
  const cur = (state.customer.name || '').trim().toLowerCase();
  const linkedId = state.customer.clientId;
  const q = term.trim().toLowerCase();
  const visible = _pickClients.filter(c => !q || [c.name, c.phone, c.address].join(' ').toLowerCase().includes(q));
  const rows = visible.map(c => {
    const initials = (c.name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
    const active = (linkedId && c.id === linkedId) ||
      (!linkedId && cur && c.name.trim().toLowerCase() === cur) ? ' active' : '';
    return `<div class="cp-row${active}" data-action="pick-client" data-id="${c.id}">
      <span class="cp-avatar">${esc(initials)}</span>
      <span class="cp-main">
        <span class="cp-name">${esc(c.name)}</span>
        <span class="cp-sub">${esc([c.phone, c.address].filter(Boolean).join(' · ') || 'No contact saved')}</span>
      </span>
      <button type="button" class="cp-edit" data-action="pick-edit-client" data-id="${c.id}" title="Edit client">✏️</button>
    </div>`;
  }).join('');
  const addRow = `<div class="cp-row cp-add" data-action="pick-add-client">
    <span class="cp-avatar">＋</span>
    <span class="cp-main"><span class="cp-name">Add new client</span><span class="cp-sub">Save a new person to your book</span></span>
  </div>`;
  $('#clientPickRows').innerHTML = (rows || '<div class="cp-empty">No matching clients — add one below.</div>') + addRow;
}

async function searchClientPicker(term) {
  const seq = ++_clientPickSearchSeq;
  const q = term.trim();
  if (q.length < 2 || !window.Cloud) { renderClientPick(q); return; }
  const rows = $('#clientPickRows');
  if (rows) rows.innerHTML = '<div class="list-loading-note">Searching clients…</div>';
  try {
    const res = await window.Cloud.loadClients({ search: q });
    if (seq !== _clientPickSearchSeq) return;
    if (res.error) throw res.error;
    _pickClients = res.clients || [];
    renderClientPick(q);
  } catch (e) {
    if (seq === _clientPickSearchSeq) showToast('Could not search clients.', { type: 'error' });
  }
}

function pickClient(id) {
  const c = _pickClients.find(x => x.id === id);
  if (!c) return;
  state.customer = { name: c.name, phone: c.phone || '', address: c.address || '', clientId: c.id };
  save(); bindFields(); syncClientPickLabel();
  $('#clientPickList').classList.add('hidden');
}

function pickAddClient() {
  _pickFromBuilder = true;
  $('#clientPickList').classList.add('hidden');
  openClientModal(null);
}

// Edit an existing client straight from the builder picker — the modal opens
// pre-filled; saving applies the (possibly changed) details back to the quote.
function pickEditClient(id) {
  const c = _pickClients.find(x => x.id === id);
  if (!c) return;
  _pickFromBuilder = true;
  $('#clientPickList').classList.add('hidden');
  openClientModal(c);
}

// Keep the picker button in sync with whatever the customer fields hold.
function syncClientPickLabel() {
  const name = (state.customer && state.customer.name || '').trim();
  $('#cpLabel').textContent = name || 'Select client…';
  const av = $('#cpAvatar');
  if (name) av.textContent = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  else av.textContent = '👤';
}

/* ── Profile (bottom of sidebar) ── */
function profileIdentity() {
  const u = window.Clerk && window.Clerk.user;
  if (!u) return null;
  const email = (u.emailAddresses && u.emailAddresses[0] && u.emailAddresses[0].emailAddress) || '';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || email || 'Designer';
  return { name, email, imageUrl: u.imageUrl || '' };
}

function fillProfile() {
  const p = profileIdentity();
  if (!p) return;
  $('#profileName').textContent = p.name;
  $('#profileEmail').textContent = p.email;
  const av = $('#profileAvatar');
  if (p.imageUrl) av.innerHTML = `<img src="${esc(p.imageUrl)}" alt="">`;
  else av.textContent = p.name.trim().charAt(0).toUpperCase() || 'L';
}

function syncProfileMenu() {
  const p = profileIdentity();
  if (!p) return;
  $('#menuName').textContent = p.name;
  $('#menuEmail').textContent = p.email;
  const av = $('#menuAvatar');
  if (p.imageUrl) av.innerHTML = `<img src="${esc(p.imageUrl)}" alt="">`;
  else av.textContent = p.name.trim().charAt(0).toUpperCase() || 'L';
}

function toggleProfileMenu() {
  const menu = $('#profileMenu');
  const trig = document.querySelector('.side-profile');
  if (!menu) return;
  const willOpen = menu.classList.contains('hidden');
  if (willOpen) syncProfileMenu();
  menu.classList.toggle('hidden', !willOpen);
  if (trig) trig.setAttribute('aria-expanded', String(willOpen));
}

function closeProfileMenu() {
  const menu = $('#profileMenu');
  if (menu) menu.classList.add('hidden');
  const trig = document.querySelector('.side-profile');
  if (trig) trig.setAttribute('aria-expanded', 'false');
}

function comingSoon(what) {
  showToast(what + ' is coming soon.', { type: 'info' });
}

/* ── Cloud hooks (called by cloud.js) ── */
function resetLocalForSignedOut() {
  state = {
    company: { name: 'LIVORA INTERIORS', address: 'Miyapur, Hyderabad, Telangana 502034', phone: '8886767991' },
    customer: { name: '', phone: '', address: '', clientId: null },
    quoteNo: autoQuoteNo(), cloudId: null, version: 0, date: todayStr(),
    sections: DEFAULT_SECTIONS.map(n => ({ id: uid(), name: n.name, items: [], collapsed: false })),
    finalCharge: 0, gst: 0, status: 'draft', validityDays: 15, timeline: '',
    terms: [...DEFAULT_TERMS], spec: DEFAULT_SPEC.map(x => ({ ...x })),
    showDims: true, showSpec: true,
  };
  _localCatalog = null;
  try { localStorage.removeItem(LS_KEY); localStorage.removeItem(CAT_KEY); } catch (e) {}
  bindFields(); render();
}

function actorLabel(subject) {
  const current = window.Clerk && window.Clerk.user;
  if (current && current.id === subject) return 'You';
  const name = current && [current.firstName, current.lastName].filter(Boolean).join(' ');
  return name || 'Another user';
}

function claimFreshNumber() {
  // The permanent number is assigned by the server on first cloud save.
  // Here we only put a clearly-temporary placeholder in the field; the
  // official LQ-YYYY-NNN replaces it the moment the quote syncs.
  state.cloudId = null;
  state.version = 0;
  state.customer.clientId = undefined;
  state.quoteNo = autoQuoteNo();
  save(); render();
}

window.AppHooks = {
  resetLocalForSignedOut,
  payload: () => ({
    id: state.cloudId || undefined, version: state.version || 0,
    clientId: state.customer.clientId || undefined,
    quoteNo: state.quoteNo || '', date: state.date,
    customer: { name: state.customer.name, phone: state.customer.phone, address: state.customer.address },
    sections: state.sections, finalCharge: state.finalCharge, gst: state.gst,
    validityDays: num(state.validityDays) || 15, timeline: state.timeline || '',
    terms: state.terms, spec: state.spec,
    showDims: state.showDims !== false, showSpec: state.showSpec !== false,
    status: state.status || 'draft',
    total: quoteTotal(), discount: discountAmount(), gstAmt: gstAmount(), grand: grandTotal(), itemCount: itemCount(),
  }),
  // what the cloud should seed when the server catalog is missing/empty
  catalogSnapshot: () => catList(),
  recordSaved: (result) => {
    const numberChanged = result.quoteNo && result.quoteNo !== state.quoteNo;
    state.cloudId = result.id;
    state.version = result.version;
    if (result.clientId) state.customer.clientId = result.clientId;
    if (numberChanged) state.quoteNo = result.quoteNo;
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
    if (numberChanged) { bindFields(); render(); renderSummary(); }
  },
  applyQuote: (doc, persist = true) => {
    state.cloudId = doc._id || null; state.version = doc.version || 0;
    state.quoteNo = doc.quoteNo || ''; state.date = doc.date || todayStr();
    state.customer = {
      name: doc.customer?.name || '', phone: doc.customer?.phone || '', address: doc.customer?.address || '',
      clientId: doc.clientId || undefined,
    };
    state.sections = Array.isArray(doc.sections) ? doc.sections : [];
    state.finalCharge = doc.finalCharge || 0; state.gst = doc.gst || 0; state.status = doc.status || 'draft';
    state.validityDays = doc.validityDays || 15; state.timeline = doc.timeline || '';
    state.terms = Array.isArray(doc.terms) && doc.terms.length ? [...doc.terms] : [...DEFAULT_TERMS];
    state.spec = Array.isArray(doc.spec) && doc.spec.length ? doc.spec.map(x => ({ ...x })) : DEFAULT_SPEC.map(x => ({ ...x }));
    state.showDims = doc.showDims !== false; state.showSpec = doc.showSpec !== false;
    if (persist) save();
    bindFields(); render();
    if (!$('#quote').classList.contains('hidden')) renderQuote();
  },
  seed: () => ({
    items: LIBRARY.filter(i => !i.lump).map(i => ({ id: i.id, name: i.name, rate: i.rate, w: i.w, h: i.h, cat: i.cat })),
    services: LIBRARY.filter(i => i.lump).map(i => ({ id: i.id, name: i.name, rate: i.rate, cat: i.cat })),
    materials: DEFAULT_SPEC.map(s => ({ ...s })),
    terms: [...DEFAULT_TERMS],
  }),
};

// catalog edits apply terms/materials to the current quote → preview shows them
// Catalog changes apply to future quotes only. Existing quote snapshots stay intact.

// login complete → fill the profile card and land on the dashboard
window.addEventListener('cloudready', () => {
  fillProfile();
  showView('dashboard');
});

window.addEventListener('cloudstatus', (e) => setQuoteSyncStatus(e.detail));

// sync failure → show it on the dashboard instead of failing silently
window.addEventListener('clouderror', (e) => {
  const banner = $('#syncBanner');
  if (!banner) return;
  const msg = e.detail;
  if (!msg) { banner.classList.add('hidden'); return; }
  banner.innerHTML = '<b>⚠ Sync needs attention</b>' + esc(msg) +
    ' — your quote is safe on this device. Check the connection and try again.';
  banner.classList.remove('hidden');
});

/* ── Sync conflict (two devices changed the same quote) ── */
let _conflict = null; // {id, cloudVersion, message}
let _conflictResolving = false;

window.addEventListener('cloudconflict', (e) => {
  _conflict = e.detail || {};
  const msg = document.getElementById('conflictMsg');
  if (msg) {
    msg.innerHTML = 'This quote was changed on <b>another device</b> since you loaded it here. ' +
      'Your unsaved edits are safe on this device — choose how to resolve the difference.';
  }
  const hint = document.getElementById('conflictHint');
  if (hint) hint.textContent = 'Nothing is lost either way: your version stays editable locally until you pick an option.';
  const modal = $('#conflictModal');
  if (modal) {
    // re-arm the buttons — a previous conflict may have disabled them
    const labels = { 'conflict-reload': 'Reload cloud version', 'conflict-copy': 'Keep my changes as a copy', 'conflict-merge': 'Try merge' };
    modal.querySelectorAll('button[data-action]').forEach(b => {
      b.disabled = false;
      if (labels[b.dataset.action]) b.textContent = labels[b.dataset.action];
    });
    modal.classList.remove('hidden');
  }
});

function dismissConflict() {
  if (!window.Cloud || !_conflict) return;
  window.Cloud._conflictSuppressedId = _conflict.id;
  const modal = $('#conflictModal');
  if (modal) modal.classList.add('hidden');
  // Keep _conflict so the user can reopen resolution later — the old behaviour
  // dropped the reference and left no way back. Surface it in the sync banner.
  const banner = $('#syncBanner');
  if (banner) {
    banner.innerHTML = '<b>⚠ Sync needs attention</b> This quote was changed on another device — your edits are safe on this device. ' +
      '<button class="btn ghost" data-action="reopen-conflict">Resolve now</button>';
    banner.classList.remove('hidden');
  }
  showToast('Your edits are staying on this device and will not overwrite the cloud quote.', { type: 'info', duration: 6000 });
}

function reopenConflict() {
  if (!_conflict) return;
  const modal = $('#conflictModal');
  if (modal) {
    modal.querySelectorAll('button[data-action]').forEach(b => { b.disabled = false; });
    modal.classList.remove('hidden');
  }
}

async function resolveConflict(action) {
  const modal = $('#conflictModal');
  if (!_conflict || !window.Cloud || _conflictResolving) return;
  _conflictResolving = true;
  const btn = modal && modal.querySelector('[data-action="conflict-' + action + '"]');
  const busy = m => { if (btn) { btn.disabled = true; btn.textContent = m; } };
  const done = () => {
    if (modal) modal.classList.add('hidden');
    _conflict = null;
    window.Cloud._conflictSuppressedId = null;
    _conflictResolving = false;
    const banner = $('#syncBanner');
    if (banner) banner.classList.add('hidden');
  };
  try {
    if (action === 'reload') {
      busy('Loading…');
      const doc = await window.Cloud.getQuote(_conflict.id);
      if (!doc) { showToast('The cloud copy was deleted. Your local version is still safe.', { type: 'error' }); }
      else { window.AppHooks.applyQuote(doc); }
      done();
    } else if (action === 'copy') {
      busy('Saving…');
      // Keep local edits as a NEW quote: drop the cloud identity so the next
      // push creates a fresh record (server assigns its official number).
      state.cloudId = null;
      state.version = 0;
      state.quoteNo = autoQuoteNo();
      state.customer.clientId = undefined;
      save();
      done();
    } else if (action === 'merge') {
      busy('Merging…');
      const doc = await window.Cloud.getQuote(_conflict.id);
      if (!doc) { showToast('The cloud copy was deleted. Your local version is still safe.', { type: 'error' }); done(); return; }
      mergeQuoteDoc(doc);
      save();
      bindFields(); render();   // reflect the merged result on screen
      done();
    }
  } catch (e) {
    _conflictResolving = false;
    if (btn) { btn.disabled = false; btn.textContent = { reload: 'Reload cloud version', copy: 'Keep my changes as a copy', merge: 'Try merge' }[action]; }
    showToast('Could not ' + action + '. Check your connection.', { type: 'error' });
  }
}

// Best-effort 3-way merge: keep the user's current totals/options, combine the
// item lists (dedup by content), and take the newest non-empty contact info.
function mergeQuoteDoc(doc) {
  const cloudSections = Array.isArray(doc.sections) ? doc.sections : [];
  const localSections = state.sections || [];
  const key = it => String(it.lump ? 'l' : 'm') + '|' + (it.name || '') + '|' +
    (it.lump ? '' : (it.w || '') + 'x' + (it.h || '') + 'x') + (it.rate || '');

  // sections merged by name; items deduped by content, cloud's appended
  const merged = localSections.map(sec => ({ ...sec, items: [...(sec.items || [])] }));
  for (const csec of cloudSections) {
    const local = merged.find(s => (s.name || '').trim().toLowerCase() === (csec.name || '').trim().toLowerCase());
    if (!local) { merged.push({ id: uid(), name: csec.name || 'Section', collapsed: false, items: [...(csec.items || [])] }); continue; }
    const seen = new Set(local.items.map(key));
    for (const it of (csec.items || [])) {
      if (!seen.has(key(it))) { local.items.push({ ...it, id: uid() }); seen.add(key(it)); }
    }
  }
  state.sections = merged;

  // contact: newest non-empty field wins (cloud first, local fallback)
  const cloud = doc.customer || {};
  const local = state.customer || {};
  state.customer = {
    name: cloud.name || local.name || '',
    phone: cloud.phone || local.phone || '',
    address: cloud.address || local.address || '',
    clientId: doc.clientId || local.clientId || undefined,
  };

  // terms: union, local order first, deduped
  const seenTerms = new Set((state.terms || []).map(t => String(t).toLowerCase()));
  for (const t of (Array.isArray(doc.terms) ? doc.terms : [])) {
    if (!seenTerms.has(String(t).toLowerCase())) { state.terms.push(t); seenTerms.add(String(t).toLowerCase()); }
  }
  // spec: union by category, local row wins per category
  const seenSpec = new Map((state.spec || []).map(s => [String(s.c || '').toLowerCase(), s]));
  for (const s of (Array.isArray(doc.spec) ? doc.spec : [])) {
    const k = String(s.c || '').toLowerCase();
    if (!seenSpec.has(k)) { state.spec.push({ ...s }); seenSpec.set(k, s); }
  }

  // the merged quote continues as the cloud record at its latest version
  state.cloudId = doc._id;
  state.version = doc.version || 0;
  state.quoteNo = doc.quoteNo || state.quoteNo;
  state.date = doc.date || state.date;
}

/* ── Login (T3-style form: email OTP + Google OAuth, Clerk core SDK) ── */
function showLoginStep(step) {
  const s1 = document.getElementById('loginStepEmail');
  const s2 = document.getElementById('loginStepCode');
  if (s1) s1.classList.toggle('hidden', step !== 'email');
  if (s2) s2.classList.toggle('hidden', step !== 'code');
  if (step === 'code') setTimeout(() => { const c = document.getElementById('loginCode'); if (c) c.focus(); }, 50);
}
async function loginSendCode() {
  const emailInput = document.getElementById('loginEmail');
  const email = emailInput.value.trim();
  const msg = document.getElementById('loginMsg');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = 'Enter a valid email address'; return; }
  const btn = document.querySelector('[data-action="login-send-code"]');
  btn.disabled = true; btn.textContent = 'Sending…'; msg.textContent = '';
  try {
    await window.Cloud.signInWithEmail(email);
    showLoginStep('code');
    document.getElementById('loginMsg2').textContent = 'Code sent to ' + email + ' — check your inbox';
  } catch (e) {
    msg.textContent = e.message || 'Could not send the code — check your connection';
  }
  btn.disabled = false; btn.textContent = 'Continue →';
}
async function loginResendCode() {
  const emailInput = document.getElementById('loginEmail');
  const email = emailInput.value.trim();
  const btn = document.querySelector('[data-action="login-resend"]');
  const msg = document.getElementById('loginMsg2');
  if (!email || !window.Cloud) return;
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await window.Cloud.signInWithEmail(email);
    msg.textContent = 'A new code was sent to ' + email;
    document.getElementById('loginCode').value = '';
  } catch (e) {
    msg.textContent = e.message || 'Could not resend the code — try again';
  } finally {
    btn.disabled = false; btn.textContent = '↻ Resend code';
  }
}

async function loginVerify() {
  const code = document.getElementById('loginCode').value.trim();
  const msg = document.getElementById('loginMsg2');
  if (!code) { msg.textContent = 'Enter the code from your email'; return; }
  const btn = document.querySelector('[data-action="login-verify"]');
  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    const ok = await window.Cloud.verifyCode(code);
    if (!ok) msg.textContent = 'Wrong or expired code — request a new one';
    // on success the auth listener hides the overlay and starts the sync
  } catch (e) {
    msg.textContent = e.message || 'Verification failed — try again';
  }
  btn.disabled = false; btn.textContent = 'Sign in →';
}

async function deleteSectionById(id) {
  const sec = state.sections.find(s => s.id === id);
  if (!sec || !await askConfirm('Delete "' + sec.name + '" and all of its items?', { title: 'Delete room?', confirmLabel: 'Delete room', danger: true })) return;
  state.sections = state.sections.filter(s => s.id !== id);
  state.finalCharge = 0;
  save(); render();
}

async function startFreshQuote(showBuilder = false) {
  if (!await askConfirm('The current quote is saved to history. Start with a blank quote?', { title: 'Start fresh quote?', confirmLabel: 'Start fresh' })) return;
  state.sections = [];
  state.finalCharge = 0;
  state.customer = { name: '', phone: '', address: '', clientId: null };
  const cat = window.Cloud && window.Cloud.catalog;
  state.terms = cat && cat.terms.length ? [...cat.terms] : [...DEFAULT_TERMS];
  state.spec = cat && cat.materials.length ? cat.materials.map(x => ({ ...x })) : DEFAULT_SPEC.map(x => ({ ...x }));
  state.quoteNo = '';
  claimFreshNumber();
  if (showBuilder) showView('builder');
}

async function loadSampleWithConfirm() {
  if (await askConfirm('This replaces the current quote with the LIVORA sample.', { title: 'Load sample quote?', confirmLabel: 'Load sample' })) loadSample();
}

async function continueLastQuote() {
  try {
    const list = await window.Cloud.loadHistory();
    if (!list.length) { showToast('No previous quotes yet. Build your first one.'); return; }
    if (state.cloudId === list[0].id) { showView('builder'); return; }
    openDashQuote(list[0].id);
  } catch (e) {
    showToast('Could not load quotes.', { type: 'error', actionLabel: 'Try again', onAction: () => continueLastQuote() });
  }
}

document.addEventListener('keydown', e => {
  const modal = [...document.querySelectorAll('.modal:not(.hidden)')].pop();
  if (modal) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModalFromKeyboard(modal);
      return;
    }
    if (e.key === 'Tab') {
      const focusables = [...modal.querySelectorAll(FOCUSABLE)];
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
      return;
    }
  }
  const pm = $('#profileMenu');
  if (pm && !pm.classList.contains('hidden') && e.key === 'Escape') {
    e.preventDefault();
    closeProfileMenu();
    return;
  }
  if (e.key !== 'Enter') return;
  const id = e.target && e.target.id;
  if (id === 'loginEmail') { e.preventDefault(); loginSendCode(); }
  else if (id === 'loginCode') { e.preventDefault(); loginVerify(); }
});

/* ── Events ── */
document.addEventListener('click', e => {
  if (!e.target.closest('.row-menu')) {
    document.querySelectorAll('.row-menu-popover').forEach(menu => menu.classList.add('hidden'));
  }
  if (!e.target.closest('.side-profile') && !e.target.closest('#profileMenu')) {
    const pm = $('#profileMenu');
    if (pm && !pm.classList.contains('hidden')) closeProfileMenu();
  }
  const libBtn = e.target.closest('[data-lib]');
  if (libBtn) { addItemFromLib(libBtn.dataset.lib); return; }

  // sidebar navigation (data-view, no data-action)
  const sideItem = e.target.closest('.side-item');
  if (sideItem) { navTo(sideItem.dataset.view); return; }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  if (btn.disabled) return;

  // Tapping anywhere outside the client picker list closes it.
  if (!e.target.closest('#clientPickList') && btn.dataset.action !== 'toggle-client-pick') {
    const cpl = $('#clientPickList');
    if (cpl && !cpl.classList.contains('hidden')) cpl.classList.add('hidden');
  }

  switch (btn.dataset.action) {
    case 'add-section':
      addSection();
      break;
    case 'del-section': {
      const sec = state.sections.find(s => s.id === btn.closest('.section-card').dataset.sec);
      if (sec) deleteSectionById(sec.id);
      break;
    }
    case 'toggle-sec': {
      // don't collapse when the user is interacting with fields/buttons inside the header
      if (e.target.closest('input, button, select, textarea')) break;
      const card = btn.closest('.section-card');
      const sec = state.sections.find(s => s.id === card.dataset.sec);
      if (sec) { sec.collapsed = !sec.collapsed; save(); render(); }
      break;
    }
    case 'add-item': {
      libTarget = btn.closest('.section-card').dataset.sec;
      renderLibrary();
      $('#libraryModal').classList.remove('hidden');
      $('#libSearch').value = '';
      const sec = state.sections.find(s => s.id === libTarget);
      $('#libTarget').textContent = 'Adding to "' + (sec ? sec.name : '') + '"';
      setTimeout(() => $('#libSearch').focus(), 50);
      break;
    }
    case 'del-item': {
      const row = btn.closest('.item-row');
      const sec = state.sections.find(s => s.id === row.dataset.sec);
      if (sec) { sec.items = sec.items.filter(i => i.id !== row.dataset.item); state.finalCharge = 0; save(); render(); }
      break;
    }
    case 'close-library': $('#libraryModal').classList.add('hidden'); break;
    case 'close-custom': closeCustom(); break;
    case 'custom-item': $('#customModal').classList.remove('hidden'); break;
    case 'add-custom': addCustomItem(); break;
    case 'preview': _previewReturn = 'builder'; _previewClientId = null; showQuote(); break;
    case 'back-to-builder': closeQuotePreview(); break;
    case 'quote-options':
      $('#optDims').checked = state.showDims !== false;
      $('#optSpec').checked = state.showSpec !== false;
      $('#optionsModal').classList.remove('hidden');
      break;
    case 'close-options': $('#optionsModal').classList.add('hidden'); break;
    case 'download-pdf': downloadPdf(); break;
    case 'sample':
      loadSampleWithConfirm();
      break;
    case 'reset':
      startFreshQuote();
      break;
    case 'open-sidebar': document.body.classList.add('side-open'); break;
    case 'close-sidebar': document.body.classList.remove('side-open'); break;
    case 'new-quote': {
      startFreshQuote(true);
      break;
    }
    case 'continue-last': {
      continueLastQuote();
      break;
    }
    case 'dash-open': openDashQuote(btn.dataset.id, btn); break;
    case 'preview-quote': previewDashQuote(btn.dataset.id, btn); break;
    case 'edit-quote': openDashQuote(btn.dataset.id, btn); break;
    case 'quote-menu': toggleQuoteMenu(btn.dataset.id); break;
    case 'duplicate-quote': duplicateDashQuote(btn.dataset.id, btn); break;
    case 'dash-del': delDashQuote(btn.dataset.id, btn); break;
    case 'dash-more': loadMoreDash(); break;
    case 'retry-dashboard': renderDashboard(); break;
    case 'deleted-quotes': openDeletedQuotes(); break;
    case 'close-deleted-quotes': $('#deletedQuotesModal').classList.add('hidden'); break;
    case 'restore-quote': restoreDeletedQuote(btn.dataset.id, btn); break;
    case 'quote-history': openQuoteVersions(btn.dataset.id); break;
    case 'close-quote-versions': $('#quoteVersionsModal').classList.add('hidden'); break;
    case 'restore-quote-version': restoreQuoteVersion(btn.dataset.id, btn.dataset.version, btn); break;
    case 'add-client': openClientModal(null); break;
    case 'create-client-quote': createQuoteForClient(btn.dataset.id); break;
    case 'edit-client': editClientById(btn.dataset.id); break;
    case 'archive-client': archiveClientById(btn.dataset.id, btn); break;
    case 'unarchive-client': unarchiveClientById(btn.dataset.id, btn); break;
    case 'toggle-archived': _showArchived = !_showArchived; renderClients(); break;
    case 'clients-more': loadMoreClients(); break;
    case 'retry-clients': renderClients(); break;
    case 'save-client': saveClientForm(); break;
    case 'close-client-modal': closeClientModal(); break;
    case 'toggle-client-quotes': toggleClientQuotes(btn.dataset.id); break;
    case 'client-quotes-more': loadClientQuotePage(btn.dataset.id); break;
    case 'retry-client-quotes': loadClientQuotePage(btn.dataset.id, true); break;
    case 'toggle-client-pick': toggleClientPick(); break;
    case 'pick-client': pickClient(btn.dataset.id); break;
    case 'pick-add-client': pickAddClient(); break;
    case 'pick-edit-client': pickEditClient(btn.dataset.id); break;
    case 'cat-add':
      if (catTab === 'terms') {
        _termsEditing = true;
        catList().terms.push('');
        renderCatTab();
        const inputs = $('#catList').querySelectorAll('.cat-term-input');
        const last = inputs[inputs.length - 1];
        if (last) { last.focus(); autoGrow(last); }
        pushCatalog();
      } else {
        openCatEdit(null);
      }
      break;
    case 'terms-edit-toggle':
      _termsEditing = !_termsEditing;
      renderCatTab();
      updateTermsHeader();
      if (!_termsEditing) { clearTimeout(_termSaveTimer); pushCatalog(); }
      break;
    case 'cat-edit': openCatEdit(parseInt(btn.dataset.idx, 10)); break;
    case 'cat-del': delCatEntry(parseInt(btn.dataset.idx, 10)); break;
    case 'cat-save': saveCatEdit(); break;
    case 'cat-page-prev': if (_catItemsPage > 0) { _catItemsPage--; renderCatTab(); } break;
    case 'cat-page-next': _catItemsPage++; renderCatTab(); break;
    case 'close-cat-edit': $('#catEditModal').classList.add('hidden'); break;
    case 'sign-out': if (window.Clerk) window.Clerk.signOut(); break;
    case 'toggle-profile-menu': toggleProfileMenu(); break;
    case 'menu-archive': closeProfileMenu(); openDeletedQuotes(); break;
    case 'menu-personalization': closeProfileMenu(); comingSoon('Personalization'); break;
    case 'menu-profile': closeProfileMenu(); comingSoon('Profile'); break;
    case 'menu-settings': closeProfileMenu(); comingSoon('Settings'); break;
    case 'menu-help': closeProfileMenu(); comingSoon('Help & support'); break;
    case 'menu-logout': closeProfileMenu(); if (window.Clerk) window.Clerk.signOut(); break;
    case 'conflict-reload': resolveConflict('reload'); break;
    case 'conflict-copy': resolveConflict('copy'); break;
    case 'conflict-merge': resolveConflict('merge'); break;
    case 'conflict-dismiss': dismissConflict(); break;
    case 'reopen-conflict': reopenConflict(); break;
    case 'close-conflict-modal': {
      if (_conflictResolving) break;
      dismissConflict();
      break;
    }
    case 'app-dialog-confirm': closeAppDialog(true); break;
    case 'app-dialog-cancel': closeAppDialog(false); break;
    case 'login-google': {
      const gbtn = document.querySelector('[data-action="login-google"]');
      const origHTML = gbtn ? gbtn.innerHTML : '';
      if (gbtn) { gbtn.disabled = true; gbtn.textContent = 'Redirecting…'; }
      window.Cloud.signInWithGoogle().catch(err => {
        const msg = document.getElementById('loginMsg');
        if (msg) msg.textContent = (err && err.message) || 'Google sign-in failed — try email instead';
        if (gbtn) { gbtn.disabled = false; gbtn.innerHTML = origHTML; }
      });
      break;
    }
    case 'login-send-code': loginSendCode(); break;
    case 'login-resend': loginResendCode(); break;
    case 'login-verify': loginVerify(); break;
    case 'login-back': showLoginStep('email'); break;
    case 'login-signup': {
      const em = document.getElementById('loginEmail');
      if (em) em.focus();
      const msg = document.getElementById('loginMsg');
      if (msg) msg.textContent = 'Enter your email — we’ll create your account and send a code.';
      break;
    }
  }

});

function closeCustom() {
  $('#customModal').classList.add('hidden');
  ['#cName', '#cW', '#cH', '#cRate'].forEach(s => $(s).value = '');
  $('#cLump').checked = false;
}

/* input delegation (live edits) */
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'loginCode') {
    t.value = t.value.replace(/\D/g, '').slice(0, 6);
    if (t.value.length === 6) setTimeout(() => loginVerify(), 0);
    return;
  }
  if (t.classList.contains('cat-term-input')) {
    const idx = parseInt(t.dataset.idx, 10);
    const terms = catList().terms;
    if (idx >= 0 && idx < terms.length) {
      terms[idx] = t.value;
      autoGrow(t);
      scheduleTermSave();
    }
    return;
  }

  if (t.classList.contains('sec-name')) {
    const sec = state.sections.find(s => s.id === t.dataset.sec);
    if (sec) {
      sec.name = t.value;
      const sub = t.closest('.sec-title-row').querySelector('.sec-sub');
      if (sub) sub.textContent = sec.items.length + ' item' + (sec.items.length === 1 ? '' : 's') + ' · ' + fmt(sectionTotal(sec));
    }
  }
  else if (t.classList.contains('item-desc')) {
    const sec = state.sections.find(s => s.id === t.closest('.item-row').dataset.sec);
    const it = sec && sec.items.find(i => i.id === t.closest('.item-row').dataset.item);
    if (it) it.name = t.value;
  }
  else if (t.classList.contains('dim')) {
    if (!validateBoundedInput(t, t.dataset.k)) return;
    const row = t.closest('.item-row');
    const sec = state.sections.find(s => s.id === row.dataset.sec);
    const it = sec && sec.items.find(i => i.id === row.dataset.item);
    if (it) {
      const k = t.dataset.k;
      if (k === 'w' || k === 'h') it[k] = t.value === '' ? null : num(t.value);
      else it.rate = num(t.value);
      row.querySelector('.item-amount').textContent = fmt(itemAmount(it));
      const sub = row.closest('.section-card').querySelector('.sec-sub');
      if (sub) sub.textContent = sec.items.length + ' item' + (sec.items.length === 1 ? '' : 's') + ' · ' + fmt(sectionTotal(sec));
    }
  }
  else if (t.dataset.field) {
    const fieldKey = t.dataset.field === 'validityDays' ? 'validityDays' : null;
    if (fieldKey && !validateBoundedInput(t, fieldKey)) return;
    const parts = t.dataset.field.split('.');
    if (parts.length === 1) state[parts[0]] = t.value;
    else state[parts[0]][parts[1]] = t.value;
    if (parts[0] === 'quoteNo' && !t.value) { state.quoteNo = autoQuoteNo(); t.value = state.quoteNo; }
    if (parts[0] === 'customer') { state.customer.clientId = undefined; syncClientPickLabel(); }
  }
  else if (t.id === 'libSearch') renderLibrary(t.value);
  else if (t.id === 'catItemsSearch') { _catItemsSearch = t.value; _catItemsPage = 0; renderCatTab(); }
  else if (t.id === 'clientSearch') applyClientSearch(t.value);
  else if (t.id === 'clientPickSearch') {
    clearTimeout(_clientPickSearchTimer);
    _clientPickSearchTimer = setTimeout(() => searchClientPicker(t.value), 250);
  }
  else if (t.id === 'dashSearch') {
    clearTimeout(_dashSearchTimer);
    _dashSearchTimer = setTimeout(() => renderDashboard(), 300);
  }
  else if (t.id === 'dashStatus') renderDashboard();
  else if (t.id === 'finalCharge') {
    if (!validateBoundedInput(t, 'finalCharge')) return;
    state.finalCharge = num(t.value);
  }
  else if (t.id === 'gst') {
    if (!validateBoundedInput(t, 'gst')) return;
    state.gst = num(t.value);
  }
  else if (t.id === 'optDims') { state.showDims = t.checked; }
  else if (t.id === 'optSpec') { state.showSpec = t.checked; }

  const uiOnlyInput = t.id === 'libSearch' || t.id === 'catItemsSearch' || t.id === 'clientSearch' || t.id === 'clientPickSearch' || t.id === 'dashSearch' || t.id === 'dashStatus';
  if (!uiOnlyInput) {
    save(); renderSummary();
    if (t.id === 'optDims' || t.id === 'optSpec') {
      const quote = $('#quote');
      if (quote && !quote.classList.contains('hidden')) { renderQuote(); renderPdfPreview(); }
    }
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'dashStatus') renderDashboard();
  else if (t.classList.contains('status-select')) changeQuoteStatus(t.dataset.id, t.value, t);
  else if (t.id === 'catItemsCat') { _catItemsCat = t.value; _catItemsPage = 0; renderCatTab(); }
});

function autoQuoteNo() {
  return 'LQ-' + state.date.replace(/-/g, '').slice(2) + '-' + Math.floor(100 + Math.random() * 900);
}

/* ── Init ── */
function bindFields() {
  Object.keys(state.customer).forEach(k => {
    const el = document.querySelector(`[data-field="customer.${k}"]`);
    if (el) el.value = state.customer[k] || '';
  });
  $('#quoteNo').value = state.quoteNo;
  $('#date').value = state.date;
  $('#validity').value = state.validityDays || 15;
  $('#timeline').value = state.timeline || '';
  if (typeof syncClientPickLabel === 'function') syncClientPickLabel();
}

function init() {
  initModalAccessibility();
  const restored = load();
  if (!restored || !state.sections.length) {
    // start with room scaffolding only if fresh
    if (!restored) { state.sections = DEFAULT_SECTIONS.map(n => ({ id: uid(), name: n.name, items: [], collapsed: false })); }
  }
  if (!state.quoteNo) state.quoteNo = autoQuoteNo();

  bindFields();
  render();

  window.addEventListener('beforeprint', () => { renderQuote(); });
  window.addEventListener('afterprint', () => { /* nothing */ });

  // Default shell view: dashboard (login overlay covers until cloudready).
  // If the cloud never becomes ready (offline local mode), the builder still
  // works — user taps "Quote builder" in the sidebar.
  showView('dashboard');

  // ?print=1 / ?preview=1 → jump straight to the final template (bookmarkable / PDF-ready)
  const qp = new URLSearchParams(location.search);
  if (qp.get('print') || qp.get('preview')) {
    $('#loginOverlay').classList.add('hidden');
    const hasItems = state.sections.some(s => s.items.length);
    if (!hasItems) loadSample();
    showQuote();
  }
}

init();
