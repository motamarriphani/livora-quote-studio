/* Phase 3: full signup with a real disposable inbox (mail.tm), then land in app */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run({ ev, nav, shot, logs }) {
  // 1) create disposable mailbox
  const domains = await fetch('https://api.mail.tm/domains').then(r => r.json());
  const dom = domains['hydra:member'][0].domain;
  const addr = `livora.qa.${Date.now() % 100000}@${dom}`;
  const password = 'Qa-test-' + Math.random().toString(36).slice(2);
  await fetch('https://api.mail.tm/accounts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: addr, password }) });
  const tok = await fetch('https://api.mail.tm/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: addr, password }) }).then(r => r.json());
  const authHdr = { Authorization: `Bearer ${tok.token}` };
  console.log('mailbox:', addr);

  // 2) fresh app load, submit email
  await nav('http://localhost:8130/');
  await sleep(2500);
  await ev(`(() => { const e = document.getElementById('loginEmail'); e.value = '${addr}'; e.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await ev(`document.querySelector('[data-action="login-send-code"]').click(); 'ok'`);
  let onCode = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    onCode = await ev(`!document.getElementById('loginStepCode').classList.contains('hidden')`);
    if (onCode) break;
  }
  if (!onCode) {
    console.log('FAILED to reach code step:', await ev(`document.getElementById('loginMsg').textContent`));
    return;
  }
  console.log('OTP step reached');

  // 3) poll inbox for the Clerk code
  let code = null;
  for (let i = 0; i < 30 && !code; i++) {
    await sleep(2000);
    try {
      const msgs = await fetch('https://api.mail.tm/messages', { headers: authHdr }).then(r => r.json());
      for (const m of (msgs['hydra:member'] || [])) {
        const full = await fetch(`https://api.mail.tm/messages/${m.id}`, { headers: authHdr }).then(r => r.json());
        const text = (full.text || '') + (full.html ? full.html.join(' ') : '');
        const match = text.match(/\b(\d{6})\b/);
        if (match) { code = match[1]; break; }
      }
    } catch (e) { /* retry */ }
  }
  if (!code) { console.log('NO CODE ARRIVED'); return; }
  console.log('got code:', code);

  // 4) enter code (input handler auto-submits at 6 digits)
  await ev(`(() => { const c = document.getElementById('loginCode'); c.value='${code}'; c.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  let signedIn = false;
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    signedIn = await ev(`!!(window.Cloud && window.Cloud.signedIn)`);
    if (signedIn) break;
  }
  console.log('signedIn:', signedIn);
  if (!signedIn) {
    console.log('msg2:', await ev(`document.getElementById('loginMsg2')?.textContent`));
    await shot('06-signin-failed');
    return;
  }
  // wait for cloud sync to settle
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const ready = await ev(`!!window.Cloud?.ready`);
    if (ready) break;
  }
  await sleep(2000);
  await shot('07-signed-in-dashboard');
  console.log(JSON.stringify(await ev(`(() => ({
    overlayHidden: document.getElementById('loginOverlay')?.classList.contains('hidden'),
    cloudReady: !!window.Cloud?.ready,
    profileName: document.getElementById('profileName')?.textContent,
    profileEmail: document.getElementById('profileEmail')?.textContent,
    stats: [document.getElementById('statMonth')?.textContent, document.getElementById('statValue')?.textContent, document.getElementById('statOpen')?.textContent],
    quoteNo: document.getElementById('quoteNo')?.value,
    syncStatus: document.getElementById('quoteSyncStatus')?.textContent,
    banner: document.getElementById('syncBanner')?.classList.contains('hidden') ? null : document.getElementById('syncBanner').textContent,
    dashRows: document.querySelectorAll('.dash-row').length,
    emptyState: document.querySelector('.dash-empty')?.textContent || null,
  }))()`), null, 1));
  console.log('MAILBOX_ADDR=' + addr);
  console.log('MAILBOX_PASS=' + password);
}
