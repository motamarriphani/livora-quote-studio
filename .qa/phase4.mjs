/* Phase 4: signup via tempmail.lol inbox */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run({ ev, nav, shot, logs }) {
  // 1) tempmail.lol inbox
  const inbox = await fetch('https://api.tempmail.lol/v2/inbox', { method: 'POST' }).then(r => r.json());
  const addr = inbox.address, token = inbox.token;
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
    console.log('FAILED to reach code step:', await ev(`document.getElementById('loginMsg').textContent`));
    return;
  }
  console.log('OTP step reached');

  let code = null;
  for (let i = 0; i < 45 && !code; i++) {
    await sleep(2000);
    try {
      const res = await fetch(`https://api.tempmail.lol/v2/inbox/${token}`).then(r => r.json());
      const emails = res.emails || [];
      if (i % 5 === 0) console.log(`poll ${i}: ${emails.length} email(s)`);
      for (const m of emails) {
        const body = (m.body || '') + ' ' + (m.html || '');
        const match = body.match(/\b(\d{6})\b/);
        if (match) { code = match[1]; break; }
      }
    } catch (e) { console.log('poll error', e.message); }
  }
  if (!code) {
    console.log('NO CODE ARRIVED. clerk network log:');
    logs.filter(l => /clerk|sign_in|error/i.test(l)).forEach(l => console.log(l));
    return;
  }
  console.log('got code:', code);

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
    return;
  }
  for (let i = 0; i < 15; i++) {
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
  console.log('MAILBOX_TOKEN=' + token);
}
