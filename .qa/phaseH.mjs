/* Phase H: confirm dup-row bug, other client panels, restore user's working draft */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run({ ev, shot }) {
  console.log('=== H1: does the duplicate-row state persist? ===');
  await ev(`document.querySelector('[data-view="clients"]').click(); 'ok'`);
  await sleep(1500);
  await ev(`document.querySelector('[data-view="dashboard"]').click(); 'ok'`);
  await sleep(3000);
  let rows = await ev(`[...document.querySelectorAll('.dash-row .c-qno')].map(n=>n.textContent)`);
  console.log('after nav away+back:', JSON.stringify(rows));

  console.log('=== H2: full reload — fresh dashboard ===');
  await ev(`location.reload(); 'reloading'`);
  await sleep(8000);
  // wait for cloud ready
  for (let i = 0; i < 20; i++) { await sleep(1000); if (await ev(`!!window.Cloud?.ready`)) break; }
  await sleep(2000);
  rows = await ev(`[...document.querySelectorAll('.dash-row .c-qno')].map(n=>n.textContent)`);
  const uniq = new Set(rows);
  console.log('after reload:', JSON.stringify(rows));
  console.log('unique:', uniq.size, '| total:', rows.length, '| DUPLICATES PRESENT:', rows.length !== uniq.size);

  console.log('=== H3: ram + lakshman client panels (legacy matching) ===');
  await ev(`document.querySelector('[data-view="clients"]').click(); 'ok'`);
  await sleep(3000);
  for (const nm of ['ram', 'lakshman', 'sundar', 'ravi']) {
    await ev(`(() => { const r = [...document.querySelectorAll('.client-row')].find(x => x.querySelector('.client-name')?.textContent === '${nm}'); if (r) r.click(); })()`);
    await sleep(2200);
    const res = await ev(`(() => {
      const p = [...document.querySelectorAll('.client-quotes-panel:not(.hidden)')].pop();
      return p ? { rows: [...p.querySelectorAll('.dash-row .c-qno')].map(x=>x.textContent), emptyText: p.querySelector('.dash-empty')?.textContent?.slice(0,50) || null } : null;
    })()`);
    console.log(nm, '→', JSON.stringify(res));
  }
  await shot('H3-client-panels');

  console.log('=== H4: restore user working draft = open LQ-2026-008 ===');
  await ev(`document.querySelector('[data-view="dashboard"]').click(); 'ok'`);
  await sleep(2500);
  await ev(`[...document.querySelectorAll('.dash-row')].find(r => r.querySelector('.c-qno')?.textContent === 'LQ-2026-008')?.querySelector('[data-action="edit-quote"]').click(); 'ok'`);
  await sleep(600);
  const msg = await ev(`document.getElementById('appDialogMessage')?.textContent`);
  console.log('open confirm:', msg);
  await ev(`document.querySelector('[data-action="app-dialog-confirm"]').click(); 'ok'`);
  await sleep(4000);
  console.log(JSON.stringify(await ev(`(() => ({
    view: [...document.querySelectorAll('.view:not(.hidden)')].map(v=>v.id).join(','),
    workingQuoteNo: document.getElementById('quoteNo')?.value,
    items: document.getElementById('sumCount')?.textContent,
    grand: document.getElementById('sumGrand')?.textContent,
    sync: document.getElementById('quoteSyncStatus')?.textContent,
  }))()`), null, 1));
  await shot('H4-restored-draft');

  console.log('=== H5: dashboard final sanity ===');
  await ev(`document.querySelector('[data-view="dashboard"]').click(); 'ok'`);
  await sleep(3000);
  rows = await ev(`[...document.querySelectorAll('.dash-row .c-qno')].map(n=>n.textContent)`);
  console.log('final rows:', JSON.stringify(rows), '| dups:', rows.length !== new Set(rows).size);
}
