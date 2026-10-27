import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { ClientId, QuoteId } from '../lib/types';
import { fmt, fmtDate, todayStr } from '../lib/format';
import { PageHead, StatusChip, useConfirm, useToast } from '../ui';

export type QuoteSummary = {
  id: QuoteId; quoteNo: string; date: string; customerName: string; grand: number;
  itemCount: number; status: string; storedStatus?: string; expired?: boolean;
};

export function Dashboard() {
  const navigate = useNavigate();
  const stats = useQuery(api.quotes.getStats, { month: todayStr().slice(0, 7) });
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => { const t = setTimeout(() => setSearch(term.trim()), 300); return () => clearTimeout(t); }, [term]);

  return (
    <section>
      <PageHead title="Quotes" sub="Every quote you build is saved here automatically">
        <button className="btn primary head-btn" onClick={() => navigate('/quotes/new')}>＋ New quote</button>
      </PageHead>

      <div className="dash-stats">
        <Stat value={stats?.monthCount} label="Quotes made this month" />
        <Stat value={stats ? fmt(stats.awaitingValue ?? 0) : undefined} label={`Awaiting reply${stats?.awaitingCount ? ` · ${stats.awaitingCount}` : ''}`} />
        <Stat value={stats ? fmt(stats.acceptedMonthValue ?? 0) : undefined} label={`Accepted this month${stats?.acceptedMonthCount ? ` · ${stats.acceptedMonthCount}` : ''}`} />
      </div>

      <div className="dash-table">
        <div className="dash-filters">
          <input className="field search dash-search" type="search" placeholder="Search by client or quote number…" value={term} onChange={(e) => setTerm(e.target.value)} />
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent (awaiting reply)</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <QuoteList args={{ search, ...(status ? { status } : {}) }} filtered={!!(search || status)} />
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string | number | undefined; label: string }) {
  return (
    <div className="stat-card">
      <div className="stat-num">{value ?? '…'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/** Paged quote list. Each page is a live query, so changes from any device show up. */
export function QuoteList({ args, filtered, emptyText }: {
  args: { search?: string; status?: string; clientId?: ClientId };
  filtered?: boolean;
  emptyText?: string;
}) {
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const key = JSON.stringify(args);
  useEffect(() => setCursors([null]), [key]);
  return (
    <div className="dash-list">
      {cursors.map((cursor, i) => (
        <QuotePage
          key={key + i}
          args={args}
          cursor={cursor}
          first={i === 0}
          last={i === cursors.length - 1}
          filtered={filtered}
          emptyText={emptyText}
          onMore={(next) => setCursors((c) => [...c, next])}
        />
      ))}
    </div>
  );
}

function QuotePage({ args, cursor, first, last, filtered, emptyText, onMore }: {
  args: { search?: string; status?: string; clientId?: ClientId };
  cursor: string | null; first: boolean; last: boolean; filtered?: boolean; emptyText?: string;
  onMore: (cursor: string) => void;
}) {
  const res = useQuery(api.quotes.listQuotes, { ...args, ...(cursor ? { cursor } : {}) });
  if (res === undefined) return <>{Array.from({ length: first ? 4 : 1 }, (_, i) => <div key={i} className="skeleton-row" />)}</>;
  if (first && !res.quotes.length) {
    return (
      <div className="dash-empty">
        {filtered ? <><b>No matching quotes</b><span>Try a different search or status.</span></>
          : <><b>No quotes yet</b><span>{emptyText ?? 'Tap ＋ New quote to build your first one.'}</span></>}
      </div>
    );
  }
  return (
    <>
      {res.quotes.map((q) => <QuoteRow key={q.id} q={q} />)}
      {last && !res.done && res.nextCursor && (
        <button className="btn ghost full load-more" onClick={() => onMore(res.nextCursor!)}>Load more quotes</button>
      )}
    </>
  );
}

export function QuoteRow({ q }: { q: QuoteSummary }) {
  const navigate = useNavigate();
  const del = useMutation(api.quotes.deleteQuote);
  const restore = useMutation(api.quotes.restoreQuote);
  const confirm = useConfirm();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const stored = q.storedStatus ?? (q.status === 'expired' ? 'sent' : q.status);

  async function remove() {
    setMenu(false);
    if (!(await confirm({ title: 'Delete quote?', message: `${q.quoteNo} moves to Deleted quotes. You can restore it from there.`, confirmLabel: 'Delete', danger: true }))) return;
    try {
      await del({ id: q.id });
      toast({ message: `${q.quoteNo} deleted.`, type: 'success', action: { label: 'Undo', run: () => void restore({ id: q.id }) } });
    } catch {
      toast({ message: 'Could not delete the quote.', type: 'error' });
    }
  }

  return (
    <div className="dash-row" onClick={() => navigate(`/quotes/${q.id}`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/quotes/${q.id}`)}>
      <div className="c-qno">{q.quoteNo}</div>
      <div className="c-client">{q.customerName || '—'}<small>{q.itemCount} item{q.itemCount === 1 ? '' : 's'}</small></div>
      <div className="c-date">{fmtDate(q.date)}</div>
      <div className="c-total">{fmt(q.grand)}</div>
      <div className="c-status"><StatusChip status={stored} expired={q.expired ?? q.status === 'expired'} /></div>
      <div className="c-act" onClick={(e) => e.stopPropagation()}>
        <button className="row-action" title="Preview" aria-label="Preview quote" onClick={() => navigate(`/quotes/${q.id}/preview`)}>↗</button>
        <div className="row-menu">
          <button className="row-action" aria-label="More actions" aria-expanded={menu} onClick={() => setMenu(!menu)}>⋯</button>
          {menu && (
            <div className="row-menu-popover" onMouseLeave={() => setMenu(false)}>
              <button onClick={() => navigate(`/quotes/new?from=${q.id}`)}>⧉ Duplicate as new quote</button>
              <button className="danger-menu" onClick={remove}>🗑 Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
