import { StatusPill, TicketStub } from '../../ui';
import { formatDateTime } from '../../ui/format';
import { t } from '../../ui/table';

/** The patient's queue history (already filtered by the caller). */
export default function HistoryTable({ rows }) {
  return (
    <div className={t.wrap}>
      <table className={`${t.table} ${t.stack}`}>
        <caption className="visually-hidden">Your queue history</caption>
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">Doctor</th>
            <th scope="col">Room</th>
            <th scope="col">Date</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.queue_id}>
              <td className={t.lead}><TicketStub number={h.ticket_number} /></td>
              <td className={t.full}>
                <div className={t.main}>{h.doctor_name ? `Dr. ${h.doctor_name}` : 'Doctor'}</div>
                <div className={t.sub}>{h.doctor_specialization || 'General'}</div>
              </td>
              <td className={t.full} data-label="Room">{h.doctor_room || '—'}</td>
              <td className={`${t.full} tabular`} data-label="Date">{formatDateTime(h.created_at)}</td>
              <td className={t.full}><StatusPill status={h.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
