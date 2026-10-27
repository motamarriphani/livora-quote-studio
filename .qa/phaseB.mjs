/* Phase B: dashboard flows — search, status filter, preview round-trip (read-only) */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run({ ev, shot }) {
  console.log('=== B1: search filter ===');
  await ev(`(() => { const s = document.getElementById('dashSearch'); s.value='phani'; s.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(1500); // 300ms debounce + fetch
  console.log(JSON.stringify(await ev(`(() => ({
    rows: [...document.querySelectorAll('.dash-row')].map(r => r.querySelector('.c-qno')?.textContent + '/' + r.querySelector('.c-client')?.textContent.slice(0,10)),
    loading: document.getElementById('dashList')?.getAttribute('aria-busy'),
    errShown: !!document.querySelector('.load-error'),
  }))()`), null, 1));
  await shot('B1-search-phani');

  // search with no matches
  await ev(`(() => { const s = document.getElementById('dashSearch'); s.value='zzzznomatch'; s.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(1600);
  console.log('no-match state:', JSON.stringify(await ev(`(() => ({
    emptyText: document.querySelector('.dash-empty')?.textContent || null,
    rowCount: document.querySelectorAll('.dash-row').length,
  }))()`)));
  // clear search
  await ev(`(() => { const s = document.getElementById('dashSearch'); s.value=''; s.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(1500);

  console.log('=== B2: status filter ===');
  await ev(`(() => { const s = document.getElementById('dashStatus'); s.value='sent'; s.dispatchEvent(new Event('change',{bubbles:true})); s.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(1800);
  console.log(JSON.stringify(await ev(`[...document.querySelectorAll('.dash-row .status-select')].map(s => s.value)`)));
  await ev(`(() => { const s = document.getElementById('dashStatus'); s.value=''; s.dispatchEvent(new Event('change',{bubbles:true})); s.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(1800);
  console.log('after reset, rows:', await ev(`document.querySelectorAll('.dash-row').length`));

  console.log('=== B3: preview round-trip (first row) ===');
  const beforeNo = await ev(`document.getElementById('quoteNo')?.value`);
  console.log('working draft quoteNo before preview:', beforeNo);
  await ev(`document.querySelector('.dash-row [data-action="preview-quote"]')?.click(); 'ok'`);
  await sleep(7000); // pdfmake gen + pdf.js render
  console.log(JSON.stringify(await ev(`(() => ({
    quoteViewVisible: !document.getElementById('quote').classList.contains('hidden'),
    pdfMode: document.getElementById('quote').classList.contains('pdf-mode'),
    canvases: document.querySelectorAll('#quotePdf canvas').length,
    pageCount: document.getElementById('quotePageCount')?.textContent,
    totalShown: document.getElementById('quoteTotal')?.textContent,
    breakdown: document.getElementById('quoteBreakdown')?.textContent,
    htmlSheetFallbackVisible: !!document.querySelector('#quoteSheet .qs-table'),
  }))()`), null, 1));
  await shot('B3-preview');

  console.log('=== B4: display options toggle ===');
  await ev(`document.querySelector('[data-action="quote-options"]')?.click(); 'ok'`);
  await sleep(400);
  const optState = await ev(`(() => ({ dims: document.getElementById('optDims').checked, spec: document.getElementById('optSpec').checked, modalOpen: !document.getElementById('optionsModal').classList.contains('hidden') }))()`);
  console.log('options:', JSON.stringify(optState));
  await ev(`(() => { const d = document.getElementById('optDims'); d.checked=false; d.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(5000); // re-render pdf
  console.log(JSON.stringify(await ev(`(() => ({
    canvasesAfterDimsOff: document.querySelectorAll('#quotePdf canvas').length,
    stateShowDims: window.Cloud ? undefined : undefined,
    headerCells: [...document.querySelectorAll('#quoteSheet th')].map(t=>t.textContent),
  }))()`), null, 1));
  await shot('B4-dims-off');
  // restore dims
  await ev(`(() => { const d = document.getElementById('optDims'); d.checked=true; d.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(4000);
  await ev(`document.querySelector('[data-action="close-options"]')?.click(); 'ok'`);

  console.log('=== B5: close preview -> return target ===');
  await ev(`document.querySelector('[data-action="back-to-builder"]')?.click(); 'ok'`);
  await sleep(1200);
  console.log(JSON.stringify(await ev(`(() => ({
    viewsVisible: [...document.querySelectorAll('.view')].filter(v => !v.classList.contains('hidden')).map(v => v.id),
    quoteNoFieldRestored: document.getElementById('quoteNo')?.value,
  }))()`), null, 1));
}
