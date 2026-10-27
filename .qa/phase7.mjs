/* Phase 7: provision a verified Clerk account via SDK (instance requires username+password),
   capturing whether the verification email is actually sent once requirements are met */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const API = 'https://api.mail.gw';

export async function run({ ev, nav, shot }) {
  const domains = await fetch(`${API}/domains`).then(r => r.json());
  const dom = domains['hydra:member'][0].domain;
  const addr = `livora.qa.${Date.now() % 100000}@${dom}`;
  const password = 'Qa-' + Math.random().toString(36).slice(2) + 'A9';
  const acct = await fetch(`${API}/accounts`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: addr, password }) });
  if (!acct.ok && acct.status !== 422) { console.log('mailbox create failed', acct.status); return; }
  const tok = await fetch(`${API}/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: addr, password }) }).then(r => r.json());
  const authHdr = { Authorization: `Bearer ${tok.token}` };
  console.log('mailbox:', addr);

  await nav('http://localhost:8130/');
  await sleep(2500);

  // create the signUp WITH username+password as the instance demands
  const created = await ev(`(async () => {
    try {
      const su = await window.Clerk.client.signUp.create({
        emailAddress: '${addr}',
        username: 'livora_qa_${Date.now() % 10000}',
        password: '${password}',
      });
      return { status: su.status, missing: su.missingFields };
    } catch (e) { return { err: e.message, errors: e.errors?.map(x => x.longMessage || x.code) }; }
  })()`);
  console.log('create:', JSON.stringify(created));

  const prep = await ev(`(async () => {
    try {
      const su = window.Clerk.client.signUp;
      const r = await su.prepareEmailAddressVerification({ strategy: 'email_code' });
      return { ok: true, status: r.status };
    } catch (e) { return { err: e.message, errors: e.errors?.map(x => x.longMessage || x.code) }; }
  })()`);
  console.log('prepare:', JSON.stringify(prep));

  let code = null;
  for (let i = 0; i < 45 && !code; i++) {
    await sleep(2000);
    try {
      const msgs = await fetch(`${API}/messages`, { headers: authHdr }).then(r => r.json());
      for (const m of (msgs['hydra:member'] || [])) {
        const full = await fetch(`${API}/messages/${m.id}`, { headers: authHdr }).then(r => r.json());
        const text = (full.text || '') + ' ' + (full.html || []).join(' ');
        const match = text.match(/\b(\d{6})\b/);
        if (match) { code = match[1]; break; }
      }
    } catch (e) {}
  }
  console.log('code:', code);
  if (!code) { console.log('still no email even with complete signup'); return; }

  const attempt = await ev(`(async () => {
    try {
      const su = window.Clerk.client.signUp;
      const r = await su.attemptEmailAddressVerification({ code: '${code}' });
      return { status: r.status };
    } catch (e) { return { err: e.message, errors: e.errors?.map(x => x.longMessage || x.code) }; }
  })()`);
  console.log('attempt:', JSON.stringify(attempt));

  // wait for session + app sync
  let signedIn = false;
  for (let i = 0; i < 25; i++) {
    await sleep(1000);
    signedIn = await ev(`!!(window.Clerk?.session)`);
    if (signedIn) break;
  }
  console.log('session:', signedIn);
  if (!signedIn) return;
  // reload so the app boots authenticated
  await nav('http://localhost:8130/');
  await sleep(6000);
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    if (await ev(`!!window.Cloud?.ready`)) break;
  }
  await sleep(2000);
  await shot('07-signed-in-dashboard');
  console.log(JSON.stringify(await ev(`(() => ({
    overlayHidden: document.getElementById('loginOverlay')?.classList.contains('hidden'),
    signedIn: !!window.Cloud?.signedIn,
    cloudReady: !!window.Cloud?.ready,
    profileName: document.getElementById('profileName')?.textContent,
    profileEmail: document.getElementById('profileEmail')?.textContent,
    stats: [document.getElementById('statMonth')?.textContent, document.getElementById('statValue')?.textContent, document.getElementById('statOpen')?.textContent],
    quoteNo: document.getElementById('quoteNo')?.value,
    syncStatus: document.getElementById('quoteSyncStatus')?.textContent,
    banner: document.getElementById('syncBanner')?.classList.contains('hidden') ? null : document.getElementById('syncBanner').textContent.slice(0, 160),
    dashRows: document.querySelectorAll('.dash-row').length,
  }))()`), null, 1));
  console.log('QA_EMAIL=' + addr);
  console.log('QA_PASS=' + password);
}
