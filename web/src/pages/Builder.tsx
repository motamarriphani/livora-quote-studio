import { createContext, useContext, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Item, Quote, QuoteId, Section, Status } from '../lib/types';
import { STATUSES } from '../lib/types';
import { ROOM_SUGGESTIONS } from '../lib/defaults';
import { fmt, isExpired, uid } from '../lib/format';
import { itemAmount, sectionTotal, totals } from '../lib/math';
import { useQuoteEditor, type NewQuoteSeed, type SaveState } from '../lib/useQuoteEditor';
import type { ImportInfo } from '../lib/importSheet';
import { NumField } from '../components/fields';
import { ClientPicker } from '../components/ClientPicker';
import { ItemLibrary } from '../components/ItemLibrary';
import { PdfPreview, PreviewScreen } from './Preview';
import { MenuCtx, Modal, StatusChip, useConfirm, useMediaQuery, useToast } from '../ui';
import { Icon } from '../components/Icon';

const SAVE_LABEL: Record<SaveState, string> = {
  new: 'Not saved yet — add an item to save',
  unsaved: 'Unsaved changes…',
  saving: 'Saving…',
  saved: 'All changes saved',
  error: 'Couldn’t save — retrying when you edit again',
  conflict: 'Changed on another device',
};

export function Builder({ preview = false }: { preview?: boolean }) {
  const { id = 'new' } = useParams();
  const [search] = useSearchParams();
  const location = useLocation();
  const seed = useMemo<NewQuoteSeed>(() => ({
    ...(location.state as NewQuoteSeed | null ?? {}),
    from: search.get('from') ?? undefined,
  }), [location.state, search]);
  const editor = useQuoteEditor(id, seed);
  const { quote, update, flush, saveState, loadError } = editor;
  const navigate = useNavigate();
  const toast = useToast();
  const [unlocked, setUnlocked] = useState(false);
  // Set when this quote was just built from a spreadsheet (pages/Import.tsx). Kept in
  // state because the first save replaces the URL (and its history state).
  const [imported, setImported] = useState(() => {
    const s = location.state as { importInfo?: ImportInfo; importFlags?: Record<string, string> } | null;
    return s?.importInfo ? { info: s.importInfo, flags: s.importFlags ?? {} } : null;
  });
  const del = useMutation(api.quotes.deleteQuote);
  // Desk mode: wide screens get the live PDF beside the editor (keep in sync with .builder-desk in app.css).
  const desk = useMediaQuery('(min-width: 1280px)');

  if (loadError) {
    return (
      <div className="load-error page-error">
        <b>{loadError}</b>
        <Link className="btn ghost" to="/">Back to quotes</Link>
      </div>
    );
  }
  if (!quote) return <div className="boot">Opening quote…</div>;

  if (preview) {
    return (
      <PreviewScreen
        quote={quote}
        onBack={() => navigate(`/quotes/${quote.id ?? 'new'}`)}
        beforeDownload={() => flush({ book: true })}
        onDownloaded={() => {
          if (quote.status === 'draft') {
            toast({
              message: 'PDF downloaded. Sending it to the client?',
              action: { label: 'Mark as sent', run: () => update((q) => ({ ...q, status: 'sent' })) },
              duration: 12000,
            });
          }
        }}
        toolbar={
          <>
            {quote.status === 'draft' ? (
              <button className="btn ghost" onClick={() => {
                update((q) => ({ ...q, status: 'sent' }));
                toast({ message: `${quote.quoteNo} marked as sent.`, type: 'success' });
              }}>Mark as sent</button>
            ) : (
              <StatusChip status={quote.status} expired={isExpired(quote)} />
            )}
            <label className="check"><input type="checkbox" checked={quote.showDims} onChange={(e) => update((q) => ({ ...q, showDims: e.target.checked }))} /> Dimensions</label>
            <label className="check"><input type="checkbox" checked={quote.showSpec} onChange={(e) => update((q) => ({ ...q, showSpec: e.target.checked }))} /> Specification</label>
          </>
        }
      />
    );
  }

  const locked = quote.status !== 'draft' && !unlocked;
  const editorPane = (
    <section className="app builder">
      <BuilderHead quote={quote} saveState={saveState} onStatus={(status) => update((q) => ({ ...q, status }))} onRestored={editor.reload} />

      {saveState === 'conflict' && (
        <div className="sync-banner">
          <b>This quote was changed on another device.</b>
          Your latest edits weren’t saved over it.
          <div className="banner-actions">
            <button className="btn ghost" onClick={editor.reloadFromCloud}>Load the latest version</button>
            <button className="btn ghost" onClick={editor.keepMineAsCopy}>Save mine as a new quote</button>
          </div>
        </div>
      )}

      {locked && (
        <div className="lock-banner">
          <div>
            <b>This quote is {isExpired(quote) ? 'expired' : quote.status}.</b> Editing it changes the record of what the client received.
          </div>
          <div className="banner-actions">
            <button className="btn primary" onClick={() => navigate(`/quotes/new?from=${quote.id}`)}>Create a revision</button>
            <button className="btn ghost" onClick={() => setUnlocked(true)}>Edit anyway</button>
          </div>
        </div>
      )}

      {imported && (
        <ImportBanner
          info={imported.info}
          onDismiss={() => setImported(null)}
          onUndo={async () => {
            const q = await flush();
            if (q?.id) await del({ id: q.id });
            toast({ message: 'Import undone.', type: 'success' });
            navigate('/import');
          }}
        />
      )}

      <fieldset disabled={locked} className="builder-body">
        <CustomerCard quote={quote} update={update} />
        <DetailsCard quote={quote} update={update} />
        <ImportFlags.Provider value={imported?.flags ?? NO_FLAGS}>
          <Rooms quote={quote} update={update} />
        </ImportFlags.Provider>
        <TermsCard quote={quote} update={update} />
        <div className="bar-spacer" />
      </fieldset>

      <SummaryBar
        quote={quote}
        locked={locked}
        update={update}
        onPreview={async () => {
          const q = await flush({ book: true });
          if (q?.id) navigate(`/quotes/${q.id}/preview`);
          else toast({ message: 'Couldn’t save the quote — check your connection.', type: 'error' });
        }}
      />
    </section>
  );
  if (!desk) return editorPane;
  return (
    <div className="builder-desk">
      {editorPane}
      <aside className="desk-preview" aria-label="Live PDF preview">
        <PdfPreview quote={quote} delay={600} />
      </aside>
    </div>
  );
}

