import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { ClientId } from '../lib/types';
import { Modal, useConfirm, useToast } from '../ui';

export type ClientRecord = { id: ClientId; name: string; phone: string; address: string };

/** Add or edit a client-book record. Editing offers a deliberate merge into another record. */
export function ClientForm({ client, onClose, onSaved }: {
  client: ClientRecord | null;
  onClose: () => void;
  onSaved?: (c: ClientRecord) => void;
}) {
  const saveClient = useMutation(api.clients.saveClient);
  const toast = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState(client?.name ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [address, setAddress] = useState(client?.address ?? '');
  const [mergeInto, setMergeInto] = useState('');
  const [busy, setBusy] = useState(false);
  const others = useQuery(api.clients.listClients, client ? {} : 'skip');
  const mergeTarget = others?.clients.find((c) => c.id === mergeInto);

  async function submit() {
    if (!name.trim()) { toast({ message: 'Enter the client name.', type: 'error' }); return; }
    if (mergeTarget && !(await confirm({
      title: 'Merge clients?',
      message: `All of ${client!.name}'s quotes move to ${mergeTarget.name}, and ${client!.name} is removed. ${mergeTarget.name} keeps its own name and details. This can't be undone.`,
      confirmLabel: 'Merge',
      danger: true,
    }))) return;
    setBusy(true);
    try {
      const res = await saveClient({
        ...(client ? { id: client.id } : {}),
        name: name.trim(), phone: phone.trim(), address: address.trim(),
        ...(mergeTarget ? { mergeIntoId: mergeTarget.id } : {}),
      });
      const saved = mergeTarget
        ? { id: mergeTarget.id, name: mergeTarget.name, phone: mergeTarget.phone, address: mergeTarget.address }
        : { id: res.id, name: name.trim(), phone: phone.trim(), address: address.trim() };
      toast({ message: mergeTarget ? 'Clients merged.' : 'Client saved.', type: 'success' });
      onSaved?.(saved);
      onClose();
    } catch (e) {
      console.error(e);
      toast({ message: 'Could not save the client.', type: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={client ? 'Edit client' : 'New client'} onClose={onClose} small>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <input className="field" placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        <input className="field" type="tel" inputMode="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="field" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        {client && (
          <div className="merge-row">
            <select className="field" value={mergeInto} onChange={(e) => setMergeInto(e.target.value)} aria-label="Merge into another client">
              <option value="">Same person as another client? Merge into…</option>
              {others?.clients.filter((c) => c.id !== client.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ' · ' + c.phone : ''}</option>
              ))}
            </select>
          </div>
        )}
        <div className="modal-hint">Quotes already made keep the details they were made with.</div>
        <button className="btn primary full" disabled={busy}>{busy ? 'Saving…' : mergeTarget ? 'Merge clients' : 'Save client'}</button>
      </form>
    </Modal>
  );
}
