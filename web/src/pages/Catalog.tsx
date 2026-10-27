// Catalog = the defaults new quotes start from: rate card, specification
// rows, terms. Changing them never alters quotes that already exist.
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Catalog, Spec } from '../lib/types';
import { fmt, uid } from '../lib/format';
import { NumField } from '../components/fields';
import { Modal, PageHead, useConfirm, useToast } from '../ui';

function useCatalog() {
  const doc = useQuery(api.catalog.getCatalog);
  const save = useMutation(api.catalog.saveCatalog);
  const toast = useToast();
  const catalog: Catalog | null | undefined = doc && {
    items: doc.items, services: doc.services, materials: doc.materials, terms: doc.terms,
  };
  async function commit(next: Catalog) {
    try {
      await save({
        items: next.items.map(({ id, name, rate, w, h, cat }) => ({ id, name, rate, w: w ?? null, h: h ?? null, ...(cat ? { cat } : {}) })),
        services: next.services.map(({ id, name, rate, cat }) => ({ id, name, rate, ...(cat ? { cat } : {}) })),
        materials: next.materials,
        terms: next.terms,
      });
      return true;
    } catch (e) {
      console.error(e);
      toast({ message: 'Could not save the catalog. Check your connection.', type: 'error' });
      return false;
    }
  }
  return { catalog, commit };
}

const NOTE = 'Used by new quotes. Existing quotes keep what they were made with.';

/* ── Rate card: per-sq-ft items and lump-sum services in one list ── */
type Rate = { id: string; name: string; rate: number; cat: string; lump: boolean; w: number | null; h: number | null };

export function RateCard() {
  const { catalog, commit } = useCatalog();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Rate | 'new' | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  if (catalog === undefined) return <section><PageHead title="Rate card" /><div className="skeleton-card" /></section>;
  const c = catalog ?? { items: [], services: [], materials: [], terms: [] };
  const rows: Rate[] = [
    ...c.items.map((x) => ({ id: x.id, name: x.name, rate: x.rate, cat: x.cat ?? '', lump: false, w: x.w ?? null, h: x.h ?? null })),
    ...c.services.map((x) => ({ id: x.id, name: x.name, rate: x.rate, cat: x.cat ?? '', lump: true, w: null, h: null })),
  ];
  const cats = [...new Set(rows.map((r) => r.cat).filter(Boolean))].sort();
  const term = q.trim().toLowerCase();
  const shown = rows
    .filter((r) => (!term || r.name.toLowerCase().includes(term)) && (!cat || r.cat === cat))
    .sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));

  async function upsert(r: Rate, prev: Rate | null) {
    const items = c.items.filter((x) => !(prev && !prev.lump && x.id === prev.id));
    const services = c.services.filter((x) => !(prev && prev.lump && x.id === prev.id));
    if (r.lump) services.push({ id: r.id, name: r.name, rate: r.rate, cat: r.cat });
    else items.push({ id: r.id, name: r.name, rate: r.rate, cat: r.cat, w: r.w, h: r.h });
    return commit({ ...c, items, services });
  }

  return (
    <section>
      <PageHead title="Rate card" sub={NOTE}>
        <button className="btn primary head-btn" onClick={() => setEditing('new')}>＋ Add rate</button>
      </PageHead>
      <div className="cat-filters">
        <input className="field search" type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {cats.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <div className="cat-list">
        {!shown.length && <div className="cat-empty">{rows.length ? 'Nothing matches.' : 'No rates yet — tap ＋ Add rate.'}</div>}
        {shown.map((r) => (
          <div className="cat-row cat-item-row" key={(r.lump ? 'l' : 'm') + r.id}>
            <div className="cat-item-name">{r.name}</div>
            <div className="cat-item-price">{fmt(r.rate)}{r.lump ? ' lump sum' : ' / sq ft'}</div>
            <div className="cat-item-sub">{[r.cat, !r.lump && r.w && r.h ? `default ${r.w} × ${r.h} ft` : ''].filter(Boolean).join(' · ')}</div>
            <div className="cat-row-actions">
              <button className="icon-btn" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}>✏️</button>
              <button className="icon-btn danger" aria-label={`Delete ${r.name}`} onClick={async () => {
                if (!(await confirm({ title: 'Delete rate?', message: `Remove “${r.name}” from the rate card?`, confirmLabel: 'Delete', danger: true }))) return;
                await commit({ ...c, items: c.items.filter((x) => r.lump || x.id !== r.id), services: c.services.filter((x) => !r.lump || x.id !== r.id) });
              }}>🗑</button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <RateForm
          rate={editing === 'new' ? null : editing}
          cats={cats}
          onClose={() => setEditing(null)}
          onSave={async (r) => { if (await upsert(r, editing === 'new' ? null : editing)) setEditing(null); }}
        />
      )}
    </section>
  );
}

