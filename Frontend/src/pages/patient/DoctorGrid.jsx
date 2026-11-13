import { memo } from 'react';
import { EmptyState, StatusPill } from '../../ui';
import { IconArrowRight, IconDoctor } from '../../ui/icons';
import { doctorName, initials } from '../../ui/status';
import s from './patient.module.css';

function DoctorCardBase({ doctor, onPick, blocked = false }) {
  const name = doctorName(doctor);
  const available = !!doctor.is_available;
  const canJoin = available && !blocked;
  const waiting = doctor.current_queue_length ?? 0;
  return (
    <li>
      <button
        type="button"
        className={s.doctor}
        onClick={() => onPick(doctor)}
        disabled={!canJoin}
        aria-label={`Dr. ${name}, ${doctor.specialization || 'General'}. ${waiting} waiting. ${!available ? 'Not accepting patients' : blocked ? 'You already hold a ticket' : 'Join queue'}`}
      >
        <span className={s.doctorTop}>
          <span className={s.doctorAvatar} aria-hidden="true">{initials(name)}</span>
          <StatusPill status={available ? 'available' : 'unavailable'} />
        </span>
        <span className={s.doctorName}>Dr. {name}</span>
        <span className={s.doctorSpec}>{doctor.specialization || 'General practice'}</span>
        <span className={s.doctorMeta}>
          <span><b className="tabular">{waiting}</b> waiting</span>
          <span><b className="tabular">~{doctor.estimated_wait_minutes ?? 0}</b> min</span>
          {doctor.room_number && <span>Room <b>{doctor.room_number}</b></span>}
        </span>
        {canJoin && <span className={s.doctorCta}>Join queue <IconArrowRight width={16} height={16} /></span>}
        {!available && <span className={s.doctorOff}>Not taking patients right now</span>}
      </button>
    </li>
  );
}

const DoctorCard = memo(DoctorCardBase);

export default function DoctorGrid({ doctors, filter, onPick, blocked = false }) {
  const term = filter.trim().toLowerCase();
  const rows = doctors.filter((d) =>
    !term || [doctorName(d), d.specialization, d.room_number].some((v) => String(v || '').toLowerCase().includes(term)),
  );
  // Available doctors first, shortest queue first.
  rows.sort((a, b) => Number(b.is_available) - Number(a.is_available) || (a.current_queue_length ?? 0) - (b.current_queue_length ?? 0));

  if (!doctors.length) return <EmptyState icon={<IconDoctor />} title="No doctors listed yet">Check back soon.</EmptyState>;
  if (!rows.length) return <EmptyState title="No matches">No doctor matches “{filter}”.</EmptyState>;

  return (
    <ul className={s.doctorGrid}>
      {rows.map((d) => <DoctorCard key={d.doctor_id} doctor={d} onPick={onPick} blocked={blocked} />)}
    </ul>
  );
}
