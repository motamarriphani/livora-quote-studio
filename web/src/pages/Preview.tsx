import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { Quote } from '../lib/types';
import { sampleQuote } from '../lib/defaults';
import { fmt } from '../lib/format';
import { totals } from '../lib/math';
import { downloadBlob, makePdfBlob, pdfFileName, renderPdfPages } from '../lib/pdf';
import { useToast } from '../ui';
import { Icon } from '../components/Icon';

/** The real generated PDF, page by page — exactly what Download gives the client. */
export function PdfPreview({ quote, delay = 150 }: { quote: Quote; delay?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Preparing…');
  const key = JSON.stringify(quote);
  useEffect(() => {
    let live = true;
    setStatus('Preparing…');
    const t = setTimeout(async () => {
      try {
        const pages = await renderPdfPages(await makePdfBlob(quote));
        if (!live || !host.current) return;
        host.current.replaceChildren(...pages.map((canvas, i) => {
          const sheet = document.createElement('div');
          sheet.className = 'quote-pdf-sheet';
          canvas.className = 'quote-pdf-canvas';
          const n = document.createElement('div');
          n.className = 'quote-pdf-sheet-num';
          n.textContent = `Page ${i + 1} of ${pages.length}`;
          sheet.append(canvas, n);
          return sheet;
        }));
        setStatus(pages.length === 1 ? '1 page' : `${pages.length} pages`);
      } catch (e) {
        console.error(e);
        if (live) setStatus('Preview unavailable — Download still works');
      }
    }, delay);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <>
      <div className="quote-page-count" role="status">{status}</div>
      <div className="quote-pdf" ref={host} aria-label="Quote PDF preview" />
    </>
  );
}

export function PreviewScreen({ quote, onBack, onDownloaded, beforeDownload, toolbar }: {
  quote: Quote;
  onBack: () => void;
  onDownloaded?: () => void;
  beforeDownload?: () => Promise<Quote | null>;
  toolbar?: ReactNode;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const t = useMemo(() => totals(quote.sections, quote.finalCharge, quote.gst), [quote]);
  async function download() {
    setBusy(true);
    try {
      const q = (await beforeDownload?.()) ?? quote;
      downloadBlob(await makePdfBlob(q), pdfFileName(q));
      onDownloaded?.();
    } catch (e) {
      console.error(e);
      toast({ message: 'Could not create the PDF. Try again.', type: 'error' });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="quote-view">
      <div className="preview-bar">
        <button className="btn ghost" onClick={onBack}><Icon name="back" />Back to editing</button>
        <div className="preview-tools">{toolbar}</div>
      </div>
      <PdfPreview quote={quote} />
      <div className="quote-actions">
        <div className="quote-total">
          <div className="qt-label">Grand total</div>
          <div className="qt-amount">{fmt(t.grand)}</div>
          <div className="qt-breakdown">
            Calculated {fmt(t.total)}{t.discount ? ` · Discount ${fmt(t.discount)}` : ''}{t.gstAmt ? ` · GST ${fmt(t.gstAmt)}` : ''}
          </div>
        </div>
        <button className="btn primary" disabled={busy} onClick={download}>{busy ? 'Preparing…' : <><Icon name="download" />Download PDF</>}</button>
      </div>
    </section>
  );
}

/** Demo of the reference LIVORA quote. Never saved, never numbered. */
export function SamplePreview() {
  const navigate = useNavigate();
  const sample = useMemo(() => sampleQuote(), []);
  return (
    <>
      <div className="sync-banner info">
        <b>Sample quote</b>
        A demonstration of the quotation layout. It isn’t saved and doesn’t use a quote number.
      </div>
      <PreviewScreen quote={sample} onBack={() => navigate('/')} />
    </>
  );
}
