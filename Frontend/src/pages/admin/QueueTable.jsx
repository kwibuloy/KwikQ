import { useState } from 'react';
import { Button, EmptyState, StatusPill, TicketStub } from '../../ui';
import { IconQueue } from '../../ui/icons';
import { MINUTES_PER_PATIENT } from '../../ui/status';
import { t } from '../../ui/table';

/** Today's active queue for one doctor, with per-row session actions. */
export default function QueueTable({ queue, onStart, onComplete, filter = '' }) {
  const [busyId, setBusyId] = useState(null);

  const run = async (id, fn) => {
    setBusyId(id);
    try { await fn(id); } finally { setBusyId(null); }
  };

  const term = filter.trim().toLowerCase();
  let waitingIndex = 0;
  const rows = queue.map((p) => {
    const position = p.status === 'waiting' ? ++waitingIndex : null;
    return { ...p, position };
  }).filter((p) => !term || String(p.patient_name || '').toLowerCase().includes(term) || String(p.ticket_number).includes(term));

  if (queue.length === 0) {
    return (
      <EmptyState icon={<IconQueue />} title="Nobody in line">
        New patients appear here the moment they join.
      </EmptyState>
    );
  }
  if (rows.length === 0) {
    return <EmptyState title="No matches">No patient in this queue matches “{filter}”.</EmptyState>;
  }

  return (
    <div className={t.wrap}>
      <table className={`${t.table} ${t.stack}`}>
        <caption className="visually-hidden">Patients in today’s queue</caption>
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">Patient</th>
            <th scope="col">Arrived</th>
            <th scope="col">Est. wait</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const id = p.queue_id;
            const wait = p.status === 'waiting'
              ? `${p.position * MINUTES_PER_PATIENT} min`
              : p.status === 'called' ? 'Now' : '—';
            return (
              <tr key={id}>
                <td className={t.lead}><TicketStub number={p.ticket_number} solid={p.status === 'called'} /></td>
                <td className={t.full}>
                  <div className={t.main}>{p.patient_name}</div>
                  {p.position === 1 && <div className={t.sub}>Next up</div>}
                </td>
                <td className={`${t.full} tabular`} data-label="Arrived">{p.arrival_time}</td>
                <td className={`${t.full} tabular`} data-label="Est. wait">{wait}</td>
                <td className={t.full}><StatusPill status={p.status} /></td>
                <td className={t.full}>
                  {p.status === 'called' && (
                    <Button size="sm" loading={busyId === id} onClick={() => run(id, onStart)}>
                      Start session
                    </Button>
                  )}
                  {p.status === 'in-consultation' && (
                    <Button size="sm" variant="soft" loading={busyId === id} onClick={() => run(id, onComplete)}>
                      Mark served
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
