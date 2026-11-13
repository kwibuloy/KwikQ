import { useState } from 'react';
import { joinQueue } from '../../services/api';
import { Button, Modal, Notice, TicketStub } from '../../ui';
import { doctorName } from '../../ui/status';
import s from './patient.module.css';

export default function JoinQueueModal({ doctor, onClose, onJoined }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);

  const join = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await joinQueue(doctor.doctor_id);
      setTicket(res?.data?.ticket_number ?? null);
      onJoined?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={ticket ? 'You’re in line' : `Join Dr. ${doctorName(doctor)}’s queue`} onClose={onClose}>
      {ticket ? (
        <div className={s.joined}>
          <TicketStub number={ticket} size="lg" solid label="Your ticket" />
          <p>Keep this page open or come back any time. Your ticket card updates on its own.</p>
          <Button block onClick={onClose}>Done</Button>
        </div>
      ) : (
        <>
          <p className={s.modalText}>{doctor.specialization || 'General practice'}{doctor.room_number ? ` · Room ${doctor.room_number}` : ''}</p>
          <dl className={s.modalStats}>
            <div><dt>Waiting now</dt><dd className="tabular">{doctor.current_queue_length ?? 0}</dd></div>
            <div><dt>Estimated wait</dt><dd className="tabular">~{doctor.estimated_wait_minutes ?? 0} min</dd></div>
          </dl>
          <p className={s.modalText}>Your ticket is linked to your account. You can only hold one ticket at a time.</p>
          {error && <Notice kind="error">{error}</Notice>}
          <div className={s.modalActions}>
            <Button variant="secondary" onClick={onClose}>Not now</Button>
            <Button onClick={join} loading={busy}>Get my ticket</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
