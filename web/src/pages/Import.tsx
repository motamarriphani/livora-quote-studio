import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { newQuote } from '../lib/defaults';
import { fmt } from '../lib/format';
import { sectionTotal, totals } from '../lib/math';
import type { Section } from '../lib/types';
import { buildImport, cellText, detectColumns, ROLES, splitWorkbook, type Extras, type ImportInfo, type Role, type RowResult, type SheetData } from '../lib/importSheet';
import { buildTemplate, readWorkbook, TEMPLATE_FILE } from '../lib/excel';
import { downloadBlob } from '../lib/pdf';
import { PageHead, useMediaQuery, useToast } from '../ui';
import { Icon } from '../components/Icon';

/** Excel → new quote. Desktop: match columns beside the result. Phone: review, then create. */
export function ImportPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const catalog = useQuery(api.catalog.getCatalog);
  const wide = useMediaQuery('(min-width: 900px)');
  const [file, setFile] = useState<{ name: string; sheets: SheetData[]; extras: Extras } | null>(null);
  const [sheetIx, setSheetIx] = useState(0);
  const [cols, setCols] = useState<{ headerRow: number; roles: Role[] }>({ headerRow: -1, roles: [] });
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const sheet = file?.sheets[sheetIx];
  const result = useMemo(
    () => (sheet && catalog !== undefined ? buildImport(sheet.rows, cols.roles, cols.headerRow, catalog, newQuote(catalog), file?.extras) : null),
    [sheet, cols, catalog, file],
  );
  const t = result ? totals(result.quote.sections, result.quote.finalCharge, result.quote.gst) : null;
  const itemCount = result?.rows.filter((r) => r.item).length ?? 0;

  async function open(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      const { itemSheets, terms, spec } = splitWorkbook(await readWorkbook(f));
      if (!itemSheets.length) throw new Error('That workbook has no sheet with items to read.');
      setFile({ name: f.name, sheets: itemSheets, extras: { terms, spec } });
      pickSheet(itemSheets, 0);
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : 'Could not read that file.', type: 'error' });
    } finally {
      setBusy(false);
    }
  }
  function pickSheet(sheets: SheetData[], ix: number) {
    setSheetIx(ix);
    setCols(detectColumns(sheets[ix].rows));
  }
  async function downloadTemplate() {
    try {
      downloadBlob(await buildTemplate(catalog), TEMPLATE_FILE);
    } catch (e) {
      console.error(e);
      toast({ message: 'Could not create the template.', type: 'error' });
    }
  }
  function create() {
    if (!result || !file) return;
    const info: ImportInfo = {
      file: file.name,
      items: itemCount,
      filled: result.filled,
      terms: file.extras.terms?.length,
      spec: file.extras.spec?.length,
      skipped: result.rows.filter((r) => r.status === 'skipped').map(({ row, name, note }) => ({ row, name, note })),
    };
    navigate('/quotes/new', { state: { imported: result.quote, importInfo: info, importFlags: result.flags } });
  }
  const setRole = (col: number, role: Role) => setCols((c) => ({
    headerRow: c.headerRow,
    // One column per role: picking a role elsewhere frees it here.
    roles: c.roles.map((r, i) => (i === col ? role : r === role && role !== 'ignore' ? 'ignore' : r)),
  }));

  if (!file || !sheet) {
    return (
      <section className="import">
        <PageHead title="Import from Excel" />
        <label
          className={'import-drop' + (dragging ? ' over' : '')}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void open(e.dataTransfer.files[0]); }}
        >
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => void open(e.target.files?.[0])} />
          <span className="xl-badge big">X</span>
          <b>{busy ? 'Reading…' : 'Choose an .xlsx file'}</b>
          <span className="wide-only">or drop it here</span>
        </label>
        <button className="btn ghost full" onClick={downloadTemplate} disabled={catalog === undefined}><Icon name="download" />Download the template</button>
      </section>
    );
  }

  const fileChip = (
    <div className="import-file">
      <span className="xl-badge">X</span>
      <span className="import-file-name">{file.name}</span>
      {file.sheets.length > 1 && (
        <select className="field" value={sheetIx} onChange={(e) => pickSheet(file.sheets, Number(e.target.value))} aria-label="Sheet">
          {file.sheets.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
        </select>
      )}
      <label className="btn ghost">
        <input type="file" accept=".xlsx" className="sr-only" onChange={(e) => void open(e.target.files?.[0])} />
        Change
      </label>
    </div>
  );
  const createBtn = (
    <button className="btn primary" disabled={!itemCount} onClick={create}>
      Create quote{t && itemCount ? ` · ${fmt(t.grand)}` : ''}
    </button>
  );
  const notes = result?.rows.filter((r) => r.status === 'filled' || r.status === 'skipped') ?? [];

  if (wide) {
    const byRow = new Map(result?.rows.map((r) => [r.row, r]));
    const width = Math.max(cols.roles.length, 1);
    const shown = sheet.rows.slice(0, 300);
    return (
      <section className="import import-wide">
        <PageHead title="New quote from a sheet">{createBtn}</PageHead>
        {fileChip}
        <div className="import-split">
          <div className="import-sheet">
            <table>
              <thead>
                <tr>
                  <th className="rn" />
                  {Array.from({ length: width }, (_, c) => (
                    <th key={c}>
                      <select className={'role-pick' + (cols.roles[c] && cols.roles[c] !== 'ignore' ? ' on' : '')} value={cols.roles[c] ?? 'ignore'} onChange={(e) => setRole(c, e.target.value as Role)} aria-label={`Column ${c + 1} is`}>
                        {ROLES.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row, r) => {
                  const res = byRow.get(r + 1);
                  const cls = r === cols.headerRow ? 'is-head' : res ? 'is-' + res.status : r < cols.headerRow ? 'is-detail' : '';
                  return (
                    <tr key={r} className={cls} title={res?.note}>
                      <td className="rn">{r + 1}</td>
                      {Array.from({ length: width }, (_, c) => <td key={c}>{cellText(row[c] ?? null)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <aside className="import-result">
            <ResultSummary rooms={result?.quote.sections ?? []} customer={result?.quote.customer.name ?? ''} extras={file.extras} />
            <RowNotes notes={notes} />
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="import">
      <PageHead title="Import from Excel" />
      {fileChip}
      <dl className="dash-stats import-stats">
        <div className="stat-card"><dt className="stat-label">Rooms</dt><dd className="stat-num">{result?.quote.sections.length ?? 0}</dd></div>
        <div className="stat-card"><dt className="stat-label">Items</dt><dd className="stat-num">{itemCount}</dd></div>
        <div className="stat-card"><dt className="stat-label">Grand total</dt><dd className="stat-num">{fmt(t?.grand ?? 0)}</dd></div>
      </dl>
      <ResultSummary rooms={result?.quote.sections ?? []} customer={result?.quote.customer.name ?? ''} extras={file.extras} />
      <RowNotes notes={notes} />
      <details className="import-cols">
        <summary>Columns</summary>
        {cols.roles.map((role, c) => (
          <label key={c} className="import-col">
            <span>{cellText(sheet.rows[cols.headerRow]?.[c] ?? null) || `Column ${c + 1}`}</span>
            <select className="field" value={role} onChange={(e) => setRole(c, e.target.value as Role)}>
              {ROLES.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
            </select>
          </label>
        ))}
      </details>
      <div className="import-go">{createBtn}</div>
    </section>
  );
}

function ResultSummary({ rooms, customer, extras }: { rooms: Section[]; customer: string; extras: Extras }) {
  if (!rooms.length) return <div className="cat-empty">No items found yet — check which column is the Item.</div>;
  return (
    <div className="import-rooms">
      {customer && <div className="import-for">For {customer}</div>}
      {rooms.map((s) => (
        <div key={s.id} className="import-room">
          <span className="import-room-name">{s.name} <small>· {s.items.length}</small><b>{fmt(sectionTotal(s))}</b></span>
          <span className="import-room-items">{s.items.map((i) => i.name).join(' · ')}</span>
        </div>
      ))}
      <div className="import-room">
        <span className="import-room-name">Terms <small>· {extras.terms ? `${extras.terms.length} from the sheet` : 'your defaults'}</small></span>
        <span className="import-room-name">Specification <small>· {extras.spec ? `${extras.spec.length} rows from the sheet` : 'your defaults'}</small></span>
      </div>
    </div>
  );
}

function RowNotes({ notes }: { notes: RowResult[] }) {
  if (!notes.length) return null;
  return (
    <div className="import-notes">
      {notes.map((n) => (
        <div key={n.row} className={'import-note ' + n.status}>
          <span className="import-note-row">R{n.row}</span>
          <span>{n.item?.name ?? n.name ?? '—'} — {n.status === 'skipped' ? `skipped: ${n.note?.toLowerCase()}` : n.note?.toLowerCase()}</span>
        </div>
      ))}
    </div>
  );
}
