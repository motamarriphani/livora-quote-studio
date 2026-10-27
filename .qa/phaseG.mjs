/* Phase G: duplicate flow, status round-trip, client panel truth, console sweep, final audit */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run({ ev, shot, logs }) {
  console.log('=== G1: duplicate flow (on user draft LQ-2026-008) ===');
  await ev(`[...document.querySelectorAll('.dash-row')].find(r => r.querySelector('.c-qno')?.textContent === 'LQ-2026-008')?.querySelector('[data-action="quote-menu"]').click(); 'ok'`);
  await sleep(400);
  await ev(`document.querySelector('.row-menu-popover:not(.hidden) [data-action="duplicate-quote"]')?.click(); 'ok'`);
  await sleep(500);
  console.log('dup confirm:', await ev(`document.getElementById('appDialogMessage')?.textContent`));
  await ev(`document.querySelector('[data-action="app-dialog-confirm"]').click(); 'ok'`);
  await sleep(3500);
  const dup = await ev(`(() => ({
    view: [...document.querySelectorAll('.view:not(.hidden)')].map(v=>v.id).join(','),
    quoteNo: document.getElementById('quoteNo')?.value,
    client: document.getElementById('customerName')?.value,
    items: document.getElementById('sumCount')?.textContent,
    grand: document.getElementById('sumGrand')?.textContent,
    toast: document.getElementById('toastRegion')?.textContent || null,
  }))()`);
  console.log(JSON.stringify(dup, null, 1));
  const dupNo = dup.quoteNo;
  // delete the duplicate immediately (cleanup)
  await ev(`document.querySelector('[data-view="dashboard"]').click(); 'ok'`);
  await sleep(2500);
  await ev(`[...document.querySelectorAll('.dash-row')].find(r => r.querySelector('.c-qno')?.textContent === '${dupNo}')?.querySelector('[data-action="quote-menu"]').click(); 'ok'`);
  await sleep(300);
  await ev(`document.querySelector('.row-menu-popover:not(.hidden) [data-action="dash-del"]')?.click(); 'ok'`);
  await sleep(400);
  await ev(`document.querySelector('[data-action="app-dialog-confirm"]').click(); 'ok'`);
  await sleep(3000);
  console.log('duplicate deleted, still listed:', await ev(`[...document.querySelectorAll('.dash-row')].some(r => r.querySelector('.c-qno')?.textContent === '${dupNo}')`));

  console.log('=== G2: status change round-trip on LQ-2026-008 (draft -> sent -> draft) ===');
  await ev(`(() => {
    const row = [...document.querySelectorAll('.dash-row')].find(r => r.querySelector('.c-qno')?.textContent === 'LQ-2026-008');
    const sel = row.querySelector('.status-select');
    sel.value = 'sent';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(3500);
  const midStatus = await ev(`[...document.querySelectorAll('.dash-row')].find(r => r.querySelector('.c-qno')?.textContent === 'LQ-2026-008')?.querySelector('.status-select')?.value`);
  console.log('mid status:', midStatus);
  await ev(`(() => {
    const row = [...document.querySelectorAll('.dash-row')].find(r => r.querySelector('.c-qno')?.textContent === 'LQ-2026-008');
    const sel = row.querySelector('.status-select');
    sel.value = 'draft';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(3500);
  console.log('restored status:', await ev(`[...document.querySelectorAll('.dash-row')].find(r => r.querySelector('.c-qno')?.textContent === 'LQ-2026-008')?.querySelector('.status-select')?.value`));
  console.log('toast:', await ev(`document.getElementById('toastRegion')?.textContent`));

  console.log('=== G3: client panel server truth (Phani, count=2 but panel empty) ===');
  await ev(`document.querySelector('[data-view="clients"]').click(); 'ok'`);
  await sleep(3000);
  const phani = await ev(`(() => {
    const r = [...document.querySelectorAll('.client-row')].find(x => x.querySelector('.client-name')?.textContent === 'Phani');
    return r ? { id: r.dataset.id, count: r.querySelector('.client-qn')?.textContent } : null;
  })()`);
  console.log('phani row:', JSON.stringify(phani));
  await ev(`(() => {
    const r = [...document.querySelectorAll('.client-row')].find(x => x.querySelector('.client-name')?.textContent === 'Phani');
    r.click();
  })()`);
  await sleep(3000);
  const panel = await ev(`(() => {
    const p = document.querySelector('.client-quotes-panel:not(.hidden)');
    return p ? {
      rows: [...p.querySelectorAll('.dash-row')].map(r => r.querySelector('.c-qno')?.textContent),
      empty: p.querySelector('.dash-empty')?.textContent || null,
    } : 'no panel open';
  })()`);
  console.log('panel content:', JSON.stringify(panel));
  // direct server query bypassing UI
  const direct = await ev(`(async () => {
    try {
      const res = await window.Cloud.loadQuotes({ clientId: '${phanI_id(phani)}' });
      return { n: res.quotes.length, rows: res.quotes.map(q => q.quoteNo + '/' + (q.customerName || '—')) , err: res.error ? String(res.error) : null };
    } catch (e) { return { err: e.message }; }
  })()`);
  console.log('direct loadQuotes(clientId):', JSON.stringify(direct));
  await shot('G3-phani-panel');

  console.log('=== G4: console errors accumulated this phase ===');
  const errs = logs.filter(l => /error|EXCEPTION/i.test(l) && !/favicon/.test(l));
  console.log(errs.length ? errs.join('\n') : '(none)');

  console.log('=== G5: FINAL STATE AUDIT ===');
  await ev(`document.querySelector('[data-view="dashboard"]').click(); 'ok'`);
  await sleep(2500);
  console.log(JSON.stringify(await ev(`(() => ({
    workingQuoteNo: document.getElementById('quoteNo')?.value,
    dashRows: [...document.querySelectorAll('.dash-row')].map(r => r.querySelector('.c-qno')?.textContent + '/' + r.querySelector('.c-status')?.textContent.trim()),
    stats: [document.getElementById('statMonth')?.textContent, document.getElementById('statValue')?.textContent, document.getElementById('statOpen')?.textContent],
    qaOnDash: [...document.querySelectorAll('.dash-row')].some(r => r.textContent.includes('QA TEST')),
  }))()`), null, 1));
}
function phanI_id(p) { return p ? p.id : ''; }
