/* Phase A: recon the real signed-in session — no clicks yet */
export async function run({ ev, shot }) {
  await new Promise(r => setTimeout(r, 1500));
  console.log('=== SESSION STATE ===');
  console.log(JSON.stringify(await ev(`(() => ({
    url: location.href,
    clerkUser: !!window.Clerk?.user,
    email: window.Clerk?.user?.emailAddresses?.[0]?.emailAddress || null,
    signedIn: !!(window.Cloud && window.Cloud.signedIn),
    cloudReady: !!window.Cloud?.ready,
    overlayHidden: document.getElementById('loginOverlay')?.classList.contains('hidden'),
    viewVisible: [...document.querySelectorAll('.view')].filter(v => !v.classList.contains('hidden')).map(v => v.id),
    profileName: document.getElementById('profileName')?.textContent,
    stats: [document.getElementById('statMonth')?.textContent, document.getElementById('statValue')?.textContent, document.getElementById('statOpen')?.textContent],
    dashRows: document.querySelectorAll('.dash-row').length,
    dashMoreBtnHidden: document.getElementById('dashMore')?.classList.contains('hidden'),
    syncBannerShown: !document.getElementById('syncBanner')?.classList.contains('hidden'),
    syncBannerText: document.getElementById('syncBanner')?.textContent || null,
    quoteSyncStatus: document.getElementById('quoteSyncStatus')?.textContent,
  }))()`), null, 1));

  console.log('=== DASHBOARD ROWS (as rendered) ===');
  console.log(JSON.stringify(await ev(`[...document.querySelectorAll('.dash-row')].map(r => ({
    qno: r.querySelector('.c-qno')?.textContent,
    client: r.querySelector('.c-client')?.textContent,
    date: r.querySelector('.c-date')?.textContent,
    total: r.querySelector('.c-total')?.textContent,
    status: r.querySelector('.status-select')?.value,
  }))`), null, 1));

  // UX checks on the table
  console.log('=== TABLE UX CHECKS ===');
  console.log(JSON.stringify(await ev(`(() => {
    const rows = [...document.querySelectorAll('.dash-row')];
    const zeroNoClient = rows.filter(r => r.querySelector('.c-client')?.textContent.trim().startsWith('—')).length;
    const zeroTotal = rows.filter(r => r.querySelector('.c-total')?.textContent.replace(/[^0-9]/g,'') === '0').length;
    const statusSel = document.querySelector('.status-select');
    return {
      rowsTotal: rows.length,
      rowsWithNoClientName: zeroNoClient,
      rowsWithZeroTotal: zeroTotal,
      statusSelectExists: !!statusSel,
      searchValue: document.getElementById('dashSearch')?.value,
      emptyStateShown: !!document.querySelector('.dash-empty'),
    };
  })()`), null, 1));
  await shot('A-dashboard-real');
}
