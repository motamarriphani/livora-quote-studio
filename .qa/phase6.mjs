/* Phase 6: diagnose why the signup verification never goes out */
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run({ ev, nav }) {
  await nav('http://localhost:8130/');
  await sleep(2500);
  const addr = `livora.qa.${Date.now() % 100000}@westcast-systems.com`;
  await ev(`(() => { const e = document.getElementById('loginEmail'); e.value = '${addr}'; e.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await ev(`document.querySelector('[data-action="login-send-code"]').click(); 'ok'`);
  await sleep(6000);

  // full signUp introspection
  console.log('signUp state:', JSON.stringify(await ev(`(() => {
    const su = window.Clerk?.client?.signUp;
    if (!su) return null;
    return {
      status: su.status,
      requiredFields: su.requiredFields,
      optionalFields: su.optionalFields,
      missingFields: su.missingFields,
      unupdatedFields: su.unupdatedFields,
      verifications: su.verifications ? JSON.parse(JSON.stringify(su.verifications)) : null,
      emailAddress: su.emailAddress,
    };
  })()`), null, 1));

  // try to prepare verification manually and capture the exact error
  console.log('prepare attempt:', JSON.stringify(await ev(`(async () => {
    const su = window.Clerk?.client?.signUp;
    if (!su) return { err: 'no signUp resource' };
    try {
      const r = await su.prepareEmailAddressVerification({ strategy: 'email_code' });
      return { ok: true, status: r?.status, verifications: r?.verifications ? JSON.parse(JSON.stringify(r.verifications)) : null };
    } catch (e) {
      return { err: e.message, code: e.code, errors: e.errors ? e.errors.map(x => ({ code: x.code, longMessage: x.longMessage, meta: x.meta })) : null };
    }
  })()`), null, 1));
}
