import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { fmt } from '../lib/format';
import { PageHead, useToast } from '../ui';

export function Trash() {
  const res = useQuery(api.quotes.listDeletedQuotes, {});
  const restore = useMutation(api.quotes.restoreQuote);
  const toast = useToast();
  return (
    <section>
      <PageHead title="Deleted quotes" sub="Deleted quotes stay here so you can bring them back." />
      <div className="deleted-quotes-list">
        {res === undefined && <div className="skeleton-card" />}
        {res && !res.quotes.length && <div className="client-empty">Nothing deleted.</div>}
        {res?.quotes.map((q) => (
          <div className="deleted-quote-row" key={q.id}>
            <div className="deleted-quote-main">
              <div className="deleted-quote-no">{q.quoteNo}</div>
              <div className="deleted-quote-sub">
                {q.customerName || '—'} · {fmt(q.grand)} · deleted {new Date(q.deletedAt ?? q.updatedAt).toLocaleDateString('en-IN')}
              </div>
            </div>
            <button className="btn ghost" onClick={async () => {
              try { await restore({ id: q.id }); toast({ message: `${q.quoteNo} restored.`, type: 'success' }); }
              catch { toast({ message: 'Could not restore the quote.', type: 'error' }); }
            }}>Restore</button>
          </div>
        ))}
      </div>
    </section>
  );
}
