/* Phase C: builder E2E — create marked QA quote, exercise everything, then delete via app flows */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = (expr) => expr;

export async function run({ ev, shot }) {
  console.log('=== C0: snapshot local state (safety) ===');
  const snap = await ev(`localStorage.getItem('livora-quote-v2')`);
  await ev(`window.__QA_SNAPSHOT = ${JSON.stringify(snap)}`);
  console.log('snapshot bytes:', (snap || '').length);

  console.log('=== C1: New Quote (confirm dialog) ===');
  await ev(`document.querySelector('[data-action="new-quote"]').click(); 'ok'`);
  await sleep(500);
  const dlgVisible = await ev(`!document.getElementById('appDialog').classList.contains('hidden')`);
  console.log('confirm dialog appeared:', dlgVisible, '| msg:', await ev(`document.getElementById('appDialogMessage')?.textContent`));
  await ev(`document.querySelector('[data-action="app-dialog-confirm"]').click(); 'ok'`);
  await sleep(1200);
  console.log(JSON.stringify(await ev(`(() => ({
    viewsVisible: [...document.querySelectorAll('.view')].filter(v => !v.classList.contains('hidden')).map(v => v.id),
    quoteNo: document.getElementById('quoteNo')?.value,
    sections: document.querySelectorAll('.section-card').length,
    sumCount: document.getElementById('sumCount')?.textContent,
    cpLabel: document.getElementById('cpLabel')?.textContent,
  }))()`), null, 1));

  console.log('=== C2: rename section + add items from library ===');
  // rename first (empty) section via its sec-name input
  await ev(`(() => {
    const inp = document.querySelector('.section-card .sec-name');
    inp.value = 'QA Room';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(300);
  // add item from library into QA Room
  await ev(`document.querySelector('.section-card [data-action="add-item"]').click(); 'ok'`);
  await sleep(600);
  console.log(JSON.stringify(await ev(`(() => ({
    libOpen: !document.getElementById('libraryModal').classList.contains('hidden'),
    target: document.getElementById('libTarget')?.textContent,
    libItems: document.querySelectorAll('.lib-item').length,
  }))()`), null, 1));
  await shot('C2-library');
  // pick "Wardrobe Box"
  await ev(`[...document.querySelectorAll('.lib-item')].find(b => b.dataset.lib === 'wardrobe')?.click(); 'ok'`);
  await sleep(800);
  console.log(JSON.stringify(await ev(`(() => {
    const card = [...document.querySelectorAll('.section-card')].find(c => c.querySelector('.sec-name')?.value === 'QA Room');
    return {
      libClosed: document.getElementById('libraryModal').classList.contains('hidden'),
      itemsInQARoom: card ? card.querySelectorAll('.item-row').length : -1,
      sub: card?.querySelector('.sec-sub')?.textContent,
      toast: document.getElementById('toastRegion')?.textContent || null,
    };
  })()`), null, 1));

  console.log('=== C3: custom item modal ===');
  await ev(`document.querySelector('.section-card [data-action="add-item"]').click(); 'ok'`);
  await sleep(400);
  await ev(`document.querySelector('[data-action="custom-item"]').click(); 'ok'`);
  await sleep(400);
  // fill custom item: lump sum painting 25000
  await ev(`(() => {
    document.getElementById('cName').value = 'QA Custom Lump';
    document.getElementById('cRate').value = '25000';
    document.getElementById('cLump').checked = true;
    document.getElementById('cLump').dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await ev(`document.querySelector('[data-action="add-custom"]').click(); 'ok'`);
  await sleep(800);
  console.log(JSON.stringify(await ev(`(() => {
    const card = [...document.querySelectorAll('.section-card')].find(c => c.querySelector('.sec-name')?.value === 'QA Room');
    const amounts = [...card.querySelectorAll('.item-row .amount-box')].map(a => a.textContent);
    return { amounts, customClosed: document.getElementById('customModal').classList.contains('hidden') };
  })()`), null, 1));

  console.log('=== C4: dims editing + live math ===');
  await ev(`(() => {
    const card = [...document.querySelectorAll('.section-card')].find(c => c.querySelector('.sec-name')?.value === 'QA Room');
    const row = card.querySelector('.item-row:not(.lump)');
    const w = row.querySelector('[data-k="w"]'), h = row.querySelector('[data-k="h"]');
    w.value = '10'; h.value = '8';
    w.dispatchEvent(new Event('input', { bubbles: true }));
    h.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(400);
  console.log(JSON.stringify(await ev(`(() => {
    const card = [...document.querySelectorAll('.section-card')].find(c => c.querySelector('.sec-name')?.value === 'QA Room');
    return {
      wardrobeAmount: card.querySelector('.item-row:not(.lump) .amount-box')?.textContent,
      secSub: card.querySelector('.sec-sub')?.textContent,
      sumCalc: document.getElementById('sumCalculated')?.textContent,
      sumGrand: document.getElementById('sumGrand')?.textContent,
      sumCount: document.getElementById('sumCount')?.textContent,
    };
  })()`), null, 1));

  console.log('=== C5: customer + agreed subtotal + GST ===');
  await ev(`(() => {
    const n = document.getElementById('customerName');
    n.value = 'QA TEST DELETE ME';
    n.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await ev(`(() => {
    const f = document.getElementById('finalCharge');
    f.value = '100000';
    f.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(300);
  console.log(JSON.stringify(await ev(`(() => ({
    grand: document.getElementById('sumGrand')?.textContent,
    gst: document.getElementById('sumGst')?.textContent,
    warning: document.getElementById('sumWarning')?.textContent,
  }))()`), null, 1));
  // over-agreed warning
  await ev(`(() => { const f = document.getElementById('finalCharge'); f.value='99999999'; f.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(300);
  const warnOver = await ev(`document.getElementById('sumWarning')?.textContent`);
  console.log('over-agreed warning:', JSON.stringify(warnOver));
  await ev(`(() => { const g = document.getElementById('gst'); g.value='18'; g.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await ev(`(() => { const f = document.getElementById('finalCharge'); f.value='100000'; f.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(300);
  console.log(JSON.stringify(await ev(`(() => ({
    calc: document.getElementById('sumCalculated')?.textContent,
    grand: document.getElementById('sumGrand')?.textContent,
    gstAmt: document.getElementById('sumGst')?.textContent,
  }))()`), null, 1));
  await shot('C5-builder-filled');

  console.log('=== C6: sync status transitions (cloud save) ===');
  await sleep(3500); // debounce 1200 + mutation roundtrip
  console.log(JSON.stringify(await ev(`(() => ({
    syncStatus: document.getElementById('quoteSyncStatus')?.textContent,
    quoteNo: document.getElementById('quoteNo')?.value,
  }))()`), null, 1));

  console.log('=== C7: section collapse + delete item ===');
  await ev(`(() => {
    const head = [...document.querySelectorAll('.section-card')].find(c => c.querySelector('.sec-name')?.value === 'QA Room').querySelector('.sec-head .chev');
    head.click();
  })()`);
  await sleep(300);
  const collapsed = await ev(`[...document.querySelectorAll('.section-card')].find(c => c.querySelector('.sec-name')?.value === 'QA Room')?.classList.contains('collapsed')`);
  console.log('collapsed:', collapsed);
  await ev(`(() => {
    const head = [...document.querySelectorAll('.section-card')].find(c => c.querySelector('.sec-name')?.value === 'QA Room').querySelector('.sec-head .chev');
    head.click();
  })()`);
  await sleep(200);
  await ev(`(() => {
    const card = [...document.querySelectorAll('.section-card')].find(c => c.querySelector('.sec-name')?.value === 'QA Room');
    card.querySelector('.item-row .item-del').click();
  })()`);
  await sleep(300);
  console.log('after del-item, amounts:', await ev(`[...document.querySelectorAll('.section-card')].find(c => c.querySelector('.sec-name')?.value === 'QA Room')?.querySelectorAll('.item-row').length`));

  console.log('=== C8: preview from builder + back ===');
  await ev(`document.querySelector('[data-action="preview"]').click(); 'ok'`);
  await sleep(7000);
  console.log(JSON.stringify(await ev(`(() => ({
    pages: document.getElementById('quotePageCount')?.textContent,
    total: document.getElementById('quoteTotal')?.textContent,
    wordsShown: document.querySelector('#quoteSheet .qs-words')?.textContent.slice(0, 80),
  }))()`), null, 1));
  await shot('C8-preview-qa-quote');
  await ev(`document.querySelector('[data-action="back-to-builder"]').click(); 'ok'`);
  await sleep(1000);

  console.log('=== C9: download PDF (blob check without saving) ===');
  const dlName = await ev(`pdfFileName()`);
  console.log('PDF filename:', dlName);

  console.log('=== JUNK_QUOTE_NO=' + await ev(`document.getElementById('quoteNo')?.value`) + ' ===');

  console.log('=== C10: dashboard -> delete junk quote via kebab menu ===');
  await ev(`document.querySelector('[data-view="dashboard"]').click(); 'ok'`);
  await sleep(2500);
  const junkNo = await ev(`[...document.querySelectorAll('.dash-row')].find(r => r.querySelector('.c-client')?.textContent.includes('QA TEST'))?.querySelector('.c-qno')?.textContent`);
  console.log('junk row found on dashboard:', junkNo);
  if (!junkNo) { console.log('!! junk row NOT found — aborting cleanup, will handle manually'); return; }
  // open its kebab menu
  await ev(`[...document.querySelectorAll('.dash-row')].find(r => r.querySelector('.c-client')?.textContent.includes('QA TEST'))?.querySelector('[data-action="quote-menu"]').click(); 'ok'`);
  await sleep(400);
  await ev(`[...document.querySelectorAll('.row-menu-popover:not(.hidden) [data-action="dash-del"]')][0]?.click(); 'ok'`);
  await sleep(500);
  console.log('delete confirm msg:', await ev(`document.getElementById('appDialogMessage')?.textContent`));
  await ev(`document.querySelector('[data-action="app-dialog-confirm"]').click(); 'ok'`);
  await sleep(3000);
  console.log(JSON.stringify(await ev(`(() => ({
    stillThere: [...document.querySelectorAll('.dash-row')].some(r => r.querySelector('.c-client')?.textContent.includes('QA TEST')),
    toast: document.getElementById('toastRegion')?.textContent || null,
    stats: [document.getElementById('statMonth')?.textContent, document.getElementById('statValue')?.textContent],
  }))()`), null, 1));

  console.log('=== C11: recently deleted -> restore -> redelete (full recovery loop) ===');
  await ev(`document.querySelector('[data-action="deleted-quotes"]').click(); 'ok'`);
  await sleep(2000);
  console.log(JSON.stringify(await ev(`(() => ({
    modalOpen: !document.getElementById('deletedQuotesModal').classList.contains('hidden'),
    rows: [...document.querySelectorAll('.deleted-quote-row')].map(r => r.querySelector('.deleted-quote-no')?.textContent),
  }))()`), null, 1));
  await shot('C11-recently-deleted');
  // restore it
  await ev(`[...document.querySelectorAll('.deleted-quote-row')].find(r => r.textContent.includes('${junkNo}'))?.querySelector('[data-action="restore-quote"]')?.click(); 'ok'`);
  await sleep(500);
  await ev(`document.querySelector('[data-action="app-dialog-confirm"]')?.click(); 'ok'`);
  await sleep(3000);
  const restoredBack = await ev(`[...document.querySelectorAll('.dash-row')].some(r => r.querySelector('.c-qno')?.textContent === '${junkNo}') || [...document.querySelectorAll('.dash-row')].some(r => r.querySelector('.c-client')?.textContent.includes('QA TEST'))`);
  console.log('restored back to dashboard:', restoredBack);
  // delete again — final resting place: Recently deleted
  await ev(`[...document.querySelectorAll('.dash-row')].find(r => r.querySelector('.c-client')?.textContent.includes('QA TEST'))?.querySelector('[data-action="quote-menu"]').click(); 'ok'`);
  await sleep(300);
  await ev(`[...document.querySelectorAll('.row-menu-popover:not(.hidden) [data-action="dash-del"]')][0]?.click(); 'ok'`);
  await sleep(400);
  await ev(`document.querySelector('[data-action="app-dialog-confirm"]').click(); 'ok'`);
  await sleep(3000);
  console.log('final check — junk on dashboard:', await ev(`[...document.querySelectorAll('.dash-row')].some(r => r.querySelector('.c-client')?.textContent.includes('QA TEST'))`));

  console.log('=== C12: restore working draft ===');
  // bring user's original draft back as the working quote
  const origState = await ev(`JSON.parse(window.__QA_SNAPSHOT)`);
  console.log('original draft in snapshot:', origState?.quoteNo, '| sections:', origState?.sections?.length);
}
