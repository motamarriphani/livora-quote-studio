// Small shared UI primitives: modal sheet, confirm dialog, toasts.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './components/Icon';

export function Modal({ title, sub, onClose, small, children }: {
  title: string; sub?: ReactNode; onClose: () => void; small?: boolean; children: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = sheet.current?.querySelector<HTMLElement>('input, textarea, select, button:not(.modal-x)');
    (first ?? sheet.current)?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-backdrop" onClick={onClose} />
      <div className={'modal-sheet' + (small ? ' small' : '')} ref={sheet} tabIndex={-1}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{title}</div>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="icon-btn modal-x" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Toasts ── */
type Toast = { message: string; type?: 'info' | 'success' | 'error'; action?: { label: string; run: () => void }; duration?: number };
const ToastCtx = createContext<(t: Toast) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/* ── Confirm ── */
type ConfirmOpts = { title: string; message: string; confirmLabel?: string; danger?: boolean };
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((t: Toast) => {
    window.clearTimeout(timer.current);
    setToast(t);
    timer.current = window.setTimeout(() => setToast(null), t.duration ?? (t.action ? 7000 : 3500));
  }, []);

  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })), []);
  const close = (v: boolean) => { dialog?.resolve(v); setDialog(null); };

  return (
    <ToastCtx.Provider value={show}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        {dialog && (
          <Modal title={dialog.title} onClose={() => close(false)} small>
            <div className="dialog-message">{dialog.message}</div>
            <div className="dialog-actions">
              <button className="btn ghost full" onClick={() => close(false)}>Cancel</button>
              <button className={'btn full ' + (dialog.danger ? 'danger-btn' : 'primary')} onClick={() => close(true)}>
                {dialog.confirmLabel ?? 'Continue'}
              </button>
            </div>
          </Modal>
        )}
        {toast && (
          <div className="toast-region" role="status" aria-live="polite">
            <div className={'toast toast-' + (toast.type ?? 'info')}>
              <span>{toast.message}</span>
              {toast.action && (
                <button className="toast-action" onClick={() => { setToast(null); toast.action!.run(); }}>{toast.action.label}</button>
              )}
            </div>
          </div>
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

/** Live CSS media-query match, for UI that is expensive to render where it isn't shown. */
export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/* ── Page header with the mobile menu button ── */
export const MenuCtx = createContext<() => void>(() => {});

export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  const openMenu = useContext(MenuCtx);
  return (
    <header className="view-head">
      <button className="icon-btn menu-btn" onClick={openMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <div className="head-title-wrap">
        <h1 className="head-title">{title}</h1>
        {sub && <div className="head-sub">{sub}</div>}
      </div>
      {children}
    </header>
  );
}

export function StatusChip({ status, expired }: { status: string; expired?: boolean }) {
  const s = expired ? 'expired' : status;
  return <span className={'status-chip status-' + s}>{s}</span>;
}