function RateForm({ rate, cats, onClose, onSave }: { rate: Rate | null; cats: string[]; onClose: () => void; onSave: (r: Rate) => void }) {
  const [r, setR] = useState<Rate>(rate ?? { id: uid(), name: '', rate: 0, cat: '', lump: false, w: null, h: null });
  const [err, setErr] = useState('');
  return (
    <Modal title={rate ? 'Edit rate' : 'New rate'} onClose={onClose} small>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!r.name.trim()) return setErr('Enter a name.');
        onSave({ ...r, name: r.name.trim(), cat: r.cat.trim() });
      }}>
        <label className="cat-field"><span>Name</span><input className="field" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="e.g. Wardrobe Box" /></label>
        <label className="cat-field"><span>Category</span>
          <input className="field" list="rate-cats" value={r.cat} onChange={(e) => setR({ ...r, cat: e.target.value })} placeholder="e.g. Woodwork" />
          <datalist id="rate-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <div className="seg" role="radiogroup" aria-label="Pricing">
          <button type="button" role="radio" aria-checked={!r.lump} className={!r.lump ? 'on' : ''} onClick={() => setR({ ...r, lump: false })}>Per sq ft</button>
          <button type="button" role="radio" aria-checked={r.lump} className={r.lump ? 'on' : ''} onClick={() => setR({ ...r, lump: true })}>Lump sum</button>
        </div>
        <label className="cat-field"><span>{r.lump ? 'Amount ₹' : 'Rate ₹ / sq ft'}</span>
          <NumField className="field" label="Rate" max={10000000} value={r.rate} onValue={(n) => setR({ ...r, rate: n ?? 0 })} />
        </label>
        {!r.lump && (
          <div className="grid-2">
            <label className="cat-field"><span>Default W (ft)</span><NumField className="field" label="Width" step="0.1" max={1000} value={r.w} onValue={(n) => setR({ ...r, w: n })} /></label>
            <label className="cat-field"><span>Default H (ft)</span><NumField className="field" label="Height" step="0.1" max={1000} value={r.h} onValue={(n) => setR({ ...r, h: n })} /></label>
          </div>
        )}
        {err && <div className="cat-err">{err}</div>}
        <button className="btn primary full">Save</button>
      </form>
    </Modal>
  );
}

/* ── Inline list editor with an explicit Save (defaults deserve a deliberate save) ── */
function useDraft<T>(source: T | undefined) {
  const [draft, setDraft] = useState<T | undefined>(source);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setDraft(source); }, [source, dirty]);
  return {
    draft,
    dirty,
    set: (v: T) => { setDraft(v); setDirty(true); },
    reset: () => { setDirty(false); setDraft(source); },
    saved: () => setDirty(false),
  };
}

function SaveBar({ dirty, onSave, onDiscard }: { dirty: boolean; onSave: () => void; onDiscard: () => void }) {
  if (!dirty) return null;
  return (
    <div className="save-bar">
      <span>Unsaved changes</span>
      <button className="btn ghost" onClick={onDiscard}>Discard</button>
      <button className="btn primary" onClick={onSave}>Save changes</button>
    </div>
  );
}

export function Specifications() {
  const { catalog, commit } = useCatalog();
  const d = useDraft<Spec[]>(catalog?.materials);
  const toast = useToast();
  const rows = d.draft ?? [];
  const set = (i: number, k: 'c' | 'd', v: string) => d.set(rows.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  return (
    <section>
      <PageHead title="Specifications" sub={'The “Material specification” block on the PDF. ' + NOTE} />
      <div className="cat-list">
        {catalog === undefined && <div className="skeleton-card" />}
        {rows.map((s, i) => (
          <div className="cat-row spec-edit" key={i}>
            <input className="field" value={s.c} placeholder="Category (e.g. Laminates)" aria-label={`Row ${i + 1} category`} onChange={(e) => set(i, 'c', e.target.value)} />
            <textarea className="field" rows={2} value={s.d} placeholder="Details" aria-label={`Row ${i + 1} details`} onChange={(e) => set(i, 'd', e.target.value)} />
            <button className="icon-btn danger" aria-label={`Remove row ${i + 1}`} onClick={() => d.set(rows.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="add-item-btn" onClick={() => d.set([...rows, { c: '', d: '' }])}>＋ Add row</button>
      </div>
      <SaveBar dirty={d.dirty} onDiscard={d.reset} onSave={async () => {
        const materials = rows.filter((s) => s.c.trim() && s.d.trim());
        if (catalog && (await commit({ ...catalog, materials }))) { d.saved(); toast({ message: 'Specifications saved.', type: 'success' }); }
      }} />
    </section>
  );
}

export function DefaultTerms() {
  const { catalog, commit } = useCatalog();
  const d = useDraft<string[]>(catalog?.terms);
  const toast = useToast();
  const rows = d.draft ?? [];
  const move = (i: number, dir: -1 | 1) => { const t = [...rows]; [t[i], t[i + dir]] = [t[i + dir], t[i]]; d.set(t); };
  return (
    <section>
      <PageHead title="Default terms" sub={NOTE + ' GST, validity and timeline lines are added to every PDF automatically.'} />
      <div className="cat-list">
        {catalog === undefined && <div className="skeleton-card" />}
        {rows.map((t, i) => (
          <div className="cat-row term-edit" key={i}>
            <span className="cat-term-n">{i + 1}</span>
            <textarea className="cat-term-input" rows={2} value={t} aria-label={`Term ${i + 1}`} onChange={(e) => d.set(rows.map((x, j) => (j === i ? e.target.value : x)))} />
            <div className="term-tools">
              <button className="icon-btn" disabled={i === 0} aria-label="Move up" onClick={() => move(i, -1)}>↑</button>
              <button className="icon-btn" disabled={i === rows.length - 1} aria-label="Move down" onClick={() => move(i, 1)}>↓</button>
              <button className="icon-btn danger" aria-label={`Remove term ${i + 1}`} onClick={() => d.set(rows.filter((_, j) => j !== i))}>✕</button>
            </div>
          </div>
        ))}
        <button className="add-item-btn" onClick={() => d.set([...rows, ''])}>＋ Add term</button>
      </div>
      <SaveBar dirty={d.dirty} onDiscard={d.reset} onSave={async () => {
        if (catalog && (await commit({ ...catalog, terms: rows.map((t) => t.trim()).filter(Boolean) }))) { d.saved(); toast({ message: 'Terms saved.', type: 'success' }); }
      }} />
    </section>
  );
}
