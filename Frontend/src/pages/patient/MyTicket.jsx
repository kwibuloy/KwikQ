import { useCallback, useEffect, useRef, useState } from 'react';
import { cancelQueue, getPatientStatus } from '../../services/api';
import { Button, Notice, StatusPill, TicketStub } from '../../ui';
import { IconBell, IconTicket } from '../../ui/icons';
import { MINUTES_PER_PATIENT } from '../../ui/status';
import s from './patient.module.css';

const fingerprint = (r) => (r ? `${r.queue_id}|${r.status}|${r.position_in_queue}` : '');

/** The patient's live ticket. Polls every 7s while mounted. */
export default function MyTicket({ refreshKey, onChange }) {
  const [ticket, setTicket] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const lastFp = useRef('');

  const check = useCallback(async () => {
    try {
      const res = await getPatientStatus();
      const next = res && Object.keys(res).length ? res : null;
      const fp = fingerprint(next);
      if (fp !== lastFp.current) {
        lastFp.current = fp;
        setTicket(next);
      }
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 7000);
    return () => clearInterval(id);
  }, [check, refreshKey]);

  const cancel = async () => {
    if (!window.confirm('Give up your spot in the queue?')) return;
    setCancelling(true);
    try {
      const res = await cancelQueue();
      setNote(res?.message || 'Your spot was released.');
      lastFp.current = '';
      setTicket(null);
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (!loaded) return <div className={s.ticketCard} aria-busy="true" />;

  if (!ticket) {
    return (
      <div className={`${s.ticketCard} ${s.ticketEmpty}`}>
        <span className={s.ticketEmptyIcon}><IconTicket width={28} height={28} /></span>
        <div>
          <h2 className={s.ticketHeading}>You’re not in a queue</h2>
          <p className={s.ticketText}>Pick a doctor below to get a ticket. You can wait anywhere — we’ll show you when it’s your turn.</p>
        </div>
        {note && <Notice kind="success" onDismiss={() => setNote('')}>{note}</Notice>}
        {error && <Notice kind="error">{error}</Notice>}
      </div>
    );
  }

  const called = ticket.status === 'called';
  const position = Number(ticket.position_in_queue);
  const ahead = Number.isFinite(position) ? Math.max(0, position - 1) : null;
  const wait = called ? 'Now' : ahead === 0 ? 'You’re next' : ahead != null ? `~${ahead * MINUTES_PER_PATIENT} min` : '—';

  return (
    <div className={`${s.ticketCard} ${called ? s.ticketCalled : ''}`}>
      <div className={s.ticketMain}>
        <TicketStub number={ticket.ticket_number} size="lg" solid={called} label="Your ticket" />
        <div className={s.ticketInfo}>
          <StatusPill status={ticket.status} label={called ? 'It’s your turn' : undefined} />
          <dl className={s.ticketStats}>
            <div><dt>Position</dt><dd className="tabular">{called ? '—' : position || '—'}</dd></div>
            <div><dt>Est. wait</dt><dd className="tabular">{wait}</dd></div>
            <div><dt>Room</dt><dd>{ticket.room_number || '—'}</dd></div>
          </dl>
        </div>
      </div>

      <aside className={s.ticketStub}>
        <span className={s.live}><span className={s.liveDot} aria-hidden="true" /> Live</span>
        <p className={s.stubText}>{called ? 'Show this number at the door.' : 'Wait anywhere. This card updates on its own.'}</p>
        {ticket.status === 'waiting' && (
          <Button variant="danger" size="sm" onClick={cancel} loading={cancelling}>Leave queue</Button>
        )}
      </aside>

      {called && (
        <div className={s.calledAlert} role="alert">
          <IconBell /> Please head to {ticket.room_number ? `room ${ticket.room_number}` : 'the doctor’s room'} now.
        </div>
      )}
      {error && <div className={s.ticketWide}><Notice kind="error">{error}</Notice></div>}
    </div>
  );
}
