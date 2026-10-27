/* ═══════════════ cloud.js — Clerk auth + Convex sync (ESM) ═══════════════
   Loaded as a module AFTER app.js (classic). Exposes window.Cloud.
   Print/preview modes (?print=1 / ?preview=1) never touch the cloud.      */
import { ConvexClient } from './vendor/convex.browser.mjs';

const CLERK_PK = 'pk_test_bXV0dWFsLWNvcmFsLTM1LmNsZXJrLmFjY291bnRzLmRldiQ';
const CONVEX_URL = 'https://careful-badger-891.convex.cloud';
const META_KEY = 'livora-cloud-meta';

// Function references — Convex accepts the plain string name form
// ("quotes:saveQuote"). Hand-built {__type} objects are rejected
// (they lack the internal functionName/toReferencePath symbols).
const api = {
  company: { ensureCompany: 'company:ensureCompany' },
  catalog: {
    getCatalog: 'catalog:getCatalog',
    saveCatalog: 'catalog:saveCatalog',
  },
  quotes: {
    listQuotes: 'quotes:listQuotes',
    getQuote: 'quotes:getQuote',
    saveQuote: 'quotes:saveQuote',
    updateStatus: 'quotes:updateStatus',
    deleteQuote: 'quotes:deleteQuote',
    listDeletedQuotes: 'quotes:listDeletedQuotes',
    restoreQuote: 'quotes:restoreQuote',
    listQuoteVersions: 'quotes:listQuoteVersions',
    restoreQuoteVersion: 'quotes:restoreQuoteVersion',
    getStats: 'quotes:getStats',
  },
  clients: {
    listClients: 'clients:listClients',
    saveClient: 'clients:saveClient',
    deleteClient: 'clients:deleteClient',
    archiveClient: 'clients:archiveClient',
    unarchiveClient: 'clients:unarchiveClient',
  },
};

