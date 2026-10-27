/* Phase 1: boot, login flow validation, sign-in */
export async function run({ cdp, S, ev, nav, shot, logs, sleep }) {
  // desktop-ish viewport
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, S);
  await nav('http://localhost:8130/');
  await sleep(2500); // Clerk SDK boot

  console.log('=== BOOT STATE ===');
  console.log(JSON.stringify(await ev(`(() => {
    const ov = document.getElementById('loginOverlay');
    const msg = document.getElementById('loginMsg');
    return {
      clerkLoaded: !!window.Clerk,
      cloudDefined: !!window.Cloud,
      signedIn: !!(window.Cloud && window.Cloud.signedIn),
      overlayPresent: !!ov,
      overlayHidden: ov ? ov.classList.contains('hidden') : null,
      loginMsg: msg ? msg.textContent : null,
      shellVisible: !document.getElementById('shell').closest('html'),
    };
  })()`), null, 1));

  // UX probe: is anything focusable/announced for screen readers on the login card?
  console.log('=== LOGIN A11Y SNAPSHOT ===');
  console.log(JSON.stringify(await ev(`(() => {
    const card = document.querySelector('.login-card');
    const inputs = [...card.querySelectorAll('input')].map(i => ({
      id: i.id, type: i.type, hasLabel: !!i.labels?.length, ariaLabel: i.getAttribute('aria-label'), placeholder: i.placeholder
    }));
    const btns = [...card.querySelectorAll('button')].map(b => b.textContent.trim().slice(0, 30));
    return { inputs, btns };
  })()`), null, 1));

  await shot('01-login-initial');

  // Test 1: empty email submit
  console.log('=== TEST 1: empty email ===');
  console.log(await ev(`document.querySelector('[data-action="login-send-code"]').click(); 'clicked'`));
  await sleep(400);
  console.log('message:', JSON.stringify(await ev(`document.getElementById('loginMsg').textContent`)));

  // Test 2: invalid email
  console.log('=== TEST 2: invalid email ===');
  await ev(`(() => { const e = document.getElementById('loginEmail'); e.value = 'not-an-email'; e.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await ev(`document.querySelector('[data-action="login-send-code"]').click(); 'ok'`);
  await sleep(400);
  console.log('message:', JSON.stringify(await ev(`document.getElementById('loginMsg').textContent`)));

  // Test 3: Enter key submits too?
  console.log('=== TEST 3: Enter key on email field ===');
  await ev(`(() => { const e = document.getElementById('loginEmail'); e.value = ''; e.dispatchEvent(new Event('input',{bubbles:true})); e.focus(); })()`);
  await ev(`(() => { const e = document.getElementById('loginEmail'); e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);
  await sleep(300);
  console.log('message after Enter w/ empty field:', JSON.stringify(await ev(`document.getElementById('loginMsg').textContent`)));

  // Test 4: real sign-in with Clerk dev test address
  console.log('=== TEST 4: sign-in with +clerk_test address ===');
  const EMAIL = 'livora.qa+clerk_test@gmail.com';
  await ev(`(() => { const e = document.getElementById('loginEmail'); e.value = '${EMAIL}'; e.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  console.log(await ev(`document.querySelector('[data-action="login-send-code"]').click(); 'ok'`));
  await sleep(5000);
  const st1 = await ev(`(() => {
    const s1 = document.getElementById('loginStepEmail'), s2 = document.getElementById('loginStepCode');
    return {
      emailStepHidden: s1?.classList.contains('hidden'),
      codeStepHidden: s2?.classList.contains('hidden'),
      msg: document.getElementById('loginMsg')?.textContent,
      msg2: document.getElementById('loginMsg2')?.textContent,
      signedIn: !!(window.Cloud && window.Cloud.signedIn),
      overlayHidden: document.getElementById('loginOverlay')?.classList.contains('hidden'),
    };
  })()`);
  console.log(JSON.stringify(st1, null, 1));
  await shot('02-after-email-submit');

  // If we landed on the code step, the +clerk_test trick did NOT bypass OTP.
  if (st1 && st1.codeStepHidden === false) {
    console.log('>>> OTP step shown; trying 000000 / any-code behavior not possible without inbox.');
    // try submitting a dummy code to observe error handling
    await ev(`(() => { const c = document.getElementById('loginCode'); c.value = '000000'; c.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await ev(`document.querySelector('[data-action="login-verify"]').click(); 'ok'`);
    await sleep(4000);
    console.log('after dummy code:', JSON.stringify(await ev(`(() => ({
      msg2: document.getElementById('loginMsg2')?.textContent,
      signedIn: !!(window.Cloud && window.Cloud.signedIn),
    }))()`), null, 1));
    await shot('03-dummy-otp-result');
  }

  console.log('=== CONSOLE LOGS SO FAR ===');
  logs.forEach(l => console.log(l));
}
