/* Phase 5: signup via mail.gw disposable inbox, with Clerk-side diagnostics */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const API = 'https://api.mail.gw';

export async function run({ ev, nav, shot, logs }) {
  const domains = await fetch(`${API}/domains`).then(r => r.json());
  const dom = domains['hydra:member'][0].domain;
  const addr = `livora.qa.${Date.now() % 100000}@${dom}`;
  const password = 'Qa-test-' + Math.random().toString(36).slice(2);
  const acct = await fetch(`${API}/accounts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: addr, password }) });
  if (!acct.ok && acct.status !== 422) { console.log('account create failed', acct.status); return; }
  const tok = await fetch(`${API}/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: addr, password }) }).then(r => r.json());
  const authHdr = { Authorization: `Bearer ${tok.token}` };
  console.log('mailbox:', addr);

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
    console.log('FAILED at email step:', await ev(`document.getElementById('loginMsg').textContent`));
    return;
  }
  // Clerk-side truth: what does the in-progress sign-in say?
  const clerkState = await ev(`(() => {
    const si = window.Clerk?.client?.signIn;
    const su = window.Clerk?.client?.signUp;
    return {
      signInStatus: si?.status || null,
      firstFactor: si?.supportedFirstFactors?.map(f => f.strategy) || null,
      signUpStatus: su?.status || null,
      verifications: su?.emailAddress?.verification?.status || null,
    };
  })()`);
  console.log('clerkState:', JSON.stringify(clerkState));

  let code = null;
  for (let i = 0; i < 60 && !code; i++) {
    await sleep(2000);
    try {
      const msgs = await fetch(`${API}/messages`, { headers: authHdr }).then(r => r.json());
      const list = msgs['hydra:member'] || [];
      if (i % 5 === 0) console.log(`poll ${i}: ${list.length} email(s)`);
      for (const m of list) {
        const full = await fetch(`${API}/messages/${m.id}`, { headers: authHdr }).then(r => r.json());
        const text = (full.text || '') + ' ' + (full.html || []).join(' ');
        const match = text.match(/\b(\d{6})\b/);
        if (match) { code = match[1]; break; }
      }
    } catch (e) {}
  }
  if (!code) { console.log('NO CODE ARRIVED after 2min'); return; }
  console.log('got code:', code);

  await ev(`(() => { const c = document.getElementById('loginCode'); c.value='${code}'; c.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  let signedIn = false;
  for (let i = 0; i < 25; i++) {
    await sleep(1000);
    signedIn = await ev(`!!(window.Cloud && window.Cloud.signedIn)`);
    if (signedIn) break;
  }
  console.log('signedIn:', signedIn);
  if (!signedIn) { console.log('msg2:', await ev(`document.getElementById('loginMsg2')?.textContent`)); return; }
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    if (await ev(`!!window.Cloud?.ready`)) break;
  }
  await sleep(2500);
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
  }))()`), null, 1));
  console.log('MAILBOX_ADDR=' + addr);
  console.log('MAILBOX_PASS=' + password);
}