const Cloud = {
  ready: false,
  signedIn: false,
  companyId: null,
  catalog: null, // {items, services, materials, terms}
  _client: null,
  _timer: null,
  _syncedAt: 0,
  _dirty: false,
  _pushPromise: null,
  _pushQueued: false,
  _changeSeq: 0,
  _syncStatus: 'local',
  _conflictSuppressedId: null,
  _networkBound: false,

  bind(hooks) { this._hooks = hooks; },

  setSyncStatus(status) {
    this._syncStatus = status;
    window.dispatchEvent(new CustomEvent('cloudstatus', { detail: status }));
  },

  meta() { try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch { return {}; } },
  saveMeta(m) { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { } },

  async init() {
    const qp = new URLSearchParams(location.search);
    if (qp.get('print') || qp.get('preview')) return; // print/preview: local-only, no gate
    if (!this._networkBound) {
      window.addEventListener('offline', () => this.setSyncStatus('offline'));
      window.addEventListener('online', () => {
        if (this._dirty) {
          this.setSyncStatus('saving');
          this.pushQuote();
        } else this.setSyncStatus('saved');
      });
      this._networkBound = true;
    }
    this._client = new ConvexClient(CONVEX_URL);
    try {
      if (!window.Clerk) throw new Error('Clerk SDK failed to load (offline?)');
      // publishable key comes from the script tag's data attribute.
      // Sign-in UI is our own T3-style form (email OTP + Google OAuth) —
      // the classic mountSignIn widget failed to load its UI chunks in
      // this vendored setup, so we drive Clerk's core SDK directly.
      await window.Clerk.load();
      // OAuth return trip: Google redirects back to this same URL with
      // __clerk_* params. Complete the flow so the session is created and
      // the auth listener fires (instead of the params sitting unhandled).
      try {
        if (new URLSearchParams(location.search).has('__clerk_status')) {
          await window.Clerk.handleRedirectCallback();
        }
      } catch (e) { console.error('oauth callback', e); }
      window.Clerk.addListener(({ user, session }) => {
        if (session) this.onSignIn(session);
        else this.onSignOut();
      });
      if (window.Clerk.session) this.onSignIn(window.Clerk.session);
      else this.onSignOut();
    } catch (e) {
      console.error('cloud init', e);
      // can't reach the auth SDK — still gate the app, show a retry hint
      const ov = document.getElementById('loginOverlay');
      if (ov) {
        ov.classList.remove('hidden');
        const msg = document.getElementById('loginMsg');
        if (msg) msg.textContent = 'Can’t reach the login service. Check your connection and reload.';
      }
    }
  },

  onSignOut() {
    const wasSignedIn = this.signedIn;
    this.signedIn = false;
    // Only a genuine sign-out (was signed in) clears the in-flight OTP flow.
    // Clerk fires auth events (session:null) while a sign-in is being
    // prepared — wiping _signIn there is what caused "Start with your email
    // first" at the OTP step.
    if (wasSignedIn) {
      this._mode = null;
      this._signIn = null;
      this._signUp = null;
      const h = this._hooks || window.AppHooks;
      if (h && h.resetLocalForSignedOut) h.resetLocalForSignedOut();
    }
    const ov = document.getElementById('loginOverlay');
    if (!ov) return;
    ov.classList.remove('hidden');
    if (wasSignedIn) {
      showLoginStep('email');
      const msg = document.getElementById('loginMsg');
      if (msg) msg.textContent = '';
      const msg2 = document.getElementById('loginMsg2');
      if (msg2) msg2.textContent = '';
    }
  },

  // Email-OTP sign-in (Clerk core SDK, passwordless):
  // 1) create a sign-in with the email → Clerk emails a one-time code.
  //    Unknown email? Auto-create the account (passwordless sign-up) — same
  //    one-time-code flow, so the very first login just works.
  async signInWithEmail(email) {
    if (!window.Clerk) throw new Error('Login service unavailable');
    try {
      this._signIn = await window.Clerk.client.signIn.create({ identifier: email });
      // The email_code factor needs its emailAddressId — the API rejects a
      // bare {strategy:'email_code'} with "email_address_id is required".
      const factor = (this._signIn.supportedFirstFactors || [])
        .find((f) => f.strategy === 'email_code');
      await this._signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: factor && factor.emailAddressId,
      });
      this._mode = 'signin';
    } catch (e) {
      if (e && (e.code === 'not_found' || /not found|couldn'?t find/i.test(e.message || ''))) {
        this._signUp = await window.Clerk.client.signUp.create({
          strategy: 'email_code',
          emailAddress: email,
        });
        this._mode = 'signup';
      } else throw e;
    }
    return true;
  },

  // Google OAuth sign-in via Clerk's core SDK — redirect flow.
  // The strategy must be passed to authenticateWithRedirect itself (the SDK
  // creates the sign-in internally with {strategy, redirectUrl}); passing it
  // only to a separate signIn.create() makes the redirect step re-create the
  // sign-in WITHOUT a strategy → "Response: 0 not supported yet".
  async signInWithGoogle() {
    if (!window.Clerk) throw new Error('Login service unavailable');
    const signIn = window.Clerk.client.signIn; // fresh sign-in resource
    await signIn.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: window.location.href,
      redirectUrlComplete: window.location.href,
    });
    // On return from Google, init() calls Clerk.handleRedirectCallback() to
    // complete the flow (see Cloud.init).
  },

  // 2) verify the code → session starts → transition to the app.
  async verifyCode(code) {
    const codeStr = String(code).trim();
    let res;
    if (this._mode === 'signup') {
      let su = this._signUp;
      if (!su && window.Clerk && window.Clerk.client) su = window.Clerk.client.signUp;
      if (!su) throw new Error('Start with your email first');
      try {
        res = await su.attemptVerification({ strategy: 'email_code', code: codeStr });
      } catch (e) {
        res = await su.attemptEmailAddressVerification({ code: codeStr });
      }
      if (!res || (res.status !== 'complete' && res.status !== 'verified')) return false;
    } else {
      let si = this._signIn;
      // Recovery: a spurious auth event can wipe our reference mid-flow;
      // Clerk's client still holds the in-progress sign-in.
      if (!si && window.Clerk && window.Clerk.client) si = window.Clerk.client.signIn;
      if (!si) throw new Error('Start with your email first');
      // The API rejects a bare {code} with "strategy must be included." —
      // attemptFirstFactor forwards its whole params object to the backend.
      res = await si.attemptFirstFactor({ strategy: 'email_code', code: codeStr });
      if (!res || res.status !== 'complete') return false;
    }
    const session = await this._waitForSession(6000);
    if (session) this.onSignIn(session);
    else location.reload(); // session persisted in cookies — reload restores it
    return true;
  },

  async _waitForSession(timeout) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const s = window.Clerk && window.Clerk.session;
      if (s) return s;
      await new Promise((r) => setTimeout(r, 200));
    }
    return null;
  },

  async onSignIn(session) {
    if (this.signedIn && this.ready) return; // already synced (e.g. late auth event)
    this.signedIn = true;
    const ov = document.getElementById('loginOverlay');
    if (ov) ov.classList.add('hidden');
    this._client.setAuth(() => this.getConvexToken());
    const meta = this.meta();
    try {
      const h = this._hooks || window.AppHooks;
      const res = await this._client.mutation(api.company.ensureCompany, {
        name: 'LIVORA Interiors',
        slug: 'livora',
        seed: h.seed(),
      });
      this.companyId = res.companyId;
      this.catalog = res.catalog;
      // If the server has no catalog yet (first login / empty doc), seed it
      // with the built-in defaults — the "hardcoded" items become editable.
      const emptyCat = !res.catalog ||
        !(res.catalog.items?.length || res.catalog.services?.length ||
          res.catalog.materials?.length || res.catalog.terms?.length);
      if (emptyCat) {
        const src = (h.catalogSnapshot ? h.catalogSnapshot() : h.seed());
        try {
          this.catalog = await this._client.mutation(api.catalog.saveCatalog, {
            items: src.items || [], services: src.services || [],
            materials: src.materials || [], terms: src.terms || [],
          });
          window.dispatchEvent(new CustomEvent('cloudcatalog'));
        } catch (e) { console.error('seed catalog', e); this.setError(e); }
      }
      // Initial sync: if the cloud has a NEWER version of the current quote,
      // adopt it (another device edited it). Otherwise push local (migration).
      const cur = h.payload();
      if (cur.id) {
        const doc = await this._client.query(api.quotes.getQuote, { id: cur.id });
        if (doc) { h.applyQuote(doc); this._syncedAt = doc.updatedAt; }
      } else {
        // One-time migration for drafts created before cloudId existed. Only
        // trust a matching visible number when local metadata proves it was
        // previously synced; otherwise push and let the server assign the
        // official number on first save.
        const history = await this._client.query(api.quotes.listQuotes, {});
        const list = history.quotes || history;
        const same = meta.syncedAt && list.find((q) => q.quoteNo === cur.quoteNo);
        if (same) {
          const doc = await this._client.query(api.quotes.getQuote, { id: same.id });
          if (doc) { h.applyQuote(doc); this._syncedAt = doc.updatedAt; }
        } else {
          await this.pushQuote();
        }
      }
      this.saveMeta({ syncedAt: this._syncedAt });
    } catch (e) {
      console.error('cloud init', e);
      this.setError(e);
    }
    this.ready = true;
    window.dispatchEvent(new CustomEvent('cloudready'));
  },

  // Called by app.js save() — debounced push keeps typing instant.
  markDirty() {
    this._dirty = true;
    this._changeSeq += 1;
    if (this._pushPromise) this._pushQueued = true;
    if (!this.signedIn || !this.companyId) this.setSyncStatus('local');
    else this.setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saving');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.pushQuote(), 1200);
  },

  async pushQuote() {
    if (this._pushPromise) return this._pushPromise;
    const run = async () => {
      if (!this.signedIn || !this.companyId) { this._dirty = false; this.setSyncStatus('local'); return; }
      const h = this._hooks || window.AppHooks;
      if (!h) { this._dirty = false; this.setSyncStatus('local'); return; }
      const payload = h.payload();
      // never create a cloud doc for a truly empty draft (fresh open, nothing typed)
      if (!payload.sections.length && !payload.customer.name && !payload.finalCharge) { this._dirty = false; this.setSyncStatus('local'); return; }
      if (!payload.quoteNo) { this._dirty = false; this.setSyncStatus('local'); return; }
      const saveSeq = this._changeSeq;
      this.setSyncStatus('saving');
      try {
        const result = await this._client.mutation(api.quotes.saveQuote, payload);
        if (h.recordSaved) h.recordSaved(result);
        this._syncedAt = result.updatedAt;
        this._dirty = this._changeSeq !== saveSeq;
        this.saveMeta({ syncedAt: result.updatedAt });
        this.setError(null);
        this.setSyncStatus('saved');
      } catch (e) {
        const data = e && e.data;
        if (data && typeof data === 'object' && data.code === 'QUOTE_CONFLICT') {
          // Once the user dismisses the dialog, keep editing locally without
          // reopening the same popup on every autosave.
          this._dirty = false;
          this.setError(null);
          this.setSyncStatus('attention');
          if (this._conflictSuppressedId === data.id) return;
          window.dispatchEvent(new CustomEvent('cloudconflict', { detail: data }));
          return;
        }
        this._dirty = true; // retried on the next save / online
        this.setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'attention');
        this.setError(e);
      }
    };
    this._pushPromise = run();
    try { return await this._pushPromise; }
    finally {
      this._pushPromise = null;
      if (this._pushQueued && this._dirty && this._syncStatus !== 'attention' && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
        this._pushQueued = false;
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this.pushQuote(), 0);
      } else this._pushQueued = false;
    }
  },

  // Surface sync failures visibly (dashboard banner) instead of failing silently.
  setError(e) {
    this._lastError = e ? (e.message || String(e)) : null;
    if (e) this.setSyncStatus('attention');
    window.dispatchEvent(new CustomEvent('clouderror', { detail: this._lastError }));
  },

  lastError() { return this._lastError; },

  // The Convex auth token: Clerk session → JWT with the 'convex' template.
  // Returns null when there's no session; surfaces WHY when it fails, so
  // token problems are visible instead of silent "Sign in required" errors.
  async getConvexToken() {
    const s = window.Clerk && window.Clerk.session;
    if (!s) return null;
    try {
      const t = await s.getToken({ template: 'convex' });
      if (!t) {
        this.setError('Clerk returned no Convex token — is a JWT template named "convex" created in the Clerk dashboard? (Clerk → JWT Templates)');
        return null;
      }
      // Decode the claims (aud is not secret — it's what Convex checks).
      try {
        const claims = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        console.log('[convex token] aud =', claims.aud, '| iss =', claims.iss);
        if (claims.aud && claims.aud !== 'convex') {
          this.setError('Convex token audience is "' + claims.aud + '" but Convex expects "convex" — check the "convex" JWT template audience in the Clerk dashboard.');
        }
      } catch (_) { /* non-JWT or undecodable — let Convex decide */ }
      return t;
    } catch (e) {
      this.setError('Clerk token error: ' + (e && e.message ? e.message : String(e)) + ' — is a JWT template named "convex" created in the Clerk dashboard?');
      return null;
    }
  },

  // Paginated quote history — {quotes, nextCursor, done}. `search` filters
  // by customer name / quote number across the whole history.
  async loadQuotes({ cursor = null, search = '', status = '', clientId = null } = {}) {
    if (!this.signedIn) return { quotes: [], nextCursor: null, done: true };
    try {
      const res = await this._client.query(api.quotes.listQuotes, {
        ...(cursor ? { cursor } : {}), search, ...(status ? { status } : {}),
        ...(clientId ? { clientId } : {}),
      });
      return { quotes: res.quotes, nextCursor: res.nextCursor, done: res.done };
    } catch (e) { this.setError(e); return { quotes: [], nextCursor: null, done: true, error: e }; }
  },

  // First page of history as a plain array (continue-last, migrations).
  async loadHistory() {
    const res = await this.loadQuotes();
    if (res.error) throw res.error;
    return res.quotes;
  },

  async loadDeletedQuotes({ cursor = null, search = '' } = {}) {
    if (!this.signedIn) return { quotes: [], nextCursor: null, done: true };
    try {
      const res = await this._client.query(api.quotes.listDeletedQuotes, {
        ...(cursor ? { cursor } : {}), search,
      });
      return { quotes: res.quotes, nextCursor: res.nextCursor, done: res.done };
    } catch (e) { this.setError(e); return { quotes: [], nextCursor: null, done: true, error: e }; }
  },

  async restoreQuote(id) {
    return this._client.mutation(api.quotes.restoreQuote, { id });
  },

  async loadQuoteVersions(quoteId, cursor = null) {
    if (!this.signedIn) return { versions: [], nextCursor: null, done: true };
    try {
      return await this._client.query(api.quotes.listQuoteVersions, {
        quoteId, ...(cursor ? { cursor } : {}),
      });
    } catch (e) { this.setError(e); return { versions: [], nextCursor: null, done: true, error: e }; }
  },

  async restoreQuoteVersion(quoteId, version) {
    return this._client.mutation(api.quotes.restoreQuoteVersion, { quoteId, version });
  },

  // Dashboard stats (computed server-side over ALL quotes).
  async loadStats(month) {
    if (!this.signedIn) return { monthCount: 0, monthValue: 0, openCount: 0 };
    try { return await this._client.query(api.quotes.getStats, { month }); }
    catch (e) { this.setError(e); return { monthCount: 0, monthValue: 0, openCount: 0, error: e }; }
  },

  // Fetch one quote doc (ownership-checked) — used by conflict resolution.
  async getQuote(id) {
    if (!this.signedIn) return null;
    return this._client.query(api.quotes.getQuote, { id });
  },

  // Client book (Clients page) — paginated, with server-side search.
  async loadClients({ cursor = null, search = '', archivedOnly = false } = {}) {
    if (!this.signedIn) return { clients: [], nextCursor: null, done: true };
    try {
      const res = await this._client.query(api.clients.listClients, {
        ...(cursor ? { cursor } : {}), search, archivedOnly,
      });
      return { clients: res.clients, nextCursor: res.nextCursor, done: res.done };
    } catch (e) { this.setError(e); return { clients: [], nextCursor: null, done: true, error: e }; }
  },

  // Manual client add/update (Clients page)
  async saveClient(client) {
    const res = await this._client.mutation(api.clients.saveClient, client);
    return res;
  },

  // Remove a client
  async deleteClient(id) {
    await this._client.mutation(api.clients.deleteClient, { id });
  },

  async openQuote(id, persist = true) {
    const doc = await this.getQuote(id);
    if (doc) (this._hooks || window.AppHooks).applyQuote(doc, persist);
    return !!doc;
  },

  async deleteQuote(id) {
    await this._client.mutation(api.quotes.deleteQuote, { id });
  },

  async updateQuoteStatus(id, status) {
    return this._client.mutation(api.quotes.updateStatus, { id, status });
  },

  async unarchiveClient(id) {
    await this._client.mutation(api.clients.unarchiveClient, { id });
  },

  async archiveClient(id) {
    await this._client.mutation(api.clients.archiveClient, { id });
  },

  async saveCatalog(cat) {
    const res = await this._client.mutation(api.catalog.saveCatalog, cat);
    this.catalog = res;
    window.dispatchEvent(new CustomEvent('cloudcatalog'));
    return res;
  },
};

window.Cloud = Cloud;
Cloud.init();
