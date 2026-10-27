/* Phase I: conflict modal check + resolve, print path, final scoped dashboard verify */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run({ ev, shot }) {
  console.log('=== I0: is the conflict modal open? ===');
  const conflict = await ev(`(() => ({
    open: !document.getElementById('conflictModal').classList.contains('hidden'),
    msg: document.getElementById('conflictMsg')?.textContent?.slice(0, 120),
    banner: document.getElementById('syncBanner')?.classList.contains('hidden') ? null : document.getElementById('syncBanner').textContent.slice(0, 140),
  }))()`);
  console.log(JSON.stringify(conflict, null, 1));
  await shot('I0-conflict-state');

  if (conflict.open) {
    console.log('--- resolving: Reload cloud version (safest) ---');
    await ev(`document.querySelector('[data-action="conflict-reload"]').click(); 'ok'`);
    await sleep(4000);
    console.log(JSON.stringify(await ev(`(() => ({
      modalClosed: document.getElementById('conflictModal').classList.contains('hidden'),
      workingQuoteNo: document.getElementById('quoteNo')?.value,
      items: document.getElementById('sumCount')?.textContent,
      grand: document.getElementById('sumGrand')?.textContent,
      banner: document.getElementById('syncBanner')?.classList.contains('hidden') ? null : 'shown',
      sync: document.getElementById('quoteSyncStatus')?.textContent,
    }))()`), null, 1));
  } else if (conflict.banner) {
    console.log('--- banner shown without modal; clicking Resolve now ---');
    await ev(`document.querySelector('[data-action="reopen-conflict"]')?.click(); 'ok'`);
    await sleep(600);
    const reopened = await ev(`!document.getElementById('conflictModal').classList.contains('hidden')`);
    console.log('reopened:', reopened);
    if (reopened) {
      await ev(`document.querySelector('[data-action="conflict-reload"]').click(); 'ok'`);
      await sleep(4000);
      console.log('resolved:', await ev(`document.getElementById('conflictModal').classList.contains('hidden')`));
    }
  }

  console.log('=== I1: scoped dashboard rows (dashList only) ===');
  await ev(`document.querySelector('[data-view="dashboard"]').click(); 'ok'`);
  await sleep(3000);
  console.log(JSON.stringify(await ev(`(() => {
    const rows = [...document.querySelectorAll('#dashList .dash-row .c-qno')].map(n => n.textContent);
    return { rows, dups: rows.length !== new Set(rows).size };
  })()`), null, 1));

  console.log('=== I2: ?preview=1 print path ===');
  await ev(`sessionStorage.setItem('__qa', '1'); location.href = location.origin + '/?preview=1'; 'nav'`);
  await sleep(9000);
  console.log(JSON.stringify(await ev(`(() => ({
    url: location.href,
    overlayHidden: document.getElementById('loginOverlay')?.classList.contains('hidden'),
    quoteVisible: !document.getElementById('quote').classList.contains('hidden'),
    pages: document.getElementById('quotePageCount')?.textContent,
    canvases: document.querySelectorAll('#quotePdf canvas').length,
    loadedSample: document.getElementById('quoteTotal')?.textContent,
  }))()`), null, 1));
  await shot('I2-preview-param');

  console.log('=== I3: back to normal app ===');
  await ev(`location.href = location.origin + '/'; 'nav'`);
  await sleep(8000);
  for (let i = 0; i < 20; i++) { await sleep(1000); if (await ev(`!!window.Cloud?.ready`)) break; }
  await sleep(1500);
  console.log(JSON.stringify(await ev(`(() => ({
    view: [...document.querySelectorAll('.view:not(.hidden)')].map(v=>v.id).join(','),
    signedIn: !!window.Cloud?.signedIn,
    dashRows: document.querySelectorAll('#dashList .dash-row').length,
    stats: [document.getElementById('statMonth')?.textContent, document.getElementById('statValue')?.textContent, document.getElementById('statOpen')?.textContent],
  }))()`), null, 1));
  await shot('I3-final-state');
}
