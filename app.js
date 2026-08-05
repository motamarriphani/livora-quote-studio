/* ═══════════════ LIVORA Quote Studio — app logic ═══════════════ */
'use strict';

const LS_KEY = 'livora-quote-v1';

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
  { id: 'gypsum',      name: 'Gypsum Ceiling',          rate: 83500, lump: true, cat: 'Fals' },
  { id: 'paint',       name: 'Painting Work',           rate: 115000, lump: true, cat: 'Fals' },
  { id: 'electrical',  name: 'Electrical Wiring & Material', rate: 100000, lump: true, cat: 'Fals' },
];

const DEFAULT_SECTIONS = [
  { name: 'Master Bedroom' }, { name: 'GBR Bedroom' }, { name: 'CBR Bedroom' },
  { name: 'Hall' }, { name: 'Crockery Unit' }, { name: 'Pooja Mandir' },
  { name: 'Kitchen' }, { name: 'False Ceiling' }, { name: 'Painting' }, { name: 'Electrical' },
];

const DEFAULT_TERMS = [
  'Décor items not included',
  'Full payment to be released at the time of handover',
  '40% payment as the project starts',
  '30% at mid way of the project',
  '20% at the time of handle installation',
  '10% at the time of final handover after snag list clearance',
  'Any extra work other than the mentioned in the quote will be charged accordingly and should be paid in full',
  'Validity of this quotation: 15 days from the date of issue',
];

const DEFAULT_SPEC = [
  'Plywood / Core Material: CENTURY CLUB PRIME 710 Grade BWP Plywood 16MM AND 6MM',
  'Laminate: 1MM HGL / MATT / Fluted Laminate. Each Laminate cost not more than Rs. 2000',
].join('\n');

/* ── State ── */
let state = {
  company: { name: 'LIVORA INTERIORS', address: 'Miyapur, Hyderabad, Telangana 502034', phone: '8886767991' },
  customer: { name: '', phone: '', address: '' },
  quoteNo: '', date: todayStr(),
  sections: [],
  discount: 0,
  terms: [...DEFAULT_TERMS],
  spec: DEFAULT_SPEC,
};

let libTarget = null; // section id receiving library adds

/* ── Helpers ── */
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9);
const num = v => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; };
const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
function todayStr() { const d = new Date(); return d.toISOString().slice(0, 10); }
function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}
function itemAmount(it) { return it.lump ? num(it.rate) : num(it.w) * num(it.h) * num(it.rate); }
function sectionTotal(sec) { return sec.items.reduce((s, it) => s + itemAmount(it), 0); }
function quoteTotal() { return state.sections.reduce((s, sec) => s + sectionTotal(sec), 0); }
function grandTotal() { return Math.max(0, quoteTotal() - num(state.discount)); }
function itemCount() { return state.sections.reduce((s, sec) => s + sec.items.length, 0); }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ── Persistence ── */
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (s && Array.isArray(s.sections)) { state = Object.assign(state, s); return true; }
  } catch (e) {}
  return false;
}

