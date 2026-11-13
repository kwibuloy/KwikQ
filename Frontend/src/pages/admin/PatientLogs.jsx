import { EmptyState, StatusPill, TicketStub } from '../../ui';
import { IconLogs } from '../../ui/icons';
import { t } from '../../ui/table';

const formatDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

/** Served-patient history for one doctor. */
export default function PatientLogs({ logs, filter = '' }) {
  const term = filter.trim().toLowerCase();
  const rows = logs.filter((l) => !term || String(l.patient_name || '').toLowerCase().includes(term) || String(l.ticket_number).includes(term));

  if (logs.length === 0) {
    return <EmptyState icon={<IconLogs />} title="No visits yet">Patients marked as served will be listed here.</EmptyState>;
  }
  if (rows.length === 0) {
    return <EmptyState title="No matches">No visit matches “{filter}”.</EmptyState>;
  }

  return (
    <div className={t.wrap}>
      <table className={`${t.table} ${t.stack}`}>
        <caption className="visually-hidden">Served patients</caption>
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">Patient</th>
            <th scope="col">Date</th>
            <th scope="col">Checked in</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.queue_id}>
              <td className={t.lead}><TicketStub number={l.ticket_number} /></td>
              <td className={t.full}><span className={t.main}>{l.patient_name}</span></td>
              <td className={`${t.full} tabular`} data-label="Date">{formatDate(l.created_at)}</td>
              <td className={`${t.full} tabular`} data-label="Checked in">{l.served_time}</td>
              <td className={t.full}><StatusPill status={l.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
