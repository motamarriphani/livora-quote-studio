/* Phase D: restore user's draft from snapshot, then test Clients flows */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run({ ev, shot }) {
  console.log('=== D0: restore user draft ===');
  const ok = await ev(`(function(){
    const snap = window.__QA_SNAPSHOT;
    if (!snap) return 'NO SNAPSHOT';
    try {
      const s = JSON.parse(snap);
      // restore into the live state object (same reference the app uses)
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, s);
      save();
      bindFields(); render();
      return 'restored:' + state.quoteNo + ':sections=' + state.sections.length;
    } catch (e) { return 'ERR ' + e.message; }
  })()`);
  console.log(ok);
  await sleep(2500); // allow debounced push of identical content
  console.log(JSON.stringify(await ev(`(() => ({
    quoteNo: document.getElementById('quoteNo')?.value,
    syncStatus: document.getElementById('quoteSyncStatus')?.textContent,
    sections: document.querySelectorAll('.section-card').length,
  }))()`), null, 1));

  console.log('=== D1: Clients view ===');
  await ev(`document.querySelector('[data-view="clients"]').click(); 'ok'`);
  await sleep(3000);
  console.log(JSON.stringify(await ev(`(() => ({
    viewsVisible: [...document.querySelectorAll('.view')].filter(v=>!v.classList.contains('hidden')).map(v=>v.id),
    headTitle: document.querySelector('#clients .head-title')?.textContent,
    clientRows: [...document.querySelectorAll('.client-row')].map(r => ({
      name: r.querySelector('.client-name')?.textContent,
      sub: r.querySelector('.client-sub')?.textContent.slice(0,40),
      count: r.querySelector('.client-qn')?.textContent,
      latest: r.querySelector('.client-context')?.textContent.slice(0,30),
      archived: r.classList.contains('archived'),
    })),
    moreHidden: document.getElementById('clientsMore')?.classList.contains('hidden'),
    searchVal: document.getElementById('clientSearch')?.value,
  }))()`), null, 1));
  await shot('D1-clients');

  console.log('=== D2: expand a client panel (first with quotes) ===');
  await ev(`document.querySelector('.client-row.has-q [data-action="toggle-client-quotes"]') ? document.querySelector('.client-row.has-q').click() : document.querySelector('.client-row').click(); 'ok'`);
  await sleep(2500);
  console.log(JSON.stringify(await ev(`(() => {
    const panels = [...document.querySelectorAll('.client-quotes-panel:not(.hidden)')];
    return panels.map(p => ({
      clientId: p.dataset.panel,
      rows: [...p.querySelectorAll('.dash-row')].map(r => r.querySelector('.c-qno')?.textContent),
      moreHidden: p.querySelector('[data-action="client-quotes-more"]')?.classList.contains('hidden'),
    }));
  })()`), null, 1));
  await shot('D2-client-panel');

  console.log('=== D3: client search ===');
  await ev(`(() => { const s = document.getElementById('clientSearch'); s.value='zzznomatch'; s.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(1500);
  console.log('empty:', await ev(`document.querySelector('.client-empty')?.textContent || null`));
  await ev(`(() => { const s = document.getElementById('clientSearch'); s.value='ram'; s.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(2000);
  console.log('search ram:', JSON.stringify(await ev(`[...document.querySelectorAll('.client-row .client-name')].map(n=>n.textContent)`)));
  await ev(`(() => { const s = document.getElementById('clientSearch'); s.value=''; s.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(1500);

  console.log('=== D4: Add QA client (for picker/archive tests) ===');
  await ev(`document.querySelector('[data-action="add-client"]').click(); 'ok'`);
  await sleep(500);
  await ev(`(() => {
    document.getElementById('clName').value = 'QA TEST CLIENT';
    document.getElementById('clPhone').value = '9000000009';
    document.getElementById('clAddress').value = 'QA address - safe to archive';
  })()`);
  await ev(`document.querySelector('[data-action="save-client"]').click(); 'ok'`);
  await sleep(3500);
  const qaRow = await ev(`(() => {
    const r = [...document.querySelectorAll('.client-row')].find(x => x.querySelector('.client-name')?.textContent === 'QA TEST CLIENT');
    return r ? { found: true, id: r.dataset.id, count: r.querySelector('.client-qn')?.textContent } : { found: false };
  })()`);
  console.log('QA client row:', JSON.stringify(qaRow));
  await shot('D4-qa-client-added');

  console.log('=== D5: edit client modal (merge row visible?) ===');
  if (qaRow.found) {
    await ev(`[...document.querySelectorAll('.client-row')].find(x => x.querySelector('.client-name')?.textContent==='QA TEST CLIENT').querySelector('[data-action="edit-client"]').click(); 'ok'`);
    await sleep(600);
    console.log(JSON.stringify(await ev(`(() => ({
      title: document.getElementById('clientModalTitle')?.textContent,
      mergeRowVisible: !document.getElementById('clMergeRow').classList.contains('hidden'),
      draftRowVisible: !document.getElementById('clDraftRow').classList.contains('hidden'),
      mergeOptions: [...document.getElementById('clMerge').options].length,
      namePrefilled: document.getElementById('clName').value,
    }))()`), null, 1));
    await ev(`document.querySelector('[data-action="close-client-modal"]').click(); 'ok'`);
    await sleep(400);

    console.log('=== D6: archive QA client (recoverable cleanup) ===');
    await ev(`[...document.querySelectorAll('.client-row')].find(x => x.querySelector('.client-name')?.textContent==='QA TEST CLIENT').querySelector('[data-action="quote-menu"]').click(); 'ok'`);
    await sleep(400);
    await ev(`document.querySelector('.row-menu-popover:not(.hidden) [data-action="archive-client"]')?.click(); 'ok'`);
    await sleep(500);
    console.log('archive confirm:', await ev(`document.getElementById('appDialogMessage')?.textContent`));
    await ev(`document.querySelector('[data-action="app-dialog-confirm"]').click(); 'ok'`);
    await sleep(3000);
    console.log(JSON.stringify(await ev(`(() => ({
      qaStillListed: [...document.querySelectorAll('.client-row')].some(x => x.querySelector('.client-name')?.textContent==='QA TEST CLIENT'),
      toast: document.getElementById('toastRegion')?.textContent || null,
      archivedBtnLabel: document.querySelector('[data-action="toggle-archived"]')?.textContent,
    }))()`), null, 1));

    console.log('=== D7: archived clients toggle + restore ===');
    await ev(`document.querySelector('[data-action="toggle-archived"]').click(); 'ok'`);
    await sleep(3000);
    console.log(JSON.stringify(await ev(`(() => ({
      headSub: document.querySelector('#clients .head-sub')?.textContent,
      rows: [...document.querySelectorAll('.client-row')].map(r => ({ n: r.querySelector('.client-name')?.textContent, arch: r.classList.contains('archived') })),
      addBtnHidden: document.querySelector('[data-action="add-client"]')?.classList.contains('hidden'),
    }))()`), null, 1));
    await shot('D7-archived-list');
    // unarchive = brings QA client back to active book; then leave archived instead?
    // Decision: leave it ARCHIVED (visible under Archived clients, harmless) — note in report.
    await ev(`document.querySelector('[data-action="toggle-archived"]').click(); 'ok'`);
    await sleep(2500);
  }

  console.log('=== D8: builder client picker ===');
  await ev(`document.querySelector('[data-view="builder"]').click(); 'ok'`);
  await sleep(1200);
  await ev(`document.querySelector('[data-action="toggle-client-pick"]').click(); 'ok'`);
  await sleep(2000);
  console.log(JSON.stringify(await ev(`(() => ({
    pickOpen: !document.getElementById('clientPickList').classList.contains('hidden'),
    rows: [...document.querySelectorAll('#clientPickRows .cp-row .cp-name')].map(n => n.textContent).slice(0, 8),
    hasAddNew: !!document.querySelector('[data-action="pick-add-client"]'),
    label: document.getElementById('cpLabel')?.textContent,
  }))()`), null, 1));
  await shot('D8-client-picker');
  // close picker
  await ev(`document.body.click(); 'ok'`);

  console.log('=== D9: profile menu ===');
  await ev(`document.querySelector('[data-action="toggle-profile-menu"]').click(); 'ok'`);
  await sleep(400);
  console.log(JSON.stringify(await ev(`(() => ({
    open: !document.getElementById('profileMenu').classList.contains('hidden'),
    items: [...document.querySelectorAll('#profileMenu [role="menuitem"]')].map(b => b.textContent.trim()),
    name: document.getElementById('menuName')?.textContent,
    email: document.getElementById('menuEmail')?.textContent,
  }))()`), null, 1));
  await shot('D9-profile-menu');
  // close without clicking logout!
  await ev(`document.querySelector('[data-action="toggle-profile-menu"]').click(); 'ok'`);
}
