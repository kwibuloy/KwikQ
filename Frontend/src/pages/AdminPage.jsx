import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import { Button, Field, Notice, Panel, StatCard, StatusPill, TicketStub, Skeleton } from '../ui';
import { IconBell, IconCheck, IconClock, IconDoctor, IconLogs, IconMail, IconPlus, IconQueue, IconRefresh, IconUsers } from '../ui/icons';
import { doctorName } from '../ui/status';
import { useAuth } from '../hooks/useAuth';
import {
  callNextPatient,
  clearAccessToken,
  closeQueueForDoctor,
  completeSession,
  createDoctor,
  inviteAdmin,
  removeDoctor,
  revokeInvitation,
  setDoctorAvailability,
  skipPatient,
  startSession,
} from '../services/api';
import { useDoctorQueue, useDoctors, useInvitations } from './admin/useAdminData';
import QueueTable from './admin/QueueTable';
import DoctorList, { AddDoctorModal } from './admin/DoctorList';
import PatientLogs from './admin/PatientLogs';
import Invitations, { InviteForm } from './admin/Invitations';
import s from './admin/admin.module.css';

const VIEWS = {
  queue: { title: 'Live queue', subtitle: 'Call, start and complete visits as they happen.' },
  doctors: { title: 'Doctors', subtitle: 'Who is in today, and how busy each queue is.' },
  logs: { title: 'Patient logs', subtitle: 'Everyone who has been seen, per doctor.' },
  invitations: { title: 'Invitations', subtitle: 'Give colleagues admin access with a one-time code.' },
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { name } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = VIEWS[params.get('view')] ? params.get('view') : 'queue';
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [calledTicket, setCalledTicket] = useState(null);
  const [busy, setBusy] = useState('');
  const [addingDoctor, setAddingDoctor] = useState(false);

  const { doctors, setDoctors, loading: doctorsLoading, error: doctorsError, reload: reloadDoctors } = useDoctors();
  const { queue, logs, loading: queueLoading, error: queueError, reload: reloadQueue } = useDoctorQueue(selectedId);
  const { invitations, loaded: invitesLoaded, reload: reloadInvites } = useInvitations();

  // Default to the first doctor once the roster loads.
  useEffect(() => {
    if (!selectedId && doctors.length) setSelectedId(String(doctors[0].doctor_id));
  }, [doctors, selectedId]);

  const selected = doctors.find((d) => String(d.doctor_id) === String(selectedId));
  const counts = useMemo(() => ({
    waiting: queue.filter((q) => q.status === 'waiting').length,
    active: queue.filter((q) => q.status === 'called' || q.status === 'in-consultation').length,
    servedToday: logs.filter((l) => l.created_at && new Date(l.created_at).toDateString() === new Date().toDateString()).length,
    available: doctors.filter((d) => d.is_available).length,
  }), [queue, logs, doctors]);

  const setView = (key) => {
    setSearch('');
    setParams(key === 'queue' ? {} : { view: key });
  };

  const act = async (key, fn, success) => {
    setBusy(key);
    setNotice(null);
    try {
      const result = await fn();
      if (success) setNotice({ kind: 'success', text: typeof success === 'function' ? success(result) : success });
      return result;
    } catch (err) {
      setNotice({ kind: 'error', text: err.message });
      return undefined;
    } finally {
      setBusy('');
    }
  };

  const handleCallNext = () => act('call', async () => {
    const res = await callNextPatient(selectedId);
    setCalledTicket(res?.data?.ticket_number ?? null);
    await reloadQueue({ silent: true });
  });

  const handleSkip = () => act('skip', async () => {
    await skipPatient(selectedId);
    setCalledTicket(null);
    await reloadQueue({ silent: true });
  }, 'Called patient skipped.');

  const handleCloseQueue = () => {
    if (!window.confirm(`Remove everyone still waiting for Dr. ${doctorName(selected)}? They will need to rejoin.`)) return;
    act('close', async () => {
      const res = await closeQueueForDoctor(selectedId);
      await reloadQueue({ silent: true });
      return res;
    }, (res) => `Queue closed. ${res?.removedCount ?? 0} waiting patient(s) removed.`);
  };

  const handleToggle = (doc) => act('', async () => {
    const next = !doc.is_available;
    await setDoctorAvailability(doc.doctor_id, next);
    setDoctors((prev) => prev.map((d) => (d.doctor_id === doc.doctor_id ? { ...d, is_available: next } : d)));
  }, `Dr. ${doctorName(doc)} is now ${doc.is_available ? 'away' : 'available'}.`);

  const handleRemove = async (doc) => {
    if (!window.confirm(`Remove Dr. ${doctorName(doc)}? This cannot be undone.`)) return;
    await act('', async () => {
      await removeDoctor(doc.doctor_id);
      if (String(doc.doctor_id) === String(selectedId)) setSelectedId('');
      await reloadDoctors();
    }, `Dr. ${doctorName(doc)} removed.`);
  };

  const handleCreateDoctor = async (form) => {
    const res = await createDoctor(form);
    await reloadDoctors();
    if (res?.doctor?.doctor_id) setSelectedId(String(res.doctor.doctor_id));
    setNotice({ kind: 'success', text: `Dr. ${doctorName(res?.doctor)} added.` });
  };

  const handleSignOut = () => {
    clearAccessToken();
    navigate('/login', { replace: true });
  };

  const doctorPicker = (
    <Field
      as="select"
      label="Doctor"
      className={s.picker}
      value={selectedId}
      onChange={(e) => { setSelectedId(e.target.value); setCalledTicket(null); }}
      disabled={!doctors.length}
    >
      {!doctors.length && <option value="">No doctors yet</option>}
      {doctors.map((d) => (
        <option key={d.doctor_id} value={d.doctor_id}>
          Dr. {doctorName(d)} · {d.specialization || 'General'}
        </option>
      ))}
    </Field>
  );

  const nav = [
    { key: 'queue', label: 'Live queue', icon: <IconQueue />, count: counts.waiting || null },
    { key: 'doctors', label: 'Doctors', icon: <IconDoctor />, count: doctors.length || null },
    { key: 'logs', label: 'Patient logs', icon: <IconLogs /> },
    { key: 'invitations', label: 'Invitations', icon: <IconMail />, count: invitations.length || null },
  ];

  const searchPlaceholder = {
    queue: 'Search patient or ticket',
    doctors: 'Search doctors',
    logs: 'Search patient or ticket',
    invitations: 'Search email',
  }[view];

  return (
    <DashboardLayout
      nav={nav}
      active={view}
      onNavigate={setView}
      title={VIEWS[view].title}
      subtitle={VIEWS[view].subtitle}
      search={{ value: search, onChange: setSearch, placeholder: searchPlaceholder, label: searchPlaceholder }}
      user={{ name, role: 'Admin' }}
      onSignOut={handleSignOut}
    >
      <div className={s.stack}>
        {notice && <Notice kind={notice.kind} onDismiss={() => setNotice(null)}>{notice.text}</Notice>}
        {doctorsError && <Notice kind="error">{doctorsError}</Notice>}

        {view === 'queue' && (
          <>
            <div className={s.stats}>
              <StatCard icon={<IconUsers />} label="Waiting now" value={counts.waiting} hint={selected ? `for Dr. ${doctorName(selected)}` : 'pick a doctor'} />
              <StatCard icon={<IconClock />} label="With doctor" value={counts.active} hint="called or in session" />
              <StatCard icon={<IconCheck />} label="Served today" value={counts.servedToday} hint="this doctor" />
              <StatCard icon={<IconDoctor />} label="Doctors in" value={`${counts.available}/${doctors.length}`} hint="accepting patients" />
            </div>

            <Panel
              title={selected ? `Dr. ${doctorName(selected)}` : 'Queue'}
              subtitle={selected ? `${selected.specialization || 'General'} · Room ${selected.room_number || '—'}` : 'Choose a doctor to manage their queue.'}
              actions={selected && <StatusPill status={selected.is_available ? 'available' : 'unavailable'} />}
            >
              <div className={s.toolbar}>
                {doctorPicker}
                <div className={s.toolbarActions}>
                  <Button variant="ghost" onClick={() => reloadQueue()} disabled={!selectedId} aria-label="Refresh queue">
                    <IconRefresh width={18} height={18} /> <span className={s.hideSm}>Refresh</span>
                  </Button>
                  <Button variant="secondary" onClick={handleSkip} loading={busy === 'skip'} disabled={!selectedId}>Skip called</Button>
                  <Button variant="danger" onClick={handleCloseQueue} loading={busy === 'close'} disabled={!selectedId || !counts.waiting}>Close queue</Button>
                  <Button onClick={handleCallNext} loading={busy === 'call'} disabled={!selectedId || !counts.waiting}>
                    <IconBell width={18} height={18} /> Call next
                  </Button>
                </div>
              </div>

              {calledTicket != null && (
                <div className={s.calling} role="status">
                  <TicketStub number={calledTicket} solid />
                  <div>
                    <div className={s.callingLabel}>Now calling</div>
                    <div className={s.callingText}>Ticket {calledTicket} has been notified.</div>
                  </div>
                </div>
              )}

              {queueError && <Notice kind="error">{queueError}</Notice>}
              {doctorsLoading || queueLoading ? (
                <Skeleton height={180} />
              ) : selectedId ? (
                <QueueTable
                  queue={queue}
                  filter={search}
                  onStart={(id) => act('', async () => { await startSession(id); await reloadQueue({ silent: true }); })}
                  onComplete={(id) => act('', async () => { await completeSession(id); await reloadQueue({ silent: true }); })}
                />
              ) : null}
            </Panel>
          </>
        )}

        {view === 'doctors' && (
          <Panel
            title="Roster"
            subtitle={`${doctors.length} doctor${doctors.length === 1 ? '' : 's'} · ${counts.available} available`}
            actions={<Button onClick={() => setAddingDoctor(true)}><IconPlus width={18} height={18} /> Add doctor</Button>}
          >
            {doctorsLoading ? <Skeleton height={200} /> : (
              <DoctorList
                doctors={doctors}
                selectedId={selectedId}
                filter={search}
                onSelect={(id) => { setSelectedId(id); setView('queue'); }}
                onToggleAvailability={handleToggle}
                onRemove={handleRemove}
              />
            )}
          </Panel>
        )}

        {view === 'logs' && (
          <Panel title="Served patients" subtitle={selected ? `Dr. ${doctorName(selected)}` : undefined} actions={doctorPicker}>
            {queueLoading ? <Skeleton height={200} /> : <PatientLogs logs={logs} filter={search} />}
          </Panel>
        )}

        {view === 'invitations' && (
          <>
            <Panel title="Invite an admin">
              <InviteForm onInvite={async (email) => { await inviteAdmin(email); await reloadInvites(); }} />
            </Panel>
            <Panel title="Pending" subtitle="Codes are single-use and disappear once claimed.">
              <Invitations
                invitations={invitations}
                loaded={invitesLoaded}
                filter={search}
                onRevoke={(email) => act('', async () => { await revokeInvitation(email); await reloadInvites(); }, `Invitation for ${email} revoked.`)}
              />
            </Panel>
          </>
        )}
      </div>

      {addingDoctor && <AddDoctorModal onClose={() => setAddingDoctor(false)} onCreate={handleCreateDoctor} />}
    </DashboardLayout>
  );
}
