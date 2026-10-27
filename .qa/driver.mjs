/* CDP driver v2 — attach to an EXISTING tab (Arc) or create one; port via argv */
const PORT = parseInt(process.env.CDP_PORT || '9223', 10);

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); }
  static connect() {
    return new Promise(async (resolve, reject) => {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(r => r.json());
      const ws = new WebSocket(list.webSocketDebuggerUrl);
      const cdp = new CDP(ws);
      ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.id && cdp.pending.has(msg.id)) {
          const { res, rej } = cdp.pending.get(msg.id);
          cdp.pending.delete(msg.id);
          msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
        } else if (msg.method) {
          const cb = cdp.onEvent;
          if (cb) cb(msg);
        }
      };
      ws.onopen = () => resolve(cdp);
      ws.onerror = reject;
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const cdp = await CDP.connect();
  let targetId = process.env.TARGET_ID || null;
  if (!targetId) {
    const r = await cdp.send('Target.createTarget', { url: 'about:blank' });
    targetId = r.targetId;
  }
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const S = sessionId;

  const logs = [];
  cdp.onEvent = msg => {
    if (msg.sessionId !== S) return;
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ');
      logs.push(`[console.${msg.params.type}] ${text.slice(0, 300)}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      logs.push(`[EXCEPTION] ${(d.exception?.description || d.text).slice(0, 300)}`);
    } else if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry;
      if (e.level === 'error') logs.push(`[${e.level}] ${e.text.slice(0, 220)} ${e.url || ''}`);
    }
  };
  await cdp.send('Runtime.enable', {}, S);
  await cdp.send('Log.enable', {}, S);
  await cdp.send('Page.enable', {}, S);

  const ev = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, S);
    if (r.exceptionDetails) return { __err: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
    return r.result.value;
  };
  const nav = async (url) => { await cdp.send('Page.navigate', { url }, S); await sleep(3500); };
  const shot = async (name) => {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' }, S);
    const fs = await import('fs');
    fs.writeFileSync(`C:/Users/motam/Desktop/Github/livora quotation/.worktrees/accounts/.qa/shots/${name}.png`, Buffer.from(r.data, 'base64'));
    return name;
  };

  global.__ctx = { cdp, S, ev, nav, shot, logs, sleep };
  const mod = await import(`file:///${process.argv[3].replace(/\\/g, '/')}`);
  await mod.run(global.__ctx);
  console.log('PHASE_DONE');
  try { cdp.ws.close(); } catch {}
}
main().catch(e => { console.error('DRIVER_FAIL', e); process.exit(1); });