type Update = (fn: (q: Quote) => Quote) => void;

/** Notes on imported items ("rate from rate card"), by item id. */
const NO_FLAGS: Record<string, string> = {};
const ImportFlags = createContext(NO_FLAGS);

function ImportBanner({ info, onUndo, onDismiss }: { info: ImportInfo; onUndo: () => void; onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  const n = info.skipped.length;
  return (
    <div className="import-banner" role="status">
      <div className="import-banner-row">
        <span className="xl-badge">X</span>
        <span className="import-banner-text">
          {info.items} item{info.items === 1 ? '' : 's'} from <b>{info.file}</b>
          {info.filled > 0 && <> · <span className="warn">{info.filled} filled from your rate card</span></>}
          {!!info.terms && <> · {info.terms} terms</>}
          {n > 0 && <> · <span className="bad">{n} row{n === 1 ? '' : 's'} skipped</span></>}
        </span>
        {n > 0 && <button className="btn ghost" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide skipped' : 'Show skipped'}</button>}
        <button className="btn ghost" onClick={onUndo}>Undo import</button>
        <button className="icon-btn" onClick={onDismiss} aria-label="Dismiss"><Icon name="close" /></button>
      </div>
      {open && (
        <div className="import-notes">
          {info.skipped.map((s) => (
            <div key={s.row} className="import-note skipped">
              <span className="import-note-row">R{s.row}</span>
              <span>{s.name ?? '—'} — {s.note?.toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BuilderHead({ quote, saveState, onStatus, onRestored }: {
  quote: Quote; saveState: SaveState; onStatus: (s: Status) => void; onRestored: () => void;
}) {
  const openMenu = useContext(MenuCtx);
  const navigate = useNavigate();
  const [history, setHistory] = useState(false);
  return (
    <header className="builder-head">
      <button className="icon-btn menu-btn" onClick={openMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <div className="head-title-wrap">
        <Link to="/" className="crumb"><Icon name="back" />Quotes</Link>
        <h1 className="head-title">{quote.quoteNo || 'New quote'} {quote.id && <StatusChip status={quote.status} expired={isExpired(quote)} />}</h1>
        <div className={'save-state ' + saveState} role="status" aria-live="polite">
          {saveState === 'new' && quote.sections.some((s) => s.items.length)
            ? 'Not saved yet — saves (and gets a number) when you make a change'
            : SAVE_LABEL[saveState]}
        </div>
      </div>
      {quote.id && (
        <div className="head-actions">
          <select className="field status-pick" value={quote.status} onChange={(e) => onStatus(e.target.value as Status)} aria-label="Quote status">
            {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button className="btn ghost" onClick={() => setHistory(true)}>History</button>
          <button className="btn ghost" onClick={() => navigate(`/quotes/new?from=${quote.id}`)}>Duplicate</button>
        </div>
      )}
      {history && quote.id && <VersionHistory quoteId={quote.id} onClose={() => setHistory(false)} onRestored={onRestored} />}
    </header>
  );
}

function CustomerCard({ quote, update }: { quote: Quote; update: Update }) {
  const c = quote.customer;
  const set = (k: keyof typeof c, v: string) => update((q) => ({ ...q, customer: { ...q.customer, [k]: v } }));
  return (
    <section className="card cust-card">
      <div className="card-label">Customer</div>
      <ClientPicker
        linkedName={quote.clientId ? c.name : null}
        onPick={(cl) => update((q) => ({ ...q, clientId: cl.id, customer: { name: cl.name, phone: cl.phone, address: cl.address } }))}
      />
      {quote.clientId && (
        <div className="linked-note">
          Linked to the client book. Edits here change this quote only.
          <button type="button" className="link-btn" onClick={() => update((q) => ({ ...q, clientId: null }))}>Unlink</button>
        </div>
      )}
      <div className="grid-2">
        <input className="field" placeholder="Customer name" aria-label="Customer name" value={c.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />
        <input className="field" type="tel" inputMode="tel" placeholder="Phone" aria-label="Customer phone" value={c.phone} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <input className="field" placeholder="Address" aria-label="Customer address" value={c.address} onChange={(e) => set('address', e.target.value)} />
    </section>
  );
}

function DetailsCard({ quote, update }: { quote: Quote; update: Update }) {
  return (
    <section className="card">
      <div className="card-label">Quote details</div>
      <div className="grid-3">
        <label className="mini-field">
          <span>Date</span>
          <input className="field" type="date" value={quote.date} onChange={(e) => e.target.value && update((q) => ({ ...q, date: e.target.value }))} />
        </label>
        <label className="mini-field">
          <span>Valid for (days)</span>
          <NumField className="field" label="Validity" min={1} max={365} step="1" value={quote.validityDays} onValue={(n) => n && update((q) => ({ ...q, validityDays: n }))} />
        </label>
        <label className="mini-field">
          <span>Timeline</span>
          <input className="field" placeholder="e.g. 6–8 weeks" value={quote.timeline} onChange={(e) => update((q) => ({ ...q, timeline: e.target.value }))} />
        </label>
      </div>
    </section>
  );
}

function Rooms({ quote, update }: { quote: Quote; update: Update }) {
  const confirm = useConfirm();
  const [libraryFor, setLibraryFor] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const setSection = (id: string, fn: (s: Section) => Section) =>
    update((q) => ({ ...q, sections: q.sections.map((s) => (s.id === id ? fn(s) : s)) }));
  const addRoom = (name: string) => {
    update((q) => ({ ...q, sections: [...q.sections, { id: uid(), name, items: [] }] }));
    setNaming(false);
  };
  const used = new Set(quote.sections.map((s) => s.name.toLowerCase()));
  const target = quote.sections.find((s) => s.id === libraryFor);

  return (
    <>
      {quote.sections.map((sec, i) => (
        <RoomCard
          key={sec.id}
          sec={sec}
          first={i === 0}
          last={i === quote.sections.length - 1}
          onChange={(fn) => setSection(sec.id, fn)}
          onMove={(dir) => update((q) => {
            const s = [...q.sections];
            const j = i + dir;
            [s[i], s[j]] = [s[j], s[i]];
            return { ...q, sections: s };
          })}
          onDelete={async () => {
            if (sec.items.length && !(await confirm({ title: 'Delete room?', message: `Delete “${sec.name}” and its ${sec.items.length} item(s)?`, confirmLabel: 'Delete room', danger: true }))) return;
            update((q) => ({ ...q, sections: q.sections.filter((s) => s.id !== sec.id) }));
          }}
          onAddItems={() => setLibraryFor(sec.id)}
        />
      ))}

      {!quote.sections.length && <div className="cat-empty">Start by adding the rooms you’re quoting for.</div>}

      <div className="add-room">
        {naming ? (
          <form className="add-room-form" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('room')?.toString().trim(); if (v) addRoom(v); }}>
            <input name="room" className="field" placeholder="Room name" autoFocus />
            <button className="btn primary">Add</button>
            <button type="button" className="btn ghost" onClick={() => setNaming(false)}>Cancel</button>
          </form>
        ) : (
          <>
            <div className="room-chips">
              {ROOM_SUGGESTIONS.filter((r) => !used.has(r.toLowerCase())).slice(0, 8).map((r) => (
                <button type="button" key={r} className="cat-tag" onClick={() => addRoom(r)}><Icon name="plus" />{r}</button>
              ))}
              <button type="button" className="cat-tag create" onClick={() => setNaming(true)}><Icon name="plus" />Other room…</button>
            </div>
          </>
        )}
      </div>

      {target && (
        <ItemLibrary
          roomName={target.name}
          onClose={() => setLibraryFor(null)}
          onAdd={(item) => setSection(target.id, (s) => ({ ...s, collapsed: false, items: [...s.items, item] }))}
        />
      )}
    </>
  );
}

function RoomCard({ sec, first, last, onChange, onMove, onDelete, onAddItems }: {
  sec: Section; first: boolean; last: boolean;
  onChange: (fn: (s: Section) => Section) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onAddItems: () => void;
}) {
  const setItem = (id: string, patch: Partial<Item>) =>
    onChange((s) => ({ ...s, items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const flags = useContext(ImportFlags);
  return (
    <div className={'card section-card' + (sec.collapsed ? ' collapsed' : '')}>
      <div className="sec-head">
        <button type="button" className="chev-btn" onClick={() => onChange((s) => ({ ...s, collapsed: !s.collapsed }))} aria-label={sec.collapsed ? 'Expand room' : 'Collapse room'} aria-expanded={!sec.collapsed}>
          <span className="chev"><Icon name="chevron" /></span>
        </button>
        <div className="sec-title">
          <input className="sec-name" value={sec.name} aria-label="Room name" placeholder="Room name" onChange={(e) => onChange((s) => ({ ...s, name: e.target.value }))} />
          <div className="sec-sub">{sec.items.length} item{sec.items.length === 1 ? '' : 's'} · {fmt(sectionTotal(sec))}</div>
        </div>
        <div className="sec-tools">
          <button type="button" className="icon-btn" disabled={first} onClick={() => onMove(-1)} aria-label="Move room up"><Icon name="up" /></button>
          <button type="button" className="icon-btn" disabled={last} onClick={() => onMove(1)} aria-label="Move room down"><Icon name="down" /></button>
          <button type="button" className="icon-btn danger" onClick={onDelete} aria-label="Delete room"><Icon name="trash" /></button>
        </div>
      </div>
      <div className="sec-body">
        {sec.items.map((it) => (
          <div key={it.id} className={'item-row' + (it.lump ? ' lump' : '') + (flags[it.id] ? ' flagged' : '')}>
            <div className="item-top">
              <input className="item-desc" value={it.name} aria-label="Item name" placeholder="Item name" onChange={(e) => setItem(it.id, { name: e.target.value })} />
              <button type="button" className="item-del" aria-label={`Remove ${it.name}`} onClick={() => onChange((s) => ({ ...s, items: s.items.filter((x) => x.id !== it.id) }))}><Icon name="close" /></button>
            </div>
            {flags[it.id] && <div className="item-flag">{flags[it.id]}</div>}
            <div className="item-dims">
              {!it.lump && (
                <>
                  <div className="dim-field"><label>W ft</label><NumField label="Width" step="0.1" max={1000} value={it.w} onValue={(n) => setItem(it.id, { w: n })} /></div>
                  <div className="dim-field"><label>H ft</label><NumField label="Height" step="0.1" max={1000} value={it.h} onValue={(n) => setItem(it.id, { h: n })} /></div>
                </>
              )}
              <div className="dim-field"><label>{it.lump ? 'Amount ₹' : '₹ / sq ft'}</label><NumField label={it.lump ? 'Amount' : 'Rate'} step="1" max={10000000} value={it.rate} onValue={(n) => setItem(it.id, { rate: n ?? 0 })} /></div>
              <div className="item-amount"><span className="amount-box">{fmt(itemAmount(it))}</span></div>
            </div>
          </div>
        ))}
        {!sec.items.length && <div className="empty-note">No items yet.</div>}
        <button type="button" className="add-item-btn" onClick={onAddItems}><Icon name="plus" />Add items</button>
      </div>
    </div>
  );
}

function TermsCard({ quote, update }: { quote: Quote; update: Update }) {
  const catalog = useQuery(api.catalog.getCatalog);
  const confirm = useConfirm();
  const setTerm = (i: number, v: string) => update((q) => ({ ...q, terms: q.terms.map((t, j) => (j === i ? v : t)) }));
  const setSpec = (i: number, k: 'c' | 'd', v: string) => update((q) => ({ ...q, spec: q.spec.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  return (
    <details className="card terms-card">
      <summary>
        <span className="card-label">Terms &amp; specification for this quote</span>
        <span className="summary-sub">{quote.terms.length} terms · {quote.spec.length} specification rows</span>
      </summary>
      <p className="modal-hint">Changes here apply to this quote only. To change the defaults for new quotes, use the Catalog.</p>

      <h3 className="sub-head">Terms</h3>
      {quote.terms.map((t, i) => (
        <div className="term-edit" key={i}>
          <span className="cat-term-n">{i + 1}</span>
          <textarea className="cat-term-input" rows={2} value={t} aria-label={`Term ${i + 1}`} onChange={(e) => setTerm(i, e.target.value)} />
          <button type="button" className="icon-btn danger" aria-label={`Remove term ${i + 1}`} onClick={() => update((q) => ({ ...q, terms: q.terms.filter((_, j) => j !== i) }))}><Icon name="close" /></button>
        </div>
      ))}
      <button type="button" className="add-item-btn" onClick={() => update((q) => ({ ...q, terms: [...q.terms, ''] }))}><Icon name="plus" />Add term</button>
      <p className="modal-hint">GST, validity and timeline lines are added automatically on the PDF.</p>

      <h3 className="sub-head">Material specification</h3>
      {quote.spec.map((s, i) => (
        <div className="spec-edit" key={i}>
          <input className="field" value={s.c} placeholder="Category" aria-label={`Specification ${i + 1} category`} onChange={(e) => setSpec(i, 'c', e.target.value)} />
          <textarea className="field" rows={2} value={s.d} placeholder="Details" aria-label={`Specification ${i + 1} details`} onChange={(e) => setSpec(i, 'd', e.target.value)} />
          <button type="button" className="icon-btn danger" aria-label={`Remove specification ${i + 1}`} onClick={() => update((q) => ({ ...q, spec: q.spec.filter((_, j) => j !== i) }))}><Icon name="close" /></button>
        </div>
      ))}
      <button type="button" className="add-item-btn" onClick={() => update((q) => ({ ...q, spec: [...q.spec, { c: '', d: '' }] }))}><Icon name="plus" />Add specification row</button>

      <button
        type="button"
        className="btn ghost full"
        disabled={!catalog}
        onClick={async () => {
          if (!catalog || !(await confirm({ title: 'Reset terms & specification?', message: 'Replace this quote’s terms and specification with your catalog defaults.', confirmLabel: 'Reset' }))) return;
          update((q) => ({ ...q, terms: [...catalog.terms], spec: catalog.materials.map((x) => ({ ...x })) }));
        }}
      >Reset to catalog defaults</button>
    </details>
  );
}

function SummaryBar({ quote, locked, update, onPreview }: { quote: Quote; locked: boolean; update: Update; onPreview: () => void }) {
  const t = totals(quote.sections, quote.finalCharge, quote.gst);
  const pct = t.total ? Math.round((t.discount / t.total) * 1000) / 10 : 0;
  return (
    <div className="sum-bar">
      <div className="sum-top">
        <div className="sum-context">
          <span className="sum-count wide-only">{t.itemCount} item{t.itemCount === 1 ? '' : 's'}</span>
          <span className="sum-sep wide-only">·</span>
          <span className="sum-meta">Calculated <strong>{fmt(t.total)}</strong></span>
          {t.discount > 0 && <><span className="sum-sep">·</span><span className="sum-meta">Discount <strong>{fmt(t.discount)}</strong><span className="wide-only"> ({pct}%)</span></span></>}
          {t.gstAmt > 0 && <><span className="sum-sep wide-only">·</span><span className="sum-meta wide-only">GST <strong>{fmt(t.gstAmt)}</strong></span></>}
        </div>
        <div className="sum-grand"><span className="sum-grand-label">Grand total</span><strong>{fmt(t.grand)}</strong></div>
      </div>
      {t.agreedTooHigh && (
        <div className="sum-warning" role="alert">The agreed subtotal is higher than the calculated total ({fmt(t.total)}). Lower it, or add the missing items — it isn’t used until then.</div>
      )}
      <div className="sum-bottom">
        <fieldset className="sum-adj" disabled={locked}>
          <div className="adj-field">
            <label htmlFor="finalCharge">Agreed subtotal ₹</label>
            <NumField id="finalCharge" label="Agreed subtotal" step="1" max={100000000} placeholder="= calculated" value={quote.finalCharge} onValue={(n) => update((q) => ({ ...q, finalCharge: n ?? 0 }))} />
          </div>
          <div className="adj-field">
            <label htmlFor="gst">GST %</label>
            <NumField id="gst" label="GST" step="0.5" max={100} placeholder="0" value={quote.gst} onValue={(n) => update((q) => ({ ...q, gst: n ?? 0 }))} />
          </div>
        </fieldset>
        <button className="btn primary" disabled={!t.itemCount || t.agreedTooHigh} onClick={onPreview}>Preview<span className="wide-only"> &amp; download</span></button>
      </div>
    </div>
  );
}

function VersionHistory({ quoteId, onClose, onRestored }: { quoteId: QuoteId; onClose: () => void; onRestored: () => void }) {
  const res = useQuery(api.quotes.listQuoteVersions, { quoteId });
  const restore = useMutation(api.quotes.restoreQuoteVersion);
  const confirm = useConfirm();
  const toast = useToast();
  return (
    <Modal title="Version history" onClose={onClose}>
      <div className="quote-versions-list">
        {res === undefined && <div className="list-loading-note">Loading…</div>}
        {res?.versions.map((v) => {
          const t = v.snapshot;
          return (
            <div className="quote-version-row" key={v.id}>
              <div className="quote-version-main">
                <span className="quote-version-label">{new Date(v.changedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <span className="quote-version-sub">{v.changeType} · {t.customer.name || 'No customer'} · {t.itemCount} item{t.itemCount === 1 ? '' : 's'} · {fmt(t.grand)}</span>
              </div>
              <StatusChip status={t.status ?? 'draft'} />
              <button className="btn ghost" onClick={async () => {
                if (!(await confirm({ title: 'Restore this version?', message: 'The quote goes back to this version. The current version stays in the history.', confirmLabel: 'Restore' }))) return;
                try {
                  await restore({ quoteId, version: v.version });
                  onRestored();
                  onClose();
                  toast({ message: 'Version restored.', type: 'success' });
                } catch {
                  toast({ message: 'Could not restore that version.', type: 'error' });
                }
              }}>Restore</button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
