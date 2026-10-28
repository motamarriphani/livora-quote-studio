import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Item } from '../lib/types';
import { fmt, uid } from '../lib/format';
import { Modal } from '../ui';
import { NumField } from './fields';
import { Icon } from './Icon';

/** Add items to a room: from the rate card, or a one-off custom line. */
export function ItemLibrary({ roomName, onAdd, onClose }: {
  roomName: string;
  onAdd: (item: Item) => void;
  onClose: () => void;
}) {
  const catalog = useQuery(api.catalog.getCatalog);
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const term = q.trim().toLowerCase();
  const pool = [
    ...(catalog?.items ?? []).map((x) => ({ ...x, lump: false })),
    ...(catalog?.services ?? []).map((x) => ({ ...x, w: null, h: null, lump: true })),
  ].filter((x) => !term || x.name.toLowerCase().includes(term) || (x.cat ?? '').toLowerCase().includes(term));

  function add(x: (typeof pool)[number]) {
    onAdd({ id: uid(), name: x.name, rate: x.rate, ...(x.lump ? { lump: true } : { w: x.w ?? null, h: x.h ?? null }) });
    setAdded((a) => [...a, x.name]);
  }

  if (custom) return <CustomItem roomName={roomName} onAdd={(it) => { onAdd(it); onClose(); }} onBack={() => setCustom(false)} />;

  return (
    <Modal title="Add items" sub={<>Adding to <b>{roomName}</b>{added.length ? ` · ${added.length} added` : ''}</>} onClose={onClose}>
      <input className="field search" type="search" placeholder="Search the rate card…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="lib-grid">
        {catalog === undefined && <div className="list-loading-note">Loading rate card…</div>}
        {pool.map((x) => (
          <button key={(x.lump ? 'l-' : 'm-') + x.id} className="lib-item" onClick={() => add(x)}>
            <div className="lib-name">{x.name}</div>
            <div className="lib-cat">{x.cat}</div>
            <div className="lib-rate">{x.lump ? <>{fmt(x.rate)} <small>lump sum</small></> : <>{fmt(x.rate)} <small>/ sq ft</small></>}</div>
          </button>
        ))}
        {catalog && !pool.length && <div className="cp-empty" style={{ gridColumn: '1/-1' }}>Nothing matches “{q}”.</div>}
      </div>
      <div className="modal-foot split">
        <button className="btn ghost" onClick={() => setCustom(true)}><Icon name="plus" />Custom item</button>
        <button className="btn primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}

function CustomItem({ roomName, onAdd, onBack }: { roomName: string; onAdd: (it: Item) => void; onBack: () => void }) {
  const [name, setName] = useState('');
  const [lump, setLump] = useState(false);
  const [w, setW] = useState<number | null>(null);
  const [h, setH] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  return (
    <Modal title="Custom item" sub={<>Adding to <b>{roomName}</b></>} onClose={onBack} small>
      <form onSubmit={(e) => {
        e.preventDefault();
        onAdd({ id: uid(), name: name.trim() || 'Custom item', rate: rate ?? 0, ...(lump ? { lump: true } : { w, h }) });
      }}>
        <input className="field" placeholder="Description" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="seg" role="radiogroup" aria-label="Pricing">
          <button type="button" role="radio" aria-checked={!lump} className={!lump ? 'on' : ''} onClick={() => setLump(false)}>Per sq ft (W × H × rate)</button>
          <button type="button" role="radio" aria-checked={lump} className={lump ? 'on' : ''} onClick={() => setLump(true)}>Lump sum</button>
        </div>
        {!lump && (
          <div className="grid-2">
            <div><NumField className="field" label="Width (ft)" placeholder="Width (ft)" step="0.1" max={1000} value={w} onValue={setW} /></div>
            <div><NumField className="field" label="Height (ft)" placeholder="Height (ft)" step="0.1" max={1000} value={h} onValue={setH} /></div>
          </div>
        )}
        <NumField className="field" label={lump ? 'Amount' : 'Rate'} placeholder={lump ? 'Amount ₹' : 'Rate ₹ / sq ft'} max={10000000} value={rate} onValue={setRate} />
        <button className="btn primary full">Add item</button>
      </form>
    </Modal>
  );
}
