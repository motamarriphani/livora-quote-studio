/* Phase E: profile menu + catalog tabs (services/items/materials/terms) — read-mostly */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run({ ev, shot }) {
  console.log('=== E0: close any picker, open profile menu ===');
  await ev(`document.body.click(); 'ok'`);
  await sleep(300);
  await ev(`document.querySelector('[data-action="toggle-profile-menu"]').click(); 'ok'`);
  await sleep(500);
  console.log(JSON.stringify(await ev(`(() => ({
    open: !document.getElementById('profileMenu').classList.contains('hidden'),
    ariaExpanded: document.querySelector('.side-profile')?.getAttribute('aria-expanded'),
    name: document.getElementById('menuName')?.textContent,
    email: document.getElementById('menuEmail')?.textContent,
    items: [...document.querySelectorAll('#profileMenu [role="menuitem"]')].map(b => b.textContent.trim()),
  }))()`), null, 1));
  await shot('E0-profile-menu');
  // coming-soon item test (Personalization)
  await ev(`document.querySelector('[data-action="menu-personalization"]').click(); 'ok'`);
  await sleep(400);
  console.log('coming-soon toast:', await ev(`document.getElementById('toastRegion')?.textContent`));

  console.log('=== E1: Services tab ===');
  await ev(`document.querySelector('[data-view="services"]').click(); 'ok'`);
  await sleep(1500);
  console.log(JSON.stringify(await ev(`(() => ({
    head: document.getElementById('catHeadTitle')?.textContent,
    addBtn: document.getElementById('catAddBtn')?.textContent,
    editBtnHidden: document.getElementById('termsEditBtn')?.classList.contains('hidden'),
    filtersHidden: document.getElementById('catFilters')?.classList.contains('hidden'),
    rows: [...document.querySelectorAll('#catList .cat-row')].map(r => r.querySelector('.cat-name')?.textContent + '|' + (r.querySelector('.cat-price')?.textContent || '')).slice(0, 10),
    activeSide: document.querySelector('.side-item.active')?.dataset.view,
  }))()`), null, 1));
  await shot('E1-services');

  console.log('=== E2: Items tab + search/filter/pager ===');
  await ev(`document.querySelector('[data-view="items"]').click(); 'ok'`);
  await sleep(1500);
  const itemsState = await ev(`(() => ({
    rowsShown: document.querySelectorAll('#catList .cat-row').length,
    pagerText: document.getElementById('catPager')?.textContent.replace(/\\s+/g,' ').trim(),
    cats: [...document.getElementById('catItemsCat').options].map(o => o.value).slice(0, 8),
    prevDisabled: document.querySelector('[data-action="cat-page-prev"]')?.disabled,
    nextDisabled: document.querySelector('[data-action="cat-page-next"]')?.disabled,
  }))()`);
  console.log(JSON.stringify(itemsState, null, 1));
  // page next
  if (!itemsState.nextDisabled) {
    await ev(`document.querySelector('[data-action="cat-page-next"]').click(); 'ok'`);
    await sleep(600);
    console.log('page2 first:', await ev(`document.querySelector('#catList .cat-item-name')?.textContent`), '| pager:', await ev(`document.getElementById('catPager')?.textContent.replace(/\\s+/g,' ').trim()`));
    await ev(`document.querySelector('[data-action="cat-page-prev"]').click(); 'ok'`);
    await sleep(400);
  }
  // search filter
  await ev(`(() => { const s = document.getElementById('catItemsSearch'); s.value='wardrobe'; s.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(700);
  console.log('search wardrobe:', JSON.stringify(await ev(`[...document.querySelectorAll('#catList .cat-item-name')].map(n=>n.textContent)`)));
  // category filter
  await ev(`(() => { const s = document.getElementById('catItemsSearch'); s.value=''; s.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await ev(`(() => { const sel = document.getElementById('catItemsCat'); sel.value = sel.options[1]?.value || ''; sel.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await sleep(700);
  console.log('cat filtered:', JSON.stringify(await ev(`[...document.querySelectorAll('#catList .cat-item-sub')].map(n=>n.textContent.slice(0,20))`)));
  await ev(`(() => { const sel = document.getElementById('catItemsCat'); sel.value=''; sel.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await shot('E2-items');

  console.log('=== E3: Materials tab ===');
  await ev(`document.querySelector('[data-view="materials"]').click(); 'ok'`);
  await sleep(1500);
  console.log(JSON.stringify(await ev(`(() => ({
    head: document.getElementById('catHeadTitle')?.textContent,
    rows: document.querySelectorAll('#catList .cat-row').length,
    firstCat: document.querySelector('.cat-mat-c')?.textContent,
    addBtn: document.getElementById('catAddBtn')?.textContent,
  }))()`), null, 1));
  await shot('E3-materials');

  console.log('=== E4: Terms tab — view mode, drag handles, edit toggle ===');
  await ev(`document.querySelector('[data-view="terms"]').click(); 'ok'`);
  await sleep(1800);
  console.log(JSON.stringify(await ev(`(() => ({
    head: document.getElementById('catHeadTitle')?.textContent,
    addBtnHidden: document.getElementById('catAddBtn')?.classList.contains('hidden'),
    editBtnLabel: document.getElementById('termsEditBtn')?.textContent,
    termCount: document.querySelectorAll('.term-row-view').length,
    dragHandles: document.querySelectorAll('.term-drag').length,
    firstTerm: document.querySelector('.cat-term-t')?.textContent.slice(0, 50),
  }))()`), null, 1));
  await shot('E4-terms');

  console.log('=== E5: terms edit mode (enter+exit, no changes saved) ===');
  await ev(`document.getElementById('termsEditBtn').click(); 'ok'`);
  await sleep(800);
  const editState = await ev(`(() => ({
    textareas: document.querySelectorAll('.cat-term-input').length,
    delButtons: document.querySelectorAll('.term-row-edit .icon-btn.danger').length,
    editBtnLabel: document.getElementById('termsEditBtn')?.textContent,
    addBtnHidden: document.getElementById('catAddBtn')?.classList.contains('hidden'),
  }))()`);
  console.log(JSON.stringify(editState, null, 1));
  // type into a textarea WITHOUT blurring away — then revert by re-typing original? Safer: do NOT touch content. Just exit.
  await ev(`document.getElementById('termsEditBtn').click(); 'ok'`);
  await sleep(1200);
  console.log('after exit — term count still:', await ev(`document.querySelectorAll('.term-row-view').length`));

  console.log('=== E6: sidebar active-state sanity across nav ===');
  for (const v of ['dashboard', 'clients', 'services', 'items', 'materials', 'terms', 'builder']) {
    await ev(`document.querySelector('[data-view="${v}"]')?.click(); 'ok'`);
    await sleep(900);
    const act = await ev(`document.querySelector('.side-item.active')?.dataset.view + ' | visible:' + [...document.querySelectorAll('.view:not(.hidden)')].map(x=>x.id).join(',')`);
    console.log(v, '→', act);
  }
}
