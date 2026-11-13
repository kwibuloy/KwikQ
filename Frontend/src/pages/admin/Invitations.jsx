import { useState } from 'react';
import { Button, EmptyState, Field, Notice, StatusPill } from '../../ui';
import { IconMail } from '../../ui/icons';
import { t } from '../../ui/table';
import s from './admin.module.css';

const fmt = (v) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export function InviteForm({ onInvite }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await onInvite(email.trim());
      setMsg({ kind: 'success', text: `Invitation sent to ${email.trim()}.` });
      setEmail('');
    } catch (err) {
      setMsg({ kind: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={s.inviteForm} onSubmit={submit}>
      <Field
        className={s.grow}
        label="Colleague’s email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@clinic.org"
        required
        autoComplete="off"
        hint="They’ll get a one-time code to create an admin account with this address."
      />
      <Button type="submit" loading={busy} className={s.inviteBtn}>Send invite</Button>
      {msg && <div className={s.full}><Notice kind={msg.kind} onDismiss={() => setMsg(null)}>{msg.text}</Notice></div>}
    </form>
  );
}

export default function Invitations({ invitations, loaded, onRevoke, filter = '' }) {
  const [busy, setBusy] = useState('');
  const term = filter.trim().toLowerCase();
  const rows = invitations.filter((i) => !term || i.email.toLowerCase().includes(term));

  if (!loaded) return null;
  if (invitations.length === 0) {
    return <EmptyState icon={<IconMail />} title="No pending invitations">Invite a colleague above to give them admin access.</EmptyState>;
  }
  if (rows.length === 0) return <EmptyState title="No matches">No invitation matches “{filter}”.</EmptyState>;

  const revoke = async (email) => {
    setBusy(email);
    try { await onRevoke(email); } finally { setBusy(''); }
  };

  return (
    <div className={t.wrap}>
      <table className={`${t.table} ${t.stack}`}>
        <caption className="visually-hidden">Pending admin invitations</caption>
        <thead>
          <tr>
            <th scope="col">Email</th>
            <th scope="col">Sent</th>
            <th scope="col">Expires</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.invitation_id}>
              <td className={t.lead}><span className={`${t.main} ${s.email}`}>{i.email}</span></td>
              <td className={`${t.full} tabular`} data-label="Sent">{fmt(i.created_at)}</td>
              <td className={`${t.full} tabular`} data-label="Expires">{i.expires_at ? fmt(i.expires_at) : 'Never'}</td>
              <td className={t.full}><StatusPill status="pending" /></td>
              <td className={t.full}>
                <Button size="sm" variant="danger" loading={busy === i.email} onClick={() => revoke(i.email)}>
                  Revoke
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
