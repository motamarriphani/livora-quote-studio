/* Phase 2: complete OTP sign-in with dev code 424242, then land in app */
export async function run({ cdp, S, ev, nav, shot, logs, sleep }) {
  // fresh page state
  await nav('http://localhost:8130/');
  await sleep(2500);

  const EMAIL = 'livora.qa+clerk_test@gmail.com';
  console.log('=== submit email ===');
  await ev(`(() => { const e = document.getElementById('loginEmail'); e.value = '${EMAIL}'; e.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await ev(`document.querySelector('[data-action="login-send-code"]').click(); 'ok'`);

  // watch msg + step transitions over 12s
  let saw = [];
  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    const st = await ev(`(() => ({
      step2: !document.getElementById('loginStepCode').classList.contains('hidden'),
      msg: document.getElementById('loginMsg')?.textContent,
      msg2: document.getElementById('loginMsg2')?.textContent,
    }))()`);
    saw.push(st);
    if (st.step2 || (st.msg && st.msg.length)) break;
  }
  console.log(JSON.stringify(saw, null, 1));
  await shot('04-code-step');

  const onCodeStep = await ev(`!document.getElementById('loginStepCode').classList.contains('hidden')`);
  if (!onCodeStep) {
    console.log('>>> Never reached code step. Aborting.');
    logs.forEach(l => console.log(l));
    return;
  }

  console.log('=== enter dev code 424242 ===');
  await ev(`(() => { const c = document.getElementById('loginCode'); c.value='424242'; c.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  // input handler auto-submits at 6 digits; wait for session
  let signedIn = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    signedIn = await ev(`!!(window.Cloud && window.Cloud.signedIn)`);
    if (signedIn) break;
  }
  console.log('signedIn:', signedIn);
  console.log(JSON.stringify(await ev(`(() => ({
    overlayHidden: document.getElementById('loginOverlay')?.classList.contains('hidden'),
    msg2: document.getElementById('loginMsg2')?.textContent,
    cloudReady: !!window.Cloud?.ready,
    syncStatus: document.getElementById('quoteSyncStatus')?.textContent,
  }))()`), null, 1));
  await sleep(3000);
  await shot('05-after-signin');
  console.log('=== post-signin view ===');
  console.log(JSON.stringify(await ev(`(() => ({
    dashVisible: !document.getElementById('dashboard').classList.contains('hidden'),
    stats: [document.getElementById('statMonth')?.textContent, document.getElementById('statValue')?.textContent, document.getElementById('statOpen')?.textContent],
    profileName: document.getElementById('profileName')?.textContent,
    profileEmail: document.getElementById('profileEmail')?.textContent,
    quoteNo: document.getElementById('quoteNo')?.value,
    rows: document.querySelectorAll('.dash-row').length,
  }))()`), null, 1));
}
