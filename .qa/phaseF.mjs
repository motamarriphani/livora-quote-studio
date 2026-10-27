/* Phase F: mobile viewport UX + continue-last cancel + console sweep */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run({ cdp, S, ev, shot }) {
  console.log('=== F0: switch to phone viewport (390x844) ===');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, S);
  await sleep(1200);

  console.log('=== F1: dashboard on mobile ===');
  await ev(`document.querySelector('[data-view="dashboard"]')?.click(); 'ok'`);
  await sleep(2000);
  await shot('F1-mobile-dashboard');
  console.log(JSON.stringify(await ev(`(() => {
    const vw = document.documentElement.clientWidth;
    const overflowers = [...document.querySelectorAll('.dash-table,.view,#main')].filter(el => el.scrollWidth > el.clientWidth + 2).map(el => el.className || el.id);
    return { vw, horizontalOverflow: overflowers, statCardsVisible: document.querySelectorAll('.stat-card').length };
  })()`), null, 1));

  console.log('=== F2: builder on mobile — sticky bar overlap check ===');
  await ev(`document.querySelector('[data-view="builder"]')?.click(); 'ok'`);
  await sleep(1500);
  await shot('F2-mobile-builder-top');
  // scroll to bottom where sticky bar lives
  await ev(`window.scrollTo(0, document.body.scrollHeight); 'ok'`);
  await sleep(800);
  await shot('F3-mobile-builder-bottom');
  console.log(JSON.stringify(await ev(`(() => {
    const bar = document.querySelector('.sum-bar');
    const r = bar.getBoundingClientRect();
    const addBtn = document.querySelector('.add-section');
    const clearBtn = document.querySelector('.clear-quote');
    const clearR = clearBtn?.getBoundingClientRect();
    return {
      sumBarRect: { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) },
      vh: window.innerHeight,
      coversViewport: r.height > window.innerHeight * 0.5,
      clearBtnHiddenBehindBar: clearR ? (clearR.bottom > r.top && clearR.top < r.bottom) : null,
      previewBtnVisible: !!document.querySelector('.sum-bar [data-action=\"preview\"]'),
      inputsInBar: [...bar.querySelectorAll('input')].map(i => ({ id: i.id, w: i.getBoundingClientRect().width })),
    };
  })()`), null, 1));

  console.log('=== F3: preview PDF page on mobile ===');
  await ev(`document.querySelector('[data-action=\"preview\"]').click(); 'ok'`);
  await sleep(7000);
  await shot('F4-mobile-preview');
  console.log(JSON.stringify(await ev(`(() => ({
    canvases: document.querySelectorAll('#quotePdf canvas').length,
    canvasWidth: document.querySelector('#quotePdf canvas')?.getBoundingClientRect().width,
    actionsVisible: (() => { const a = document.querySelector('.quote-actions'); if (!a) return null; const r = a.getBoundingClientRect(); return { top: Math.round(r.top), visible: r.top < window.innerHeight }; })(),
    totalEl: document.getElementById('quoteTotal')?.textContent,
  }))()`), null, 1));
  await ev(`document.querySelector('[data-action=\"back-to-builder\"]').click(); 'ok'`);
  await sleep(1000);

  console.log('=== F4: library modal on mobile ===');
  await ev(`document.querySelector('.section-card [data-action=\"add-item\"]')?.click(); 'ok'`);
  await sleep(800);
  await shot('F5-mobile-library');
  console.log(JSON.stringify(await ev(`(() => {
    const m = document.querySelector('#libraryModal .modal-sheet');
    const r = m.getBoundingClientRect();
    return {
      sheetW: Math.round(r.width), vw: document.documentElement.clientWidth,
      fitsScreen: r.width <= document.documentElement.clientWidth,
      gridCols: getComputedStyle(document.getElementById('libGrid')).gridTemplateColumns.split(' ').length,
    };
  })()`), null, 1));
  await ev(`document.querySelector('[data-action=\"close-library\"]').click(); 'ok'`);
  await sleep(400);

  console.log('=== F5: sidebar drawer on mobile ===');
  await ev(`document.body.classList.remove('side-open'); document.querySelector('[data-action=\"open-sidebar\"]')?.click(); 'ok'`);
  await sleep(600);
  await shot('F6-mobile-drawer');
  const drawer = await ev(`(() => {
    const sb = document.getElementById('sidebar');
    const r = sb.getBoundingClientRect();
    return { left: Math.round(r.left), visible: r.left >= 0 && r.left < 300, backdropShown: !document.getElementById('sideBackdrop').hidden };
  })()`);
  console.log(JSON.stringify(drawer));
  await ev(`document.querySelector('[data-action=\"close-sidebar\"]')?.click(); 'ok'`);

  console.log('=== F6: back to desktop viewport ===');
  await cdp.send('Emulation.clearDeviceMetricsOverride', {}, S);
  await sleep(1000);

  console.log('=== F7: Continue-last-quote — cancel at confirm ===');
  await ev(`document.querySelector('[data-view=\"dashboard\"]')?.click(); 'ok'`);
  await sleep(2200);
  await ev(`document.querySelector('[data-action=\"continue-last\"]').click(); 'ok'`);
  await sleep(2500);
  const dlgMsg = await ev(`!document.getElementById('appDialog').classList.contains('hidden') ? document.getElementById('appDialogMessage').textContent : null`);
  console.log('continue-last dialog:', JSON.stringify(dlgMsg));
  await ev(`document.querySelector('[data-action=\"app-dialog-cancel\"]').click(); 'ok'`);
  await sleep(500);
  console.log('cancelled — still on:', await ev(`[...document.querySelectorAll('.view:not(.hidden)')].map(v=>v.id).join(',')`));

  console.log('=== F8: quote history entry points ===');
  console.log(JSON.stringify(await ev(`(() => ({
    historyButtonsOnPage: document.querySelectorAll('[data-action=\"quote-history\"]').length,
    kebabHasHistory: [...document.querySelectorAll('.row-menu-popover button')].map(b=>b.textContent.trim()),
  }))()`), null, 1));

  console.log('=== F9: final console error sweep ===');
}
