import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelQueue, getPatientStatus } from '../../services/api';
import { Button, ConfirmDialog, ErrorState, Notice, StatusPill, TicketStub } from '../../ui';
import { IconBell, IconTicket } from '../../ui/icons';
import { MINUTES_PER_PATIENT } from '../../ui/status';
import s from './patient.module.css';

const POLL_MS = 7000;
const fingerprint = (r) => (r ? `${r.queue_id}|${r.status}|${r.position_in_queue}` : '');

/** Grab attention when the patient is called, even from a background tab. */
function useCalledAlert(called, ticketNumber) {
  useEffect(() => {
    if (!called) return undefined;
    const previous = document.title;
    document.title = `🔔 Your turn (#${ticketNumber}) · KwikQ`;
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* unsupported */ }
    return () => { document.title = previous; };
  }, [called, ticketNumber]);
}

/**
 * The patient's live ticket. Polls every 7s while mounted.
 * States: loading → (error | none | waiting | called | in-consultation), plus
 * "reconnecting" when a refresh fails after a good load, and "ended" when the
 * clinic closes the ticket (served, skipped, queue closed) without the patient acting.
 */
export default function MyTicket({ refreshKey = 0, onTicket = undefined, onEnded = undefined }) {
  const [ticket, setTicket] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [stale, setStale] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const last = useRef({ fp: '', ticket: null, selfCancelled: false });
  // Parent callbacks in a ref so polling doesn't restart when the parent re-renders.
  const cb = useRef({ onTicket, onEnded });
  useEffect(() => { cb.current = { onTicket, onEnded }; });

  const check = useCallback(async () => {
    try {
      const res = await getPatientStatus();
      const next = res && Object.keys(res).length ? res : null;
      const fp = fingerprint(next);
      const prev = last.current;
      if (fp !== prev.fp) {
        // Ticket disappeared without the patient cancelling: the clinic ended it.
        if (prev.ticket && !next && !prev.selfCancelled) {
          setNote({
            kind: 'info',
            text: prev.ticket.status === 'in-consultation'
              ? `Visit complete for ticket #${prev.ticket.ticket_number}. Take care!`
              : `Ticket #${prev.ticket.ticket_number} is no longer active. The clinic may have skipped it or closed the queue.`,
            history: prev.ticket.status !== 'in-consultation',
          });
          cb.current.onEnded?.();
        }
        last.current = { fp, ticket: next, selfCancelled: false };
        setTicket(next);
        cb.current.onTicket?.(next);
      }
      setStatus('ready');
      setStale(false);
      setError('');
    } catch (err) {
      setError(err.message);
      setStatus((st) => (st === 'ready' ? 'ready' : 'error'));
      setStale(true);
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_MS);
    const onFocus = () => check();
    window.addEventListener('online', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [check, refreshKey]);

  const called = ticket?.status === 'called';
  useCalledAlert(called, ticket?.ticket_number);

  const leave = async () => {
    try {
      const res = await cancelQueue();
      last.current = { fp: '', ticket: null, selfCancelled: true };
      setTicket(null);
      cb.current.onTicket?.(null);
      setNote({ kind: 'success', text: res?.message === 'Queue cancelled successfully' ? 'You left the queue.' : res?.message || 'You left the queue.' });
      cb.current.onEnded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className={`${s.ticketCard} ${s.ticketLoading}`} aria-busy="true" aria-label="Loading your ticket">
        <span className={s.skelStub} />
        <span className={s.skelLines}><span /><span /></span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`${s.ticketCard} ${s.ticketError}`}>
        <ErrorState title="We couldn’t check your ticket" onRetry={check}>{error}</ErrorState>
      </div>
    );
  }

  const noteEl = note && (
    <Notice kind={note.kind} onDismiss={() => setNote(null)} autoHide={note.kind === 'success' ? 6000 : 0}>
      {note.text} {note.history && <Link to="/patient?view=history">See history</Link>}
    </Notice>
  );

  if (!ticket) {
    return (
      <div className={`${s.ticketCard} ${s.ticketEmpty}`}>
        <span className={s.ticketEmptyIcon}><IconTicket width={28} height={28} /></span>
        <div>
          <h2 className={s.ticketHeading}>You’re not in a queue</h2>
          <p className={s.ticketText}>Pick a doctor below to get a ticket. You can wait anywhere; we’ll show you when it’s your turn.</p>
        </div>
        {noteEl}
        {stale && <Notice kind="error">{error}</Notice>}
      </div>
    );
  }

  const inSession = ticket.status === 'in-consultation';
  const position = Number(ticket.position_in_queue);
  const ahead = Number.isFinite(position) ? Math.max(0, position - 1) : null;
  const wait = called || inSession ? 'Now' : ahead === 0 ? 'You’re next' : ahead != null ? `~${ahead * MINUTES_PER_PATIENT} min` : '—';
  const pillLabel = called ? 'It’s your turn' : inSession ? 'With the doctor' : undefined;

  return (
    <div className={`${s.ticketCard} ${called ? s.ticketCalled : ''}`}>
      <div className={s.ticketMain}>
        <TicketStub number={ticket.ticket_number} size="lg" solid={called || inSession} label="Your ticket" />
        <div className={s.ticketInfo}>
          <StatusPill status={ticket.status} label={pillLabel} />
          <dl className={s.ticketStats}>
            <div><dt>{ahead === 0 || called || inSession ? 'Position' : 'Ahead of you'}</dt><dd className="tabular">{called || inSession ? '—' : ahead === 0 ? '1st' : ahead ?? '—'}</dd></div>
            <div><dt>Est. wait</dt><dd className="tabular">{wait}</dd></div>
            <div><dt>Room</dt><dd>{ticket.room_number || '—'}</dd></div>
          </dl>
        </div>
      </div>

      <aside className={s.ticketStub}>
        {stale ? (
          <span className={`${s.live} ${s.liveStale}`}><span className={s.liveDot} aria-hidden="true" /> Reconnecting</span>
        ) : (
          <span className={s.live}><span className={s.liveDot} aria-hidden="true" /> Live</span>
        )}
        <p className={s.stubText}>
          {stale ? 'Showing your last known status.' : called ? 'Show this number at the door.' : inSession ? 'Your visit is in progress.' : 'Wait anywhere. This card updates on its own.'}
        </p>
        {ticket.status === 'waiting' && (
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>Leave queue</Button>
        )}
      </aside>

      {called && (
        <div className={s.calledAlert} role="alert">
          <IconBell /> Please head to {ticket.room_number ? `room ${ticket.room_number}` : 'the doctor’s room'} now.
        </div>
      )}
      {noteEl && <div className={s.ticketWide}>{noteEl}</div>}

      {confirming && (
        <ConfirmDialog
          title="Leave the queue?"
          confirmLabel="Leave queue"
          cancelLabel="Keep my spot"
          danger
          onConfirm={leave}
          onCancel={() => setConfirming(false)}
        >
          You’ll lose ticket #{ticket.ticket_number}. If you rejoin later you’ll go to the back of the line.
        </ConfirmDialog>
      )}
    </div>
  );
}
