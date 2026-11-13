import { useState } from 'react';
import { Button, Checkbox, EmptyState, Field, Modal, Notice, StatusPill } from '../../ui';
import { IconDoctor, IconTrash } from '../../ui/icons';
import { doctorName, initials } from '../../ui/status';
import { t } from '../../ui/table';
import s from './admin.module.css';

const EMPTY_FORM = { doctorFirstName: '', doctorLastName: '', specialization: '', roomNumber: '', isAvailable: true };

export function AddDoctorModal({ onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onCreate(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Add a doctor" onClose={onClose}>
      <p className={s.muted}>They’ll show up for patients right away if marked available.</p>
      <form className={s.formGrid} onSubmit={submit}>
        <Field label="First name" value={form.doctorFirstName} onChange={set('doctorFirstName')} required autoComplete="off" />
        <Field label="Last name" value={form.doctorLastName} onChange={set('doctorLastName')} required autoComplete="off" />
        <Field label="Specialization" value={form.specialization} onChange={set('specialization')} required placeholder="e.g. Pediatrics" />
        <Field label="Room" value={form.roomNumber} onChange={set('roomNumber')} required placeholder="e.g. 204" />
        <div className={s.span2}>
          <Checkbox label="Accepting patients now" checked={form.isAvailable} onChange={set('isAvailable')} />
        </div>
        {error && <div className={s.span2}><Notice kind="error">{error}</Notice></div>}
        <div className={`${s.span2} ${s.formActions}`}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Add doctor</Button>
        </div>
      </form>
    </Modal>
  );
}

/** Roster of doctors with availability + queue info. */
export default function DoctorList({ doctors, selectedId, onSelect, onToggleAvailability, onRemove, filter = '' }) {
  const [busyId, setBusyId] = useState(null);
  const term = filter.trim().toLowerCase();
  const rows = doctors.filter((d) =>
    !term || [doctorName(d), d.specialization, d.room_number].some((v) => String(v || '').toLowerCase().includes(term)),
  );

  const run = async (id, fn) => {
    setBusyId(id);
    try { await fn(); } finally { setBusyId(null); }
  };

  if (doctors.length === 0) {
    return <EmptyState icon={<IconDoctor />} title="No doctors yet">Add your first doctor to open a queue.</EmptyState>;
  }
  if (rows.length === 0) {
    return <EmptyState title="No matches">No doctor matches “{filter}”.</EmptyState>;
  }

  return (
    <div className={t.wrap}>
      <table className={`${t.table} ${t.stack}`}>
        <caption className="visually-hidden">Doctors</caption>
        <thead>
          <tr>
            <th scope="col">Doctor</th>
            <th scope="col">Specialization</th>
            <th scope="col">Room</th>
            <th scope="col">In queue</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const id = String(d.doctor_id);
            const name = doctorName(d);
            const selected = id === String(selectedId);
            return (
              <tr key={id} className={selected ? s.rowSelected : undefined}>
                <td className={t.lead}>
                  <span className={s.docCell}>
                    <span className={s.docAvatar} aria-hidden="true">{initials(name)}</span>
                    <span className={t.main}>Dr. {name}</span>
                  </span>
                </td>
                <td className={t.full} data-label="Specialization">{d.specialization || 'General'}</td>
                <td className={`${t.full} tabular`} data-label="Room">{d.room_number || '—'}</td>
                <td className={`${t.full} tabular`} data-label="In queue">{d.current_queue_length ?? 0}</td>
                <td className={t.full}><StatusPill status={d.is_available ? 'available' : 'unavailable'} /></td>
                <td className={t.full}>
                  <div className={s.rowActions}>
                    <Button size="sm" variant={selected ? 'soft' : 'secondary'} onClick={() => onSelect(id)} aria-pressed={selected}>
                      {selected ? 'Viewing queue' : 'View queue'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busyId === `a${id}`}
                      onClick={() => run(`a${id}`, () => onToggleAvailability(d))}
                    >
                      {d.is_available ? 'Set away' : 'Set available'}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      aria-label={`Remove Dr. ${name}`}
                      loading={busyId === `r${id}`}
                      onClick={() => run(`r${id}`, () => onRemove(d))}
                    >
                      <IconTrash width={16} height={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
