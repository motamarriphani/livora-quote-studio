import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { ClientId } from '../lib/types';
import { fmt, initials } from '../lib/format';
import { ClientForm, type ClientRecord } from '../components/ClientForm';
import { PageHead, useConfirm, useToast } from '../ui';
import { QuoteList } from './Dashboard';

export function Clients() {
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [editing, setEditing] = useState<ClientRecord | 'new' | null>(null);
  useEffect(() => { const t = setTimeout(() => setSearch(term.trim()), 300); return () => clearTimeout(t); }, [term]);
  useEffect(() => setCursors([null]), [search, archived]);

  return (
    <section>
      <PageHead title={archived ? 'Archived clients' : 'Clients'} sub={archived ? 'Hidden from the client book. Their quotes are untouched.' : 'Your client book'}>
        <button className="btn ghost head-btn" onClick={() => setArchived(!archived)}>{archived ? '← Active clients' : 'Archived'}</button>
        {!archived && <button className="btn primary head-btn" onClick={() => setEditing('new')}>＋ Add client</button>}
      </PageHead>
      <input className="field search" type="search" placeholder="Search by name, phone or address…" value={term} onChange={(e) => setTerm(e.target.value)} />
      <div className="client-list">
        {cursors.map((cursor, i) => (
          <ClientPage key={search + archived + i} search={search} archived={archived} cursor={cursor} first={i === 0}
            last={i === cursors.length - 1} onMore={(c) => setCursors((cs) => [...cs, c])} onEdit={setEditing} />
        ))}
      </div>
      {editing && <ClientForm client={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function ClientPage({ search, archived, cursor, first, last, onMore, onEdit }: {
  search: string; archived: boolean; cursor: string | null; first: boolean; last: boolean;
  onMore: (c: string) => void; onEdit: (c: ClientRecord) => void;
}) {
  const res = useQuery(api.clients.listClients, { search, archivedOnly: archived, ...(cursor ? { cursor } : {}) });
  if (res === undefined) return <div className="skeleton-card" />;
  if (first && !res.clients.length) {
    return <div className="client-empty">{search ? 'No matching clients.' : archived ? 'No archived clients.' : 'No clients yet. Add one here, or pick “Add new client” while building a quote.'}</div>;
  }
  return (
    <>
      {res.clients.map((c) => <ClientRow key={c.id} c={c} archived={archived} onEdit={onEdit} />)}
      {last && !res.done && res.nextCursor && <button className="btn ghost full load-more" onClick={() => onMore(res.nextCursor!)}>Load more clients</button>}
    </>
  );
}

function ClientRow({ c, archived, onEdit }: {
  c: { id: ClientId; name: string; phone: string; address: string; quoteCount: number; quotes: { grand: number }[] };
  archived: boolean;
  onEdit: (c: ClientRecord) => void;
}) {
  const navigate = useNavigate();
  const archive = useMutation(api.clients.archiveClient);
  const unarchive = useMutation(api.clients.unarchiveClient);
  const confirm = useConfirm();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const latest = c.quotes[0];
  return (
    <div className={'client-card' + (archived ? ' archived' : '')}>
      <div className="client-row">
        <div className="client-avatar">{initials(c.name)}</div>
        <button className="client-main" onClick={() => setOpen(!open)} aria-expanded={open}>
          <div className="client-name">{c.name}</div>
          <div className="client-sub">{[c.phone, c.address].filter(Boolean).join(' · ') || 'No contact saved'}</div>
        </button>
        <div className="client-context">
          {latest ? <><span className="client-context-label">Latest</span><b>{fmt(latest.grand)}</b></> : <span className="client-context-empty">No quotes yet</span>}
          <span className="client-ql">{c.quoteCount} quote{c.quoteCount === 1 ? '' : 's'}</span>
        </div>
        <div className="client-actions">
          {!archived && (
            <button className="btn ghost client-quick" onClick={() => navigate('/quotes/new', {
              state: { customer: { name: c.name, phone: c.phone, address: c.address }, clientId: c.id },
            })}>＋ Quote</button>
          )}
          <button className="icon-btn" aria-label={`Edit ${c.name}`} onClick={() => onEdit(c)}>✏️</button>
          <button className="icon-btn" aria-label={archived ? `Restore ${c.name}` : `Archive ${c.name}`} title={archived ? 'Restore' : 'Archive'} onClick={async () => {
            if (archived) { await unarchive({ id: c.id }); toast({ message: `${c.name} restored.`, type: 'success' }); return; }
            if (!(await confirm({ title: 'Archive client?', message: `${c.name} is hidden from the client book. Their quotes stay in your quote list.`, confirmLabel: 'Archive' }))) return;
            await archive({ id: c.id });
            toast({ message: `${c.name} archived.`, type: 'success', action: { label: 'Undo', run: () => void unarchive({ id: c.id }) } });
          }}>{archived ? '↩' : '📦'}</button>
        </div>
      </div>
      {open && (
        <div className="client-quotes-panel">
          <QuoteList args={{ clientId: c.id }} emptyText="Tap ＋ Quote to make the first quote for this client." />
        </div>
      )}
    </div>
  );
}
