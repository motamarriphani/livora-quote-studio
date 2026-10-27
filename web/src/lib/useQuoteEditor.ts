// One quote being edited. Online-only: the cloud copy is the truth; local
// state is just what's on screen. Edits autosave ~1s after typing stops.
//
// Each editor instance owns its quote, so a pending save can never land on a
// different quote (the old app's shared global state could). Leaving the
// page flushes any pending save for THIS quote first.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useConvex, useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '../../../convex/_generated/api';
import type { ClientId, Customer, Quote, QuoteId } from './types';
import { copyAsNew, newQuote } from './defaults';
import { fromDoc, isWorthSaving, toPayload } from './convert';

export type SaveState = 'new' | 'unsaved' | 'saving' | 'saved' | 'error' | 'conflict';
export type NewQuoteSeed = { customer?: Customer; clientId?: ClientId | null; from?: string };

const DEBOUNCE_MS = 1000;

export function useQuoteEditor(routeId: string, seed: NewQuoteSeed) {
  const convex = useConvex();
  const saveQuote = useMutation(api.quotes.saveQuote);
  const navigate = useNavigate();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('new');
  const [loadError, setLoadError] = useState<string | null>(null);

  const ref = useRef<Quote | null>(null);
  const dirty = useRef(false);
  const inflight = useRef<Promise<void> | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const mounted = useRef(true);
  const stateRef = useRef<SaveState>('new');
  const setState = (s: SaveState) => { stateRef.current = s; if (mounted.current) setSaveState(s); };

  const apply = useCallback((q: Quote) => {
    ref.current = q;
    if (mounted.current) setQuote(q);
  }, []);

  /* ── load ── */
  useEffect(() => {
    // Our own new quote just received its id and the URL caught up — keep editing.
    if (ref.current?.id && ref.current.id === routeId) return;
    let live = true;
    setLoadError(null);
    (async () => {
      try {
        let q: Quote;
        if (routeId === 'new') {
          if (seed.from) {
            const doc = await convex.query(api.quotes.getQuote, { id: seed.from as QuoteId });
            if (!doc) throw new Error('The quote to copy no longer exists.');
            q = copyAsNew(fromDoc(doc));
          } else {
            const catalog = await convex.query(api.catalog.getCatalog, {});
            q = newQuote(catalog, seed.customer, seed.clientId ?? null);
          }
        } else {
          const doc = await convex.query(api.quotes.getQuote, { id: routeId as QuoteId });
          if (!doc) throw new Error('This quote was deleted or does not exist.');
          q = fromDoc(doc);
        }
        if (!live) return;
        dirty.current = false;
        apply(q);
        setState(q.id ? 'saved' : 'new');
      } catch (e) {
        if (live) setLoadError(e instanceof Error && !(e instanceof ConvexError) ? e.message : 'Could not open this quote.');
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, seed.from]);

  /* ── save ── */
  const flush = useCallback(async (opts: { book?: boolean } = {}): Promise<Quote | null> => {
    window.clearTimeout(timer.current);
    while (inflight.current) await inflight.current;
    const q = ref.current;
    if (!q || stateRef.current === 'conflict') return q;
    // Booking adds a typed-in customer to the client book (only at explicit
    // moments like preview/download — never while the name is being typed).
    const book = !!opts.book && !q.clientId && !!q.customer.name.trim();
    if (!dirty.current && !book) return q;
    if (!isWorthSaving(q)) {
      dirty.current = false;
      setState('new');
      return q;
    }
    dirty.current = false;
    setState('saving');
    const run = (async () => {
      try {
        const res = await saveQuote(toPayload(q, book));
        const cur = ref.current!;
        apply({ ...cur, id: res.id, version: res.version, quoteNo: res.quoteNo, clientId: res.clientId ?? cur.clientId });
        if (!q.id && mounted.current) navigate(`/quotes/${res.id}${location.pathname.endsWith('/preview') ? '/preview' : ''}`, { replace: true });
        setState(dirty.current ? 'unsaved' : 'saved');
      } catch (e) {
        if (e instanceof ConvexError && (e.data as { code?: string })?.code === 'QUOTE_CONFLICT') {
          setState('conflict');
        } else {
          console.error(e);
          dirty.current = true;
          setState('error');
        }
      }
    })();
    inflight.current = run;
    try { await run; } finally { inflight.current = null; }
    if (dirty.current && stateRef.current === 'unsaved') schedule();
    return ref.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveQuote, navigate, apply]);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(); }, DEBOUNCE_MS);
  }, [flush]);

  /** Change the quote. Every edit goes through here. */
  const update = useCallback((fn: (q: Quote) => Quote) => {
    const cur = ref.current;
    if (!cur) return;
    apply(fn(cur));
    dirty.current = true;
    if (stateRef.current !== 'conflict') {
      setState('unsaved');
      schedule();
    }
  }, [apply, schedule]);

  /* ── leaving: save what's pending, warn on tab close ── */
  useEffect(() => {
    mounted.current = true;
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || inflight.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      mounted.current = false;
      if (dirty.current) void flush();
    };
  }, [flush]);

  /* ── conflict resolution ── */
  const reloadFromCloud = useCallback(async () => {
    const id = ref.current?.id;
    if (!id) return;
    const doc = await convex.query(api.quotes.getQuote, { id });
    if (!doc) { setLoadError('This quote was deleted on another device.'); return; }
    dirty.current = false;
    apply(fromDoc(doc));
    setState('saved');
  }, [convex, apply]);

  const keepMineAsCopy = useCallback(async () => {
    const cur = ref.current;
    if (!cur) return;
    apply({ ...cur, id: null, version: 0, quoteNo: '', status: 'draft' });
    dirty.current = true;
    setState('unsaved');
    await flush();
  }, [apply, flush]);

  return { quote, saveState, loadError, update, flush, reloadFromCloud, keepMineAsCopy, reload: reloadFromCloud };
}
