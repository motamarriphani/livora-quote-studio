import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { initials } from '../lib/format';
import { ClientForm, type ClientRecord } from './ClientForm';

/** Pick a client from the book (or add one) to fill the quote's customer details. */
export function ClientPicker({ linkedName, disabled, onPick }: {
  linkedName: string | null;
  disabled?: boolean;
  onPick: (c: ClientRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [adding, setAdding] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(term.trim()), 250); return () => clearTimeout(t); }, [term]);
  const res = useQuery(api.clients.listClients, open ? { search: debounced } : 'skip');
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  return (
    <div ref={box}>
      <button type="button" className="client-pick" disabled={disabled} onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="cp-avatar">{linkedName ? initials(linkedName) : '👤'}</span>
        <span className="cp-label">{linkedName ? linkedName : 'Choose from client book…'}</span>
        <span className="cp-chev">▾</span>
      </button>
      {open && (
        <div className="client-pick-list">
          <input className="field search" type="search" placeholder="Search clients…" value={term} autoFocus onChange={(e) => setTerm(e.target.value)} aria-label="Search clients" />
          {res === undefined && <div className="list-loading-note">Loading clients…</div>}
          {res?.clients.map((c) => (
            <button type="button" key={c.id} className="cp-row" onClick={() => { onPick(c); setOpen(false); }}>
              <span className="cp-avatar">{initials(c.name)}</span>
              <span className="cp-main">
                <span className="cp-name">{c.name}</span>
                <span className="cp-sub">{[c.phone, c.address].filter(Boolean).join(' · ') || 'No contact saved'}</span>
              </span>
            </button>
          ))}
          {res && !res.clients.length && <div className="cp-empty">No matching clients.</div>}
          <button type="button" className="cp-row cp-add" onClick={() => { setAdding(true); setOpen(false); }}>
            <span className="cp-avatar">＋</span>
            <span className="cp-main"><span className="cp-name">Add new client</span><span className="cp-sub">Saves to your client book and uses it here</span></span>
          </button>
        </div>
      )}
      {adding && <ClientForm client={null} onClose={() => setAdding(false)} onSaved={onPick} />}
    </div>
  );
}