/* ── Render: sections ── */
function render() {
  const wrap = $('#sections');
  wrap.innerHTML = state.sections.map(sec => {
    const tot = sectionTotal(sec);
    const rows = sec.items.map((it, i) => `
      <div class="item-row${it.lump ? ' lump' : ''}" data-sec="${sec.id}" data-item="${it.id}">
        <div class="item-top">
          <input class="item-desc" value="${esc(it.name)}" data-k="name" placeholder="Item name">
          <button class="item-del" data-action="del-item" title="Remove">✕</button>
        </div>
        <div class="item-dims">
          ${it.lump ? '' : `
          <div class="dim-field"><label>W</label><input class="dim" type="number" step="0.1" min="0" value="${it.w || ''}" data-k="w" placeholder="0"></div>
          <div class="dim-field"><label>H</label><input class="dim" type="number" step="0.1" min="0" value="${it.h || ''}" data-k="h" placeholder="0"></div>`}
          <div class="dim-field"><label>Rate</label><input class="dim" type="number" step="1" min="0" value="${it.rate || ''}" data-k="rate" placeholder="0"></div>
          <div class="item-amount"><span class="amount-box">${fmt(itemAmount(it))}</span></div>
        </div>
      </div>`).join('');
    return `
      <div class="card section-card ${sec.collapsed ? 'collapsed' : ''}" data-sec="${sec.id}">
        <div class="sec-head" data-action="toggle-sec">
          <div class="sec-title-row">
            <span class="chev">▼</span>
            <div>
              <input class="sec-name" value="${esc(sec.name)}" data-k="name" data-sec="${sec.id}" placeholder="Room name">
              <div class="sec-sub">${sec.items.length} item${sec.items.length === 1 ? '' : 's'} · ${fmt(tot)}</div>
            </div>
          </div>
          <button class="icon-btn" data-action="del-sec" title="Delete section">🗑</button>
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
  const t = quoteTotal(), g = grandTotal();
  $('#sumTotal').innerHTML = fmt(g) + (num(state.discount) > 0 ? ` <small>from ${fmt(t)}</small>` : '');
}

/* ── Render: library modal ── */
function renderLibrary(q = '') {
  const grid = $('#libGrid');
  const list = LIBRARY.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));
  grid.innerHTML = list.map(i => `
    <button class="lib-item" data-lib="${i.id}">
      <div class="lib-name">${esc(i.name)}</div>
      <div class="lib-cat">${esc(i.cat)}</div>
      <div class="lib-rate">${i.lump ? fmt(i.rate) : fmt(i.rate) + ' <small>/sqft</small>'}</div>
    </button>`).join('') || '<div style="color:var(--faint);padding:16px;text-align:center;grid-column:1/-1">No matching items</div>';
}

/* ── Mutations ── */
function addSection(name = '') {
  const sec = { id: uid(), name: name || 'New Section', items: [], collapsed: false };
  state.sections.push(sec);
  render();
  return sec;
}
function addItemFromLib(libId) {
  const lib = LIBRARY.find(i => i.id === libId);
  if (!lib || !libTarget) return;
  const sec = state.sections.find(s => s.id === libTarget);
  if (!sec) return;
  sec.items.push({ id: uid(), name: lib.name, w: lib.w ?? null, h: lib.h ?? null, rate: lib.rate, lump: !!lib.lump });
  save(); render();
}
function addCustomItem() {
  const name = $('#cName').value.trim() || 'Custom Item';
  const lump = $('#cLump').checked;
  const item = { id: uid(), name, lump, rate: num($('#cRate').value) };
  if (!lump) { item.w = num($('#cW').value) || null; item.h = num($('#cH').value) || null; }
  const sec = state.sections.find(s => s.id === libTarget);
  if (sec) sec.items.push(item);
  closeCustom();
  save(); render();
}

/* ── Quote template (final document) ── */
function renderQuote() {
  const c = state.company, cu = state.customer;
  let rows = '', sno = 0, totals = 0;
  state.sections.forEach(sec => {
    if (!sec.items.length) return;
    rows += `<tr class="room-row"><td colspan="5">${esc(sec.name)}</td></tr>`;
    sec.items.forEach(it => {
      sno++;
      const box = it.lump ? '—' : (num(it.w) * num(it.h)).toLocaleString('en-IN', { maximumFractionDigits: 1 });
      rows += `<tr${it.lump ? ' class="lump-row"' : ''}>
        <td>${sno}</td>
        <td class="desc">${esc(it.name)}</td>
        <td class="num">${it.lump ? '—' : esc(it.w)}</td>
        <td class="num">${it.lump ? '—' : esc(it.h)}</td>
        <td class="num">${box}</td>
        <td class="num">${fmt(it.rate)}</td>
        <td class="num">${fmt(itemAmount(it))}</td>
      </tr>`;
      totals += itemAmount(it);
    });
  });
  const disc = num(state.discount);
  const grand = grandTotal();

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
    </div>
    <div class="qs-cust"><span class="lbl">CUSTOMER NAME &amp; ADDRESS :</span> ${esc([cu.name, cu.address].filter(Boolean).join(', '))}${cu.phone ? ' — Ph: ' + esc(cu.phone) : ''}</div>
    <table class="qs-table">
      <thead><tr><th style="width:36px">S.No</th><th>Description</th><th style="width:44px">W</th><th style="width:44px">H</th><th style="width:56px">BOX</th><th style="width:74px">Rate</th><th style="width:86px">Amount</th></tr></thead>
      <tbody>${rows}
        <tr class="qs-total-row"><td colspan="6" style="text-align:right">TOTAL :</td><td class="num">${fmt(totals)}</td></tr>
        <tr class="qs-total-row"><td colspan="6" style="text-align:right">DISCOUNT :</td><td class="num">${fmt(disc)}</td></tr>
        <tr class="qs-grand"><td colspan="6" style="text-align:right">GRAND TOTAL :</td><td class="num">${fmt(grand)}</td></tr>
      </tbody>
    </table>
    <div class="qs-note">
      <h4>Note — Terms &amp; Conditions</h4>
      <ol class="qs-terms">${state.terms.map((t, i) => `<li><span class="n">${i + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol>
    </div>
    <div class="qs-spec"><h4>Material Specification</h4>${esc(state.spec)}</div>
    <div class="qs-sigs">
      <div class="qs-sig">CUSTOMER NAME<small>Signature</small></div>
      <div class="qs-sig">For ${esc(c.name)}<small>Authorized Signatory</small></div>
    </div>
    <div class="qs-foot">${esc(c.name)} · ${esc(c.address)} · ${esc(c.phone)}</div>`;
}

/* ── View switching ── */
function showQuote() {
  renderQuote();
  $('#builder').classList.add('hidden');
  $('#quote').classList.remove('hidden');
  window.scrollTo(0, 0);
}
function showBuilder() {
  $('#quote').classList.add('hidden');
  $('#builder').classList.remove('hidden');
  window.scrollTo(0, 0);
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
      state = Object.assign(state, s);
      save(); render();
    } catch (e) { alert('Invalid quote file'); }
  };
  r.readAsText(file);
}

/* ── Sample (the original LIVORA quote, to demo) ── */
function loadSample() {
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
  state.discount = 36988;
  state.customer = { name: '', phone: '', address: '' };
  save(); render();
}

/* ── Events ── */
document.addEventListener('click', e => {
  const libBtn = e.target.closest('[data-lib]');
  if (libBtn) { addItemFromLib(libBtn.dataset.lib); return; }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  switch (btn.dataset.action) {
    case 'add-section':
      addSection();
      break;
    case 'del-section': {
      const sec = state.sections.find(s => s.id === btn.closest('.section-card').dataset.sec);
      if (sec && confirm('Delete "' + sec.name + '" and its items?')) {
        state.sections = state.sections.filter(s => s.id !== sec.id);
        save(); render();
      }
      break;
    }
    case 'toggle-sec': {
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
      if (sec) { sec.items = sec.items.filter(i => i.id !== row.dataset.item); save(); render(); }
      break;
    }
    case 'close-library': $('#libraryModal').classList.add('hidden'); break;
    case 'custom-item': $('#customModal').classList.remove('hidden'); break;
    case 'close-custom': closeCustom(); break;
    case 'add-custom': addCustomItem(); break;
    case 'preview': showQuote(); break;
    case 'back-to-builder': showBuilder(); break;
    case 'print': window.print(); break;
    case 'export': exportJSON(); break;
    case 'import': $('#importFile').click(); break;
    case 'sample':
      if (confirm('Load the sample quote from the LIVORA PDF? (replaces current data)')) loadSample();
      break;
    case 'reset':
      if (confirm('Start a fresh quote? Current data will be cleared.')) {
        state.sections = []; state.discount = 0; state.customer = { name: '', phone: '', address: '' };
        save(); render();
      }
      break;
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

  if (t.classList.contains('sec-name')) {
    const sec = state.sections.find(s => s.id === t.dataset.sec);
    if (sec) { sec.name = t.value; }
    const sub = t.closest('.sec-title-row').querySelector('.sec-sub');
    if (sub) sub.textContent = sec.items.length + ' item' + (sec.items.length === 1 ? '' : 's') + ' · ' + fmt(sectionTotal(sec));
  }
  else if (t.classList.contains('item-desc')) {
    const sec = state.sections.find(s => s.id === t.closest('.item-row').dataset.sec);
    const it = sec && sec.items.find(i => i.id === t.closest('.item-row').dataset.item);
    if (it) it.name = t.value;
  }
  else if (t.classList.contains('dim')) {
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
    const parts = t.dataset.field.split('.');
    if (parts.length === 1) state[parts[0]] = t.value;
    else state[parts[0]][parts[1]] = t.value;
    if (parts[0] === 'quoteNo' && !t.value) t.value = autoQuoteNo();
  }
  else if (t.id === 'libSearch') renderLibrary(t.value);

  save(); renderSummary();
});

function autoQuoteNo() {
  return 'LQ-' + state.date.replace(/-/g, '').slice(2) + '-' + Math.floor(100 + Math.random() * 900);
}

/* ── Init ── */
function init() {
  const restored = load();
  if (!restored || !state.sections.length) {
    // start with room scaffolding only if fresh
    if (!restored) { state.sections = DEFAULT_SECTIONS.map(n => ({ id: uid(), name: n.name, items: [], collapsed: false })); }
  }
  if (!state.quoteNo) state.quoteNo = autoQuoteNo();

  // bind field values
  Object.keys(state.customer).forEach(k => {
    const el = document.querySelector(`[data-field="customer.${k}"]`);
    if (el) el.value = state.customer[k] || '';
  });
  $('#quoteNo').value = state.quoteNo;
  $('#date').value = state.date;

  render();

  $('#importFile').addEventListener('change', e => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  });

  window.addEventListener('beforeprint', () => { renderQuote(); });
  window.addEventListener('afterprint', () => { /* nothing */ });

  // ?print=1 → jump straight to the final template (bookmarkable / PDF-ready)
  if (new URLSearchParams(location.search).get('print')) {
    const hasItems = state.sections.some(s => s.items.length);
    if (!hasItems) loadSample();
    showQuote();
  }
}

init();
